import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

export type AuthRateLimitAction =
  | 'login'
  | 'admin-login'
  | 'registration'
  | 'visitor-session'
  | 'visitor-conversation'
  | 'visitor-message'
  | 'visitor-read';

export const AUTH_RATE_LIMITS = {
  login: {
    windowMs: 15 * 60 * 1000,
    perIp: 30,
    perAccount: 8,
  },
  'admin-login': {
    windowMs: 15 * 60 * 1000,
    perIp: 5,
    perAccount: 5,
  },
  registration: {
    windowMs: 60 * 60 * 1000,
    perIp: 20,
    perAccount: 5,
  },
  'visitor-session': {
    windowMs: 60 * 60 * 1000,
    perIp: 10,
    perAccount: 0,
    perContext: 100,
  },
  'visitor-conversation': {
    windowMs: 60 * 60 * 1000,
    perIp: 20,
    perAccount: 5,
    perContext: 50,
  },
  'visitor-message': {
    windowMs: 60 * 1000,
    perIp: 120,
    perAccount: 20,
    perContext: 100,
  },
  'visitor-read': {
    windowMs: 60 * 1000,
    perIp: 300,
    perAccount: 120,
    perContext: 180,
  },
} as const;

interface RateLimitBucket {
  count: number;
  expiresAt: number;
}

export function normalizeAuthEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private requestsSinceCleanup = 0;
  private readonly now = () => Date.now();

  consume(
    action: AuthRateLimitAction,
    ipAddress: string,
    account: unknown,
    context?: unknown | unknown[],
  ): void {
    const policy = AUTH_RATE_LIMITS[action];
    const now = this.now();
    const accountValue = normalizeAuthEmail(account);
    const contextValues = (Array.isArray(context) ? context : [context])
      .map(normalizeAuthEmail)
      .filter(Boolean);
    const entries: { key: string; limit: number }[] = [
      { key: this.bucketKey(action, 'ip', ipAddress || 'unknown'), limit: policy.perIp },
    ];
    if (accountValue && policy.perAccount > 0) {
      entries.push({
        key: this.bucketKey(action, 'account', accountValue),
        limit: policy.perAccount,
      });
    }
    if ('perContext' in policy) {
      for (const contextValue of contextValues) {
        entries.push({
          key: this.bucketKey(action, 'context', contextValue),
          limit: policy.perContext,
        });
      }
    }

    if (
      entries.some(({ key, limit }) => {
        const bucket = this.buckets.get(key);
        return bucket && bucket.expiresAt > now && bucket.count >= limit;
      })
    ) {
      throw new HttpException(
        'Too many authentication attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    for (const { key } of entries) {
      const bucket = this.buckets.get(key);
      if (!bucket || bucket.expiresAt <= now) {
        this.buckets.set(key, {
          count: 1,
          expiresAt: now + policy.windowMs,
        });
      } else {
        bucket.count += 1;
      }
    }

    this.cleanupExpiredBuckets(now);
  }

  clearAccount(action: AuthRateLimitAction, email: unknown): void {
    this.buckets.delete(
      this.bucketKey(action, 'account', normalizeAuthEmail(email)),
    );
  }

  private bucketKey(
    action: AuthRateLimitAction,
    subject: 'ip' | 'account' | 'context',
    value: string,
  ): string {
    const digest = createHash('sha256')
      .update(`${action}:${subject}:${value}`)
      .digest('hex');
    return `${action}:${subject}:${digest}`;
  }

  private cleanupExpiredBuckets(now: number): void {
    this.requestsSinceCleanup += 1;
    if (this.requestsSinceCleanup < 256) return;

    this.requestsSinceCleanup = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt <= now) this.buckets.delete(key);
    }
  }
}
