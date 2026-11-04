import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AUTH_RATE_LIMIT_ACTION } from '../src/modules/auth/auth-rate-limit.decorator';
import { AuthRateLimitGuard } from '../src/modules/auth/auth-rate-limit.guard';
import {
  AUTH_RATE_LIMITS,
  AuthRateLimitAction,
  AuthRateLimitService,
} from '../src/modules/auth/auth-rate-limit.service';

function attempt(
  rateLimits: AuthRateLimitService,
  action: AuthRateLimitAction,
  email: unknown,
  ip = '192.0.2.10',
): void {
  const reflector = {
    get: () => action,
  } as unknown as Reflector;
  const context = {
    getHandler: () => attempt,
    switchToHttp: () => ({
      getRequest: () => ({ ip, body: { email } }),
    }),
  } as unknown as ExecutionContext;

  new AuthRateLimitGuard(reflector, rateLimits).canActivate(context);
}

function assertThrottled(callback: () => void): void {
  assert.throws(callback, (error: unknown) => {
    if (!(error instanceof HttpException)) return false;
    assert.equal(error.getStatus(), HttpStatus.TOO_MANY_REQUESTS);
    assert.equal(
      error.message,
      'Too many authentication attempts. Try again later.',
    );
    return true;
  });
}

test('buyer and agent login attempts share normalized account protection', () => {
  for (const email of ['buyer@example.test', 'agent@example.test']) {
    const rateLimits = new AuthRateLimitService();
    for (let attemptIndex = 0; attemptIndex < AUTH_RATE_LIMITS.login.perAccount; attemptIndex += 1) {
      attempt(
        rateLimits,
        'login',
        attemptIndex % 2 === 0 ? email : ` ${email.toUpperCase()} `,
      );
    }

    assertThrottled(() => attempt(rateLimits, 'login', email.toUpperCase()));
  }
});

test('login IP limit spans different account identifiers', () => {
  const rateLimits = new AuthRateLimitService();
  for (let index = 0; index < AUTH_RATE_LIMITS.login.perIp; index += 1) {
    attempt(rateLimits, 'login', `user-${index}@example.test`);
  }

  assertThrottled(() =>
    attempt(rateLimits, 'login', 'another@example.test'),
  );
});

test('registration is limited per account and per IP', () => {
  const accountLimits = new AuthRateLimitService();
  for (
    let index = 0;
    index < AUTH_RATE_LIMITS.registration.perAccount;
    index += 1
  ) {
    attempt(
      accountLimits,
      'registration',
      index % 2 === 0 ? 'new@example.test' : ' NEW@example.test ',
    );
  }
  assertThrottled(() =>
    attempt(accountLimits, 'registration', 'new@example.test'),
  );

  const ipLimits = new AuthRateLimitService();
  for (let index = 0; index < AUTH_RATE_LIMITS.registration.perIp; index += 1) {
    attempt(ipLimits, 'registration', `new-${index}@example.test`);
  }
  assertThrottled(() =>
    attempt(ipLimits, 'registration', 'new-extra@example.test'),
  );
});

test('admin login has stricter per-account and per-IP limits', () => {
  const accountLimits = new AuthRateLimitService();
  for (
    let index = 0;
    index < AUTH_RATE_LIMITS['admin-login'].perAccount;
    index += 1
  ) {
    attempt(accountLimits, 'admin-login', 'admin@example.test');
  }
  assertThrottled(() =>
    attempt(accountLimits, 'admin-login', 'ADMIN@example.test'),
  );

  const ipLimits = new AuthRateLimitService();
  for (let index = 0; index < AUTH_RATE_LIMITS['admin-login'].perIp; index += 1) {
    attempt(ipLimits, 'admin-login', `admin-${index}@example.test`);
  }
  assertThrottled(() =>
    attempt(ipLimits, 'admin-login', 'another-admin@example.test'),
  );
});

test('successful login clears the account bucket and windows expire', () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;

  try {
    const rateLimits = new AuthRateLimitService();
    for (
      let index = 0;
      index < AUTH_RATE_LIMITS.login.perAccount;
      index += 1
    ) {
      attempt(rateLimits, 'login', 'buyer@example.test');
    }
    assertThrottled(() => attempt(rateLimits, 'login', 'buyer@example.test'));

    rateLimits.clearAccount('login', ' BUYER@example.test ');
    attempt(rateLimits, 'login', 'buyer@example.test');

    const adminLimits = new AuthRateLimitService();
    for (
      let index = 0;
      index < AUTH_RATE_LIMITS['admin-login'].perAccount;
      index += 1
    ) {
      attempt(adminLimits, 'admin-login', 'admin@example.test');
    }
    assertThrottled(() =>
      attempt(adminLimits, 'admin-login', 'admin@example.test'),
    );

    now += AUTH_RATE_LIMITS['admin-login'].windowMs + 1;
    attempt(adminLimits, 'admin-login', 'admin@example.test');
  } finally {
    Date.now = originalNow;
  }
});

test('all public authentication endpoints install the rate-limit guard', () => {
  const expectedActions = {
    register: 'registration',
    login: 'login',
    adminLogin: 'admin-login',
  } as const;

  for (const [method, action] of Object.entries(expectedActions)) {
    const handler = AuthController.prototype[
      method as keyof AuthController
    ] as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    assert.ok(guards?.includes(AuthRateLimitGuard));
    assert.equal(Reflect.getMetadata(AUTH_RATE_LIMIT_ACTION, handler), action);
  }
});
