import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { constants as fsConstants, createReadStream, createWriteStream } from 'fs';
import { access, copyFile, mkdir, readdir, rename, stat, unlink, writeFile } from 'fs/promises';
import type { Readable } from 'stream';
import { isAbsolute, join, resolve } from 'path';
import { PROMO_LIMITS } from './promotion.constants';

export interface UploadedPromoVideo {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** A video streamed to a temporary file by {@link PromoMediaStorageService.receiveVideo}. */
export interface ReceivedPromoVideo {
  tempPath: string;
  size: number;
  mimetype: string;
  /** First bytes of the file, used for signature detection. */
  head: Buffer;
}

const VIDEO_FILENAME = /^[a-f0-9-]{36}\.(mp4|webm)$/;
const IMAGE_FILENAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
const TEMP_PREFIX = '.upload-';
const STALE_TEMP_MS = 60 * 60 * 1000;
const EXISTS_CACHE_MS = 30_000;

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

function resolveDirectory(configured: string | undefined, fallback: string) {
  if (!configured) return fallback;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

/** Maps filesystem write errors to clear, non-revealing HTTP errors. */
export function storageError(error: unknown, logger?: Logger): HttpException {
  const code = (error as { code?: string })?.code;
  if (code === 'ENOSPC' || code === 'EDQUOT') {
    logger?.error(`Media storage is full (${code}).`);
    return new HttpException('Media storage is full.', HttpStatus.INSUFFICIENT_STORAGE);
  }
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
    logger?.error(`Media storage is not writable (${code}).`);
    return new ServiceUnavailableException('Media storage is not writable.');
  }
  logger?.error('Could not store promotion media', error instanceof Error ? error.stack : String(error));
  return new InternalServerErrorException('Media storage is unavailable.');
}

/**
 * Filesystem storage for sponsored-campaign videos (images reuse the property
 * image pipeline, which re-encodes and strips metadata).
 *
 * Videos live in `PROMO_MEDIA_STORAGE_DIR`, defaulting to
 * `<PROPERTY_IMAGE_STORAGE_DIR>/promo-media` — inside the persistent storage
 * volume. Earlier releases stored them in the sibling folder
 * `<PROPERTY_IMAGE_STORAGE_DIR>/../promo-media`; those files are still found
 * and are copied (checksum-verified, originals kept) into the new folder at
 * startup.
 */
@Injectable()
export class PromoMediaStorageService implements OnModuleInit {
  private readonly logger = new Logger(PromoMediaStorageService.name);
  private readonly directory: string;
  private readonly legacyDirectory: string;
  private readonly imagesDirectory: string;
  private readonly publicBaseUrl: string;
  private readonly existsCache = new Map<string, { exists: boolean; expires: number }>();

  constructor(config: ConfigService) {
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
    this.imagesDirectory = resolveDirectory(
      config.get<string>('propertyImages.storageDir'),
      resolve(process.cwd(), 'uploads', 'property-images'),
    );
    this.directory = resolveDirectory(config.get<string>('promotions.mediaStorageDir'), join(this.imagesDirectory, 'promo-media'));
    this.legacyDirectory = join(this.imagesDirectory, '..', 'promo-media');
  }

  async onModuleInit() {
    try {
      await mkdir(this.directory, { recursive: true });
      await access(this.directory, fsConstants.W_OK);
    } catch (error) {
      this.logger.error(
        `Promotion media folder ${this.directory} is not writable (${(error as { code?: string }).code ?? 'unknown'}). Video uploads will fail until this is fixed.`,
      );
      return;
    }
    await this.removeStaleTemporaryFiles();
    await this.migrateLegacyVideos();
  }

  /** Where videos are written (for diagnostics/tests; never sent to clients). */
  get storageDirectory() {
    return this.directory;
  }

  /** Detects MP4 (ISO BMFF "ftyp") and WebM (EBML) from file bytes. */
  detectVideoType(buffer: Buffer): 'video/mp4' | 'video/webm' | undefined {
    if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
    if (buffer.length >= 4 && buffer.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
    return undefined;
  }

  /**
   * Streams an uploaded video to a temporary file inside the media folder,
   * enforcing the size limit while receiving. The temporary file is removed on
   * any failure, including a client that disconnects mid-upload.
   */
  receiveVideo(stream: Readable, mimetype: string, request?: NodeJS.EventEmitter): Promise<ReceivedPromoVideo> {
    const tempPath = join(this.directory, `${TEMP_PREFIX}${randomUUID()}.tmp`);
    return new Promise((resolvePromise, reject) => {
      let size = 0;
      let head = Buffer.alloc(0);
      let settled = false;
      const output = createWriteStream(tempPath, { flags: 'wx', mode: 0o640 });
      const fail = (error: HttpException) => {
        if (settled) return;
        settled = true;
        stream.unpipe(output);
        stream.resume(); // drain the rest of the request so the response can be sent
        output.destroy();
        unlink(tempPath).catch(() => undefined);
        request?.removeListener('close', onClose);
        reject(error);
      };
      // 'close' also fires after a normal request; only a request closed before all
      // of its body arrived (complete === false) is an interrupted upload.
      const onClose = () => {
        if (!settled && (request as { complete?: boolean } | undefined)?.complete === false) {
          fail(new BadRequestException('The upload was interrupted before it finished.'));
        }
      };
      request?.once('close', onClose);
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16 - head.length)]);
        if (size > PROMO_LIMITS.maxVideoBytes) {
          fail(new PayloadTooLargeException(`Videos must be ${PROMO_LIMITS.maxVideoBytes / (1024 * 1024)} MB or smaller.`));
        }
      });
      stream.on('error', () => fail(new BadRequestException('The upload was interrupted before it finished.')));
      output.on('error', (error) => {
        // After a deliberate stop (size limit / interruption) late writes may error: not a storage fault.
        if (!settled) fail(storageError(error, this.logger));
      });
      output.on('finish', () => {
        if (settled) return;
        settled = true;
        request?.removeListener('close', onClose);
        resolvePromise({ tempPath, size, mimetype, head });
      });
      stream.pipe(output);
    });
  }

  /** Validates a received video's signature and moves it to its final name. */
  async commitVideo(received: ReceivedPromoVideo): Promise<{ url: string; filename: string; contentType: string; size: number }> {
    const contentType = this.detectVideoType(received.head);
    if (received.size < 16 || !contentType || contentType !== received.mimetype) {
      await unlink(received.tempPath).catch(() => undefined);
      throw new BadRequestException('Unsupported video. Upload a valid MP4 or WebM file.');
    }
    const filename = `${randomUUID()}.${contentType === 'video/mp4' ? 'mp4' : 'webm'}`;
    try {
      await rename(received.tempPath, join(this.directory, filename));
    } catch (error) {
      await unlink(received.tempPath).catch(() => undefined);
      throw storageError(error, this.logger);
    }
    this.existsCache.delete(filename);
    return { url: `${PROMO_VIDEO_PATH}${filename}`, filename, contentType, size: received.size };
  }

  /** Removes a received-but-uncommitted temporary upload. */
  async discard(received: Pick<ReceivedPromoVideo, 'tempPath'>) {
    await unlink(received.tempPath).catch(() => undefined);
  }

  /** Buffer-based save (kept for callers that already hold the bytes in memory). */
  async saveVideo(file: UploadedPromoVideo): Promise<{ url: string; filename: string; contentType: string; size: number }> {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size !== file.buffer.length || file.size < 16) {
      throw new BadRequestException('Upload a valid MP4 or WebM video.');
    }
    if (file.size > PROMO_LIMITS.maxVideoBytes) {
      throw new PayloadTooLargeException(`Videos must be ${PROMO_LIMITS.maxVideoBytes / (1024 * 1024)} MB or smaller.`);
    }
    const contentType = this.detectVideoType(file.buffer);
    if (!contentType || contentType !== file.mimetype) {
      throw new BadRequestException('Unsupported video. Upload a valid MP4 or WebM file.');
    }
    const filename = `${randomUUID()}.${contentType === 'video/mp4' ? 'mp4' : 'webm'}`;
    const temporary = join(this.directory, `${TEMP_PREFIX}${randomUUID()}.tmp`);
    try {
      await mkdir(this.directory, { recursive: true });
      await writeFile(temporary, file.buffer, { flag: 'wx', mode: 0o640 });
      await rename(temporary, join(this.directory, filename));
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw storageError(error, this.logger);
    }
    return { url: `${PROMO_VIDEO_PATH}${filename}`, filename, contentType, size: file.size };
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
  async exists(reference: PromoMediaReference, { useCache = false } = {}): Promise<boolean> {
    const cacheKey = `${reference.kind}:${reference.filename}`;
    if (useCache) {
      const cached = this.existsCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) return cached.exists;
    }
    let found = false;
    if (reference.kind === 'image') {
      found = IMAGE_FILENAME.test(reference.filename) && (await this.isFile(resolve(this.imagesDirectory, reference.filename)));
    } else {
      found = VIDEO_FILENAME.test(reference.filename) && Boolean(await this.locateVideo(reference.filename));
    }
    this.existsCache.set(cacheKey, { exists: found, expires: Date.now() + EXISTS_CACHE_MS });
    if (this.existsCache.size > 2000) this.existsCache.clear();
    return found;
  }

  filenameForManagedUrl(url: string): string | undefined {
    const reference = this.resolveReference(url);
    return reference?.kind === 'video' ? reference.filename : undefined;
  }

  /** Absolute path for streaming (throws 404 for unknown or invalid names). */
  async pathFor(filename: string): Promise<{ path: string; contentType: string }> {
    if (!VIDEO_FILENAME.test(filename)) throw new NotFoundException('Media not found.');
    const path = await this.locateVideo(filename);
    if (!path) throw new NotFoundException('Media not found.');
    return { path, contentType: filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm' };
  }

  async remove(filename: string): Promise<void> {
    if (!VIDEO_FILENAME.test(filename)) return;
    this.existsCache.delete(`video:${filename}`);
    for (const directory of new Set([this.directory, this.legacyDirectory])) {
      try {
        await unlink(resolve(directory, filename));
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
        this.logger.warn(`Could not remove promotion video ${filename}`);
      }
    }
  }

  /** The current folder first, then the legacy sibling folder of older releases. */
  private async locateVideo(filename: string): Promise<string | undefined> {
    for (const directory of new Set([this.directory, this.legacyDirectory])) {
      const candidate = resolve(directory, filename);
      if (await this.isFile(candidate)) return candidate;
    }
    return undefined;
  }

  private async isFile(path: string) {
    try {
      return (await stat(path)).isFile();
    } catch {
      return false;
    }
  }

  private async sha256(path: string): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      const hash = createHash('sha256');
      createReadStream(path)
        .on('data', (chunk) => hash.update(chunk))
        .on('end', () => resolvePromise(hash.digest('hex')))
        .on('error', reject);
    });
  }

  /**
   * Copies videos stored by earlier releases (sibling folder) into the media
   * folder. Each copy is written under a temporary name, verified by SHA-256
   * against the original and only then given its final name. Originals are
   * never deleted.
   */
  async migrateLegacyVideos(): Promise<{ copied: number; skipped: number; failed: number }> {
    const result = { copied: 0, skipped: 0, failed: 0 };
    if (resolve(this.legacyDirectory) === resolve(this.directory)) return result;
    let names: string[];
    try {
      names = await readdir(this.legacyDirectory);
    } catch {
      return result; // nothing stored by an earlier release
    }
    const legacyVideos = names.filter((entry) => VIDEO_FILENAME.test(entry));
    if (!legacyVideos.length) return result;
    try {
      await mkdir(this.directory, { recursive: true });
    } catch (error) {
      this.logger.error(`Could not create the promotion media folder for migration: ${(error as { code?: string }).code ?? 'unknown error'}`);
      return { ...result, failed: legacyVideos.length };
    }
    for (const name of legacyVideos) {
      const source = join(this.legacyDirectory, name);
      const target = join(this.directory, name);
      if (await this.isFile(target)) {
        result.skipped += 1;
        continue;
      }
      const temporary = join(this.directory, `${TEMP_PREFIX}${randomUUID()}.tmp`);
      try {
        await copyFile(source, temporary, fsConstants.COPYFILE_EXCL);
        const [original, copy] = await Promise.all([this.sha256(source), this.sha256(temporary)]);
        if (original !== copy) throw new Error('checksum mismatch');
        await rename(temporary, target);
        result.copied += 1;
      } catch (error) {
        result.failed += 1;
        await unlink(temporary).catch(() => undefined);
        this.logger.error(`Could not migrate promotion video ${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (result.copied || result.failed) {
      this.logger.log(`Promotion videos migrated from the legacy folder: ${result.copied} copied, ${result.skipped} already present, ${result.failed} failed (originals kept).`);
    }
    return result;
  }

  /** Removes temporary upload files left by interrupted uploads/crashes. */
  private async removeStaleTemporaryFiles() {
    try {
      const now = Date.now();
      for (const name of await readdir(this.directory)) {
        if (!name.startsWith(TEMP_PREFIX) && !/^\..*\.tmp$/.test(name)) continue;
        const path = join(this.directory, name);
        const info = await stat(path).catch(() => null);
        if (info && now - info.mtimeMs > STALE_TEMP_MS) await unlink(path).catch(() => undefined);
      }
    } catch {
      // Folder missing or unreadable: reported by onModuleInit.
    }
  }
}
