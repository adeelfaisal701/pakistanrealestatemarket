import { SetMetadata } from '@nestjs/common';
import { AuthRateLimitAction } from './auth-rate-limit.service';

export const AUTH_RATE_LIMIT_ACTION = 'auth-rate-limit-action';
export const AuthRateLimit = (action: AuthRateLimitAction) =>
  SetMetadata(AUTH_RATE_LIMIT_ACTION, action);
