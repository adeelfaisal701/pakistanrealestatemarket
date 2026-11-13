import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import sharp = require('sharp');

export interface UploadedMaintenanceImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const MAX_MAINTENANCE_IMAGE_SIZE = 10 * 1024 * 1024;
const FILENAME_PATTERN = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

/**
 * Private storage for maintenance problem and work photos.
 *
 * Files are written to a dedicated `maintenance-private` sub-directory that
 * is NOT reachable through the public property-image route (that route only
 * accepts bare filenames in the property image directory). Images are only
 * served through authenticated, access-checked maintenance endpoints.
 *
 * Every image is re-encoded with sharp, which validates the content and strips
 * EXIF metadata (including GPS location) before it is stored.
 *
 * The existing property-image storage configuration is left untouched; the
 * optional MAINTENANCE_IMAGE_STORAGE_DIR overrides the default location.
 */
@Injectable()
export class MaintenanceImageStorageService {
  private readonly logger = new Logger(MaintenanceImageStorageService.name);
  private readonly storageDirectory: string;

  constructor(config: ConfigService) {
    const explicit = process.env.MAINTENANCE_IMAGE_STORAGE_DIR?.trim();
    const propertyDirectory = config.get<string>('propertyImages.storageDir');
    const base = explicit
      ? explicit
      : propertyDirectory
        ? join(propertyDirectory, 'maintenance-private')
        : join('uploads', 'maintenance-private');
    this.storageDirectory = isAbsolute(base) ? base : resolve(process.cwd(), base);
  }

  async save(file: UploadedMaintenanceImage) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size !== file.buffer.length) {
      throw new BadRequestException('The uploaded image could not be read.');
    }
    if (file.size < 1 || file.size > MAX_MAINTENANCE_IMAGE_SIZE) {
      throw new BadRequestException('Each image must be 10 MB or smaller.');
    }
    const contentType = this.detectContentType(file.buffer);
    if (!contentType || contentType !== file.mimetype) {
      throw new BadRequestException('Unsupported image. Upload a valid JPEG, PNG, or WebP image.');
    }
    const sanitized = await this.sanitize(file.buffer, contentType);
    const filename = `${randomUUID()}${MIME_EXTENSIONS[contentType]}`;
    const filePath = join(this.storageDirectory, filename);
    const temporaryPath = join(this.storageDirectory, `.${filename}.${randomUUID()}.tmp`);
    try {
      await mkdir(this.storageDirectory, { recursive: true });
      await writeFile(temporaryPath, sanitized, { flag: 'wx', mode: 0o640 });
      await rename(temporaryPath, filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      this.logger.error(
        'Could not save a maintenance image',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Image storage is unavailable.');
    }
    return { filename, contentType, size: sanitized.length };
  }

  async read(filename: string) {
    const filePath = this.resolveFilename(filename);
    try {
      return { buffer: await readFile(filePath), contentType: this.contentTypeFor(filename) };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundException('Image not found.');
      }
      throw new InternalServerErrorException('Image could not be read.');
    }
  }

  /** Best-effort removal used only to roll back a failed upload transaction. */
  async discard(filename: string): Promise<void> {
    try {
      await unlink(this.resolveFilename(filename));
    } catch {
      // ignore — rollback only
    }
  }

  private resolveFilename(filename: string): string {
    if (!FILENAME_PATTERN.test(filename)) throw new NotFoundException('Image not found.');
    return resolve(this.storageDirectory, filename);
  }

  private contentTypeFor(filename: string): string {
    const extension = filename.slice(filename.lastIndexOf('.'));
    const match = Object.entries(MIME_EXTENSIONS).find(([, ext]) => ext === extension);
    if (!match) throw new NotFoundException('Image not found.');
    return match[0];
  }

  private detectContentType(buffer: Buffer): string | undefined {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return 'image/png';
    }
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }
    return undefined;
  }

  private async sanitize(buffer: Buffer, contentType: string): Promise<Buffer> {
    try {
      const metadata = await sharp(buffer, { failOn: 'error' }).metadata();
      if (metadata.format !== contentType.slice('image/'.length)) {
        throw new BadRequestException('The uploaded image is invalid or unsupported.');
      }
      const image = sharp(buffer, { failOn: 'error' })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true });
      if (contentType === 'image/jpeg') return await image.jpeg({ quality: 85 }).toBuffer();
      if (contentType === 'image/png') return await image.png().toBuffer();
      return await image.webp({ quality: 85 }).toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('The uploaded image is invalid or unsupported.');
    }
  }
}

export const MAINTENANCE_IMAGE_UPLOAD_OPTIONS = {
  limits: { files: 6, fileSize: MAX_MAINTENANCE_IMAGE_SIZE },
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!Object.keys(MIME_EXTENSIONS).includes(file.mimetype)) {
      callback(new BadRequestException('Upload JPEG, PNG, or WebP images only.'), false);
      return;
    }
    callback(null, true);
  },
};
