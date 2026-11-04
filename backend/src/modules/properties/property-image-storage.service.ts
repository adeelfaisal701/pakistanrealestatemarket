import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import { extname, isAbsolute, join, resolve } from 'path';
import sharp = require('sharp');

export interface UploadedPropertyImage {
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

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class PropertyImageStorageService {
  private readonly logger = new Logger(PropertyImageStorageService.name);
  private readonly storageDirectory: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const configuredDirectory = config.get<string>('propertyImages.storageDir');
    const configuredPublicBaseUrl = config.get<string>('propertyImages.publicBaseUrl');
    if (
      process.env.NODE_ENV === 'production' &&
      (!configuredDirectory || !configuredPublicBaseUrl)
    ) {
      throw new Error(
        'PROPERTY_IMAGE_STORAGE_DIR and PROPERTY_IMAGE_PUBLIC_BASE_URL are required in production.',
      );
    }
    this.storageDirectory = configuredDirectory
      ? isAbsolute(configuredDirectory)
        ? configuredDirectory
        : resolve(process.cwd(), configuredDirectory)
      : resolve(process.cwd(), 'uploads', 'property-images');
    const baseUrl = (
      configuredPublicBaseUrl ||
      `http://localhost:${config.get<number>('port') || 5000}/api/v1`
    ).replace(/\/+$/, '');
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      throw new Error('PROPERTY_IMAGE_PUBLIC_BASE_URL must be an absolute HTTP(S) URL.');
    }
    if (
      !['http:', 'https:'].includes(parsedBaseUrl.protocol) ||
      parsedBaseUrl.username ||
      parsedBaseUrl.password
    ) {
      throw new Error('PROPERTY_IMAGE_PUBLIC_BASE_URL must be an absolute HTTP(S) URL without credentials.');
    }
    this.publicBaseUrl = baseUrl;
  }

  async save(file: UploadedPropertyImage) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size !== file.buffer.length) {
      throw new BadRequestException('The uploaded image could not be read.');
    }
    if (file.size < 1 || file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Each image must be 10 MB or smaller.');
    }

    const contentType = this.detectContentType(file.buffer);
    if (!contentType || contentType !== file.mimetype) {
      throw new BadRequestException(
        'Unsupported image. Upload a valid JPEG, PNG, or WebP image.',
      );
    }

    const checksum = this.fingerprint(file);
    const sanitizedBuffer = await this.sanitize(file.buffer, contentType);
    const filename = `${randomUUID()}${MIME_EXTENSIONS[contentType]}`;
    const filePath = join(this.storageDirectory, filename);
    const temporaryPath = join(
      this.storageDirectory,
      `.${filename}.${randomUUID()}.tmp`,
    );
    try {
      await mkdir(this.storageDirectory, { recursive: true });
      await writeFile(temporaryPath, sanitizedBuffer, { flag: 'wx', mode: 0o640 });
      await rename(temporaryPath, filePath);
    } catch (error) {
      try {
        await unlink(temporaryPath);
      } catch (cleanupError) {
        if (
          !cleanupError ||
          typeof cleanupError !== 'object' ||
          !('code' in cleanupError) ||
          cleanupError.code !== 'ENOENT'
        ) {
          this.logger.error(
            'Could not clean up a temporary property image',
            cleanupError instanceof Error ? cleanupError.stack : String(cleanupError),
          );
        }
      }
      this.logger.error(
        'Could not save an uploaded property image',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Image storage is unavailable.');
    }

    return {
      url: `${this.publicBaseUrl}/properties/images/${filename}`,
      filename,
      contentType,
      size: sanitizedBuffer.length,
      checksum,
    };
  }

  fingerprint(file: UploadedPropertyImage): string {
    return createHash('sha256').update(file.buffer).digest('hex');
  }

  async read(filename: string) {
    const filePath = this.resolveFilename(filename);
    try {
      return {
        buffer: await readFile(filePath),
        contentType: this.contentTypeFromFilename(filename),
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundException('Property image not found.');
      }
      throw new InternalServerErrorException('Property image could not be read.');
    }
  }

  async remove(filename: string): Promise<void> {
    try {
      await unlink(this.resolveFilename(filename));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw new InternalServerErrorException('Property image cleanup failed.');
    }
  }

  filenameForManagedUrl(url: string): string | undefined {
    const prefix = `${this.publicBaseUrl}/properties/images/`;
    if (!url.startsWith(prefix)) return undefined;
    const filename = url.slice(prefix.length);
    return /^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename)
      ? filename
      : undefined;
  }

  private resolveFilename(filename: string): string {
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename)) {
      throw new NotFoundException('Property image not found.');
    }
    const filePath = resolve(this.storageDirectory, filename);
    if (extname(filePath) !== `.${filename.split('.').pop()}`) {
      throw new NotFoundException('Property image not found.');
    }
    return filePath;
  }

  private contentTypeFromFilename(filename: string): string {
    const extension = extname(filename);
    const match = Object.entries(MIME_EXTENSIONS).find(([, ext]) => ext === extension);
    if (!match) throw new NotFoundException('Property image not found.');
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
      const expectedFormat = contentType.slice('image/'.length);
      if (metadata.format !== expectedFormat) {
        throw new BadRequestException('The uploaded image is invalid or unsupported.');
      }

      const image = sharp(buffer, { failOn: 'error' }).rotate();
      if (contentType === 'image/jpeg') {
        return await image.jpeg({ quality: 90 }).toBuffer();
      }
      if (contentType === 'image/png') {
        return await image.png().toBuffer();
      }
      if (contentType === 'image/webp') {
        return await image.webp({ quality: 90 }).toBuffer();
      }
      throw new BadRequestException('The uploaded image is invalid or unsupported.');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn('Rejected an unreadable property image.');
      throw new BadRequestException('The uploaded image is invalid or unsupported.');
    }
  }
}
