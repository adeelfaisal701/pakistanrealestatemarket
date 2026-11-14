import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, rename, stat, unlink, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import { PROMO_LIMITS } from './promotion.constants';

export interface UploadedPromoVideo {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const VIDEO_FILENAME = /^[a-f0-9-]{36}\.(mp4|webm)$/;
const IMAGE_FILENAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

/**
 * Canonical, environment-independent paths of uploaded campaign media. They
 * are served by the API (global prefix /api/v1) and, on the website and admin
 * hosts, through the frontend's /api/v1 proxy — so they never depend on
 * PROPERTY_IMAGE_PUBLIC_BASE_URL and are not rewritten by the browser client.
 */
export const PROMO_IMAGE_PATH = '/api/v1/properties/images/';
export const PROMO_VIDEO_PATH = '/api/v1/promotions/media/';

export interface PromoMediaReference {
  kind: 'image' | 'video';
  filename: string;
  /** Canonical URL to store and serve. */
  url: string;
}

/**
 * Filesystem storage for sponsored-campaign videos (images reuse the property
 * image pipeline, which re-encodes and strips metadata). Files live next to
 * the existing upload folders and are served with HTTP range support.
 */
@Injectable()
export class PromoMediaStorageService {
  private readonly logger = new Logger(PromoMediaStorageService.name);
  private readonly directory: string;
  private readonly imagesDirectory: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const configuredDirectory = config.get<string>('propertyImages.storageDir');
    const nodeEnv = config.get<string>('nodeEnv');
    const configuredBaseUrl = config.get<string>('propertyImages.publicBaseUrl')?.trim();
    let baseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/+$/, '') : nodeEnv === 'production' ? '' : '/api/v1';
    if (!baseUrl) throw new Error('PROPERTY_IMAGE_PUBLIC_BASE_URL is required in production.');
    if (!baseUrl.startsWith('/')) {
      const parsed = new URL(baseUrl);
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
      if (nodeEnv !== 'production' && loopback) baseUrl = '/api/v1';
    }
    this.publicBaseUrl = baseUrl;
    // Same directory resolution as PropertyImageStorageService (campaign images use that pipeline).
    this.imagesDirectory = configuredDirectory
      ? isAbsolute(configuredDirectory)
        ? configuredDirectory
        : resolve(process.cwd(), configuredDirectory)
      : resolve(process.cwd(), 'uploads', 'property-images');
    this.directory = join(this.imagesDirectory, '..', 'promo-media');
  }

  /**
   * Resolves a campaign media URL to an uploaded file. Accepts the canonical
   * relative path and the absolute form built from PROPERTY_IMAGE_PUBLIC_BASE_URL
   * (older responses); anything else is not managed media.
   */
  resolveReference(url: string | undefined | null): PromoMediaReference | undefined {
    const value = url?.trim();
    if (!value) return undefined;
    const forms: Array<{ kind: 'image' | 'video'; prefixes: string[]; pattern: RegExp; canonical: string }> = [
      {
        kind: 'image',
        prefixes: [PROMO_IMAGE_PATH, `${this.publicBaseUrl}/properties/images/`],
        pattern: IMAGE_FILENAME,
        canonical: PROMO_IMAGE_PATH,
      },
      {
        kind: 'video',
        prefixes: [PROMO_VIDEO_PATH, `${this.publicBaseUrl}/promotions/media/`],
        pattern: VIDEO_FILENAME,
        canonical: PROMO_VIDEO_PATH,
      },
    ];
    for (const form of forms) {
      for (const prefix of new Set(form.prefixes)) {
        if (!value.startsWith(prefix)) continue;
        const filename = value.slice(prefix.length);
        if (form.pattern.test(filename)) return { kind: form.kind, filename, url: `${form.canonical}${filename}` };
      }
    }
    return undefined;
  }

  /** Whether the referenced file is present in storage (i.e. it really was uploaded here). */
  async exists(reference: PromoMediaReference): Promise<boolean> {
    const pattern = reference.kind === 'image' ? IMAGE_FILENAME : VIDEO_FILENAME;
    if (!pattern.test(reference.filename)) return false;
    const directory = reference.kind === 'image' ? this.imagesDirectory : this.directory;
    try {
      return (await stat(resolve(directory, reference.filename))).isFile();
    } catch {
      return false;
    }
  }

  /** Detects MP4 (ISO BMFF "ftyp") and WebM (EBML) from file bytes. */
  detectVideoType(buffer: Buffer): 'video/mp4' | 'video/webm' | undefined {
    if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
    if (buffer.length >= 4 && buffer.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
    return undefined;
  }

  async saveVideo(file: UploadedPromoVideo): Promise<{ url: string; filename: string; contentType: string; size: number }> {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size !== file.buffer.length || file.size < 16) {
      throw new BadRequestException('Upload a valid MP4 or WebM video.');
    }
    if (file.size > PROMO_LIMITS.maxVideoBytes) {
      throw new BadRequestException(`Videos must be ${PROMO_LIMITS.maxVideoBytes / (1024 * 1024)} MB or smaller.`);
    }
    const contentType = this.detectVideoType(file.buffer);
    if (!contentType || contentType !== file.mimetype) {
      throw new BadRequestException('Unsupported video. Upload a valid MP4 or WebM file.');
    }
    const filename = `${randomUUID()}.${contentType === 'video/mp4' ? 'mp4' : 'webm'}`;
    const temporary = join(this.directory, `.${filename}.${randomUUID()}.tmp`);
    try {
      await mkdir(this.directory, { recursive: true });
      await writeFile(temporary, file.buffer, { flag: 'wx', mode: 0o640 });
      await rename(temporary, join(this.directory, filename));
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      this.logger.error('Could not save a promotion video', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Video storage is unavailable.');
    }
    return { url: `${PROMO_VIDEO_PATH}${filename}`, filename, contentType, size: file.size };
  }

  filenameForManagedUrl(url: string): string | undefined {
    const reference = this.resolveReference(url);
    return reference?.kind === 'video' ? reference.filename : undefined;
  }

  /** Absolute path for streaming (throws 404 for unknown or invalid names). */
  async pathFor(filename: string): Promise<{ path: string; contentType: string }> {
    if (!VIDEO_FILENAME.test(filename)) throw new NotFoundException('Media not found.');
    const path = resolve(this.directory, filename);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException('Media not found.');
    }
    return { path, contentType: filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm' };
  }

  async remove(filename: string): Promise<void> {
    if (!VIDEO_FILENAME.test(filename)) return;
    try {
      await unlink(resolve(this.directory, filename));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
      this.logger.warn(`Could not remove promotion video ${filename}`);
    }
  }
}
