import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import type { Readable } from 'stream';
// multer ships with @nestjs/platform-express (no separate dependency or typings).
import multer = require('multer');
import { PromoMediaStorageService, type ReceivedPromoVideo } from './promo-media-storage.service';
import { PROMO_LIMITS } from './promotion.constants';

export const PROMO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PROMO_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MB = 1024 * 1024;

/** File as delivered to the controller: an image buffer, or a video already on disk. */
export interface PromoUploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  promoVideo?: ReceivedPromoVideo;
}

type StorageCallback = (error: Error | null, info?: Partial<PromoUploadedFile>) => void;
interface IncomingUploadFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  stream: Readable;
}
type ReceiveMiddleware = (request: Request, response: Response, done: (error?: unknown) => void) => void;

/** Maps multer/busboy failures to clear client errors. */
export function uploadError(error: unknown): HttpException {
  if (error instanceof HttpException) return error;
  if (error instanceof Error && error.name === 'MulterError') {
    const code = (error as Error & { code?: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      return new PayloadTooLargeException(`Images must be ${PROMO_LIMITS.maxImageBytes / MB} MB or smaller and videos ${PROMO_LIMITS.maxVideoBytes / MB} MB or smaller.`);
    }
    if (code === 'LIMIT_FILE_COUNT' || code === 'LIMIT_UNEXPECTED_FILE') {
      return new BadRequestException('Upload one file at a time.');
    }
    return new BadRequestException('The upload request is invalid.');
  }
  const message = error instanceof Error ? error.message : '';
  if (/Unexpected end of (form|file)|Part terminated early|aborted/i.test(message)) {
    return new BadRequestException('The upload was interrupted before it finished. Please try again.');
  }
  if (/boundary|Unsupported content type|Malformed/i.test(message)) {
    return new BadRequestException('The upload request is invalid.');
  }
  return new InternalServerErrorException('The upload could not be processed.');
}

/**
 * Receives one campaign media file. Videos are streamed straight to a
 * temporary file in the media folder (never held in memory) with the size
 * limit enforced while receiving; images (≤ 10 MB) are buffered for the
 * existing property-image pipeline, which re-encodes them.
 */
@Injectable()
export class PromoMediaUploadInterceptor implements NestInterceptor {
  private readonly receive: ReceiveMiddleware;

  constructor(private readonly videos: PromoMediaStorageService) {
    const storage = {
      _handleFile: (request: Request, file: IncomingUploadFile, callback: StorageCallback) => {
        if (PROMO_VIDEO_TYPES.includes(file.mimetype)) {
          this.videos
            .receiveVideo(file.stream, file.mimetype, request)
            .then((promoVideo) => callback(null, { promoVideo, size: promoVideo.size }))
            .catch((error) => callback(error));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        let failed = false;
        file.stream.on('data', (chunk: Buffer) => {
          if (failed) return;
          size += chunk.length;
          if (size > PROMO_LIMITS.maxImageBytes) {
            failed = true;
            chunks.length = 0;
            file.stream.resume();
            callback(new PayloadTooLargeException(`Images must be ${PROMO_LIMITS.maxImageBytes / MB} MB or smaller.`));
            return;
          }
          chunks.push(chunk);
        });
        file.stream.on('error', (error) => {
          if (failed) return;
          failed = true;
          callback(error);
        });
        file.stream.on('end', () => {
          if (failed) return;
          const buffer = Buffer.concat(chunks);
          callback(null, { buffer, size: buffer.length });
        });
      },
      _removeFile: (_request: Request, file: PromoUploadedFile, callback: (error: Error | null) => void) => {
        const promoVideo = file.promoVideo;
        if (promoVideo) {
          this.videos.discard(promoVideo).finally(() => callback(null));
          return;
        }
        callback(null);
      },
    };
    this.receive = multer({
      storage,
      // Backstop only: exact per-type limits are enforced while receiving.
      limits: { files: 1, fields: 4, parts: 5, fileSize: PROMO_LIMITS.maxVideoBytes + MB },
      fileFilter: (_request: Request, file: IncomingUploadFile, callback: (error: Error | null, accept?: boolean) => void) => {
        if (![...PROMO_IMAGE_TYPES, ...PROMO_VIDEO_TYPES].includes(file.mimetype)) {
          callback(new BadRequestException('Unsupported file type. Upload a JPG, PNG or WebP image, or an MP4 or WebM video.'));
          return;
        }
        callback(null, true);
      },
    }).single('file') as ReceiveMiddleware;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    await new Promise<void>((resolve, reject) => {
      this.receive(request, response, (error?: unknown) => (error ? reject(uploadError(error)) : resolve()));
    });
    return next.handle();
  }
}
