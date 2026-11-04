import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_RATE_LIMIT_ACTION } from './auth-rate-limit.decorator';
import {
  AuthRateLimitAction,
  AuthRateLimitService,
} from './auth-rate-limit.service';

interface AuthRequest {
  ip?: string;
  socket?: { remoteAddress?: string };
  body?: { email?: unknown };
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: AuthRateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const action = this.reflector.get<AuthRateLimitAction>(
      AUTH_RATE_LIMIT_ACTION,
      context.getHandler(),
    );
    if (!action) {
      throw new InternalServerErrorException(
        'Authentication rate limit policy is missing.',
      );
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const ipAddress = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    this.rateLimitService.consume(action, ipAddress, request.body?.email);
    return true;
  }
}
