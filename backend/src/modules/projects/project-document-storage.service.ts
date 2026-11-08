import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join, resolve } from 'path';

export interface UploadedProjectDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ProjectDocumentStorageService {
  private readonly directory: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const configuredDirectory = config.get<string>('propertyImages.storageDir');
    const nodeEnv = config.get<string>('nodeEnv');
    const configuredBaseUrl = config.get<string>('propertyImages.publicBaseUrl');
    const rawBaseUrl = configuredBaseUrl?.trim()
      ? configuredBaseUrl.trim().replace(/\/+$/, '')
      : nodeEnv === 'production'
        ? ''
        : '/api/v1';

    if (!rawBaseUrl) {
      throw new Error('PROPERTY_IMAGE_PUBLIC_BASE_URL is required in production.');
    }
    if (rawBaseUrl.startsWith('/')) {
      if (nodeEnv === 'production' || rawBaseUrl !== '/api/v1') {
        throw new Error(
          'PROPERTY_IMAGE_PUBLIC_BASE_URL must be an absolute HTTP(S) URL in production.',
        );
      }
      this.publicBaseUrl = rawBaseUrl;
    } else {
      let parsedBaseUrl: URL;
      try {
        parsedBaseUrl = new URL(rawBaseUrl);
      } catch {
        throw new Error(
          'PROPERTY_IMAGE_PUBLIC_BASE_URL must be an absolute HTTP(S) URL.',
        );
      }
      if (
        !['http:', 'https:'].includes(parsedBaseUrl.protocol) ||
        parsedBaseUrl.username ||
        parsedBaseUrl.password
      ) {
        throw new Error(
          'PROPERTY_IMAGE_PUBLIC_BASE_URL must be an absolute HTTP(S) URL without credentials.',
        );
      }
      const isLoopback =
        parsedBaseUrl.hostname === 'localhost' ||
        parsedBaseUrl.hostname === '127.0.0.1' ||
        parsedBaseUrl.hostname === '[::1]';
      this.publicBaseUrl =
        nodeEnv !== 'production' && isLoopback ? '/api/v1' : rawBaseUrl;
    }

    this.directory = join(
      configuredDirectory
        ? isAbsolute(configuredDirectory)
          ? configuredDirectory
          : resolve(process.cwd(), configuredDirectory)
        : resolve(process.cwd(), 'uploads', 'property-images'),
      '..',
      'project-documents',
    );
  }

  async save(file: UploadedProjectDocument): Promise<{ url: string; filename: string }> {
    if (
      !file ||
      !Buffer.isBuffer(file.buffer) ||
      file.size !== file.buffer.length ||
      file.size < 8 ||
      file.size > 10 * 1024 * 1024 ||
      file.mimetype !== 'application/pdf' ||
      file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      throw new BadRequestException('Upload a valid PDF payment plan (10 MB maximum).');
    }

    const filename = `${randomUUID()}.pdf`;
    try {
      await mkdir(this.directory, { recursive: true });
      await writeFile(join(this.directory, filename), file.buffer, {
        flag: 'wx',
        mode: 0o640,
      });
    } catch {
      throw new InternalServerErrorException('Project document storage is unavailable.');
    }
    return {
      filename,
      url: `${this.publicBaseUrl}/projects/media/${filename}`,
    };
  }

  async read(filename: string): Promise<Buffer> {
    const filePath = this.resolve(filename);
    try {
      return await readFile(filePath);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundException('Project document not found.');
      }
      throw new InternalServerErrorException('Project document could not be read.');
    }
  }

  filenameForManagedUrl(url: string): string | undefined {
    const prefix = `${this.publicBaseUrl}/projects/media/`;
    if (!url.startsWith(prefix)) return undefined;
    const filename = url.slice(prefix.length);
    return this.isManagedFilename(filename) ? filename : undefined;
  }

  urlForManagedFilename(filename: string): string {
    if (!this.isManagedFilename(filename)) {
      throw new NotFoundException('Project document not found.');
    }
    return `${this.publicBaseUrl}/projects/media/${filename}`;
  }

  async remove(url: string): Promise<void> {
    const filename = this.filenameForManagedUrl(url);
    if (!filename) return;
    try {
      await unlink(this.resolve(filename));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
      throw new InternalServerErrorException('Project document cleanup failed.');
    }
  }

  isManagedFilename(filename: string): boolean {
    return /^[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/.test(filename);
  }

  contentTypeForFilename(filename: string): string {
    if (!this.isManagedFilename(filename)) {
      throw new NotFoundException('Project document not found.');
    }
    if (filename.endsWith('.pdf')) return 'application/pdf';
    if (filename.endsWith('.jpg')) return 'image/jpeg';
    if (filename.endsWith('.png')) return 'image/png';
    return 'image/webp';
  }

  private resolve(filename: string): string {
    if (!this.isManagedFilename(filename)) {
      throw new NotFoundException('Project document not found.');
    }
    return resolve(dirname(this.directory), 'project-documents', filename);
  }
}
