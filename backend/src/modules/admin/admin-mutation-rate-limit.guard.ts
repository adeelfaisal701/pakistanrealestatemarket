import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_MUTATIONS_PER_WINDOW = 20;

@Injectable()
export class AdminMutationRateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, { startedAt: number; count: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: string };
      ip?: string;
      method?: string;
      route?: { path?: string };
    }>();
    const identity = request.user?.id;
    if (!identity) return false;
    const key = `${identity}:${request.method ?? ''}:${request.route?.path ?? ''}`;
    const now = Date.now();
    const current = this.requests.get(key);
    if (!current || now - current.startedAt >= WINDOW_MS) {
      this.requests.set(key, { startedAt: now, count: 1 });
    } else if (current.count >= MAX_MUTATIONS_PER_WINDOW) {
      throw new HttpException(
        'Too many admin changes. Try again shortly.',
        429,
      );
    } else {
      current.count += 1;
    }

    if (this.requests.size > 5000) {
      for (const [requestKey, record] of this.requests) {
        if (now - record.startedAt >= WINDOW_MS) this.requests.delete(requestKey);
      }
    }
    return true;
  }
}
