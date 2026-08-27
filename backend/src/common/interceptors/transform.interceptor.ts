import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        // If response is already in custom format or has data/meta
        if (res && typeof res === 'object' && 'data' in res) {
          return {
            success: true,
            statusCode,
            data: res.data,
            meta: res.meta,
            message: res.message,
          };
        }

        return {
          success: true,
          statusCode,
          data: res,
        };
      }),
    );
  }
}
