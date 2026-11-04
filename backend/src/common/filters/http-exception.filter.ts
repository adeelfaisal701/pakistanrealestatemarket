import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const mappedStatus = this.mapKnownError(exception);
    const status = isHttpException
      ? exception.getStatus()
      : mappedStatus?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : null;

    let message: string | string[] = 'Internal server error';
    let errors: any = null;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      message = (exceptionResponse as any).message || message;
      errors = (exceptionResponse as any).errors || null;
    } else if (mappedStatus) {
      message = mappedStatus.message;
    }

    // Never expose internal error details (Mongoose/BSON/RegExp messages, stack
    // info, etc.) to clients for server-side failures. The real error is logged.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Internal server error';
      errors = null;
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${
        exception instanceof Error ? exception.message : String(message)
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(errors ? { errors } : {}),
    });
  }

  /**
   * Maps well-known database/driver errors to safe client-facing responses so
   * they are not reported as generic 500s.
   */
  private mapKnownError(
    exception: unknown,
  ): { status: number; message: string } | null {
    if (!(exception instanceof Error)) return null;
    const err = exception as Error & { code?: number | string };

    // MongoDB duplicate key (e.g. unique email race on register)
    if (err.code === 11000) {
      return { status: HttpStatus.CONFLICT, message: 'Resource already exists' };
    }
    // Mongoose cast / BSON id errors caused by malformed client input
    if (
      err.name === 'CastError' ||
      err.name === 'BSONError' ||
      err.name === 'BSONTypeError'
    ) {
      return { status: HttpStatus.BAD_REQUEST, message: 'Invalid input value' };
    }
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return { status: HttpStatus.PAYLOAD_TOO_LARGE, message: 'Each image must be 10 MB or smaller.' };
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return { status: HttpStatus.BAD_REQUEST, message: 'Upload one image per request.' };
      }
      return { status: HttpStatus.BAD_REQUEST, message: 'The image upload is invalid.' };
    }
    return null;
  }
}
