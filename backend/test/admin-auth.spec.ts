import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '../src/modules/users/schemas/user.schema';

function createService(options?: {
  email?: string;
  user?: Record<string, unknown> | null;
}) {
  const signedPayloads: Record<string, unknown>[] = [];
  const usersService = {
    findByEmail: async () => options?.user ?? null,
  };
  const jwtService = {
    sign: (payload: Record<string, unknown>) => {
      signedPayloads.push(payload);
      return 'signed-admin-token';
    },
  };
  const configService = {
    get: (key: string) =>
      key === 'admin.email' ? options?.email : undefined,
  };

  return {
    service: new AuthService(
      usersService as never,
      jwtService as never,
      configService as never,
    ),
    signedPayloads,
  };
}

const adminPassword = 'synthetic-admin-password-2026';
const adminUser = {
  _id: 'admin-db-id',
  email: 'admin@example.test',
  name: 'Configured Admin',
  role: UserRole.ADMIN,
  passwordHash: bcrypt.hashSync(adminPassword, 4),
};

test('a valid database bcrypt hash issues a JWT for the database admin identity', async () => {
  const { service, signedPayloads } = createService({
    email: 'admin@example.test',
    user: adminUser,
  });

  const result = await service.loginConfiguredAdmin({
    email: 'ADMIN@example.test',
    password: adminPassword,
  });

  assert.equal(result.accessToken, 'signed-admin-token');
  assert.deepEqual(result.user, {
    id: 'admin-db-id',
    name: 'Configured Admin',
    email: 'admin@example.test',
    role: UserRole.ADMIN,
  });
  assert.deepEqual(signedPayloads[0], {
    sub: 'admin-db-id',
    email: 'admin@example.test',
    role: UserRole.ADMIN,
  });
});

test('admin login rejects invalid configured email or password', async () => {
  const { service, signedPayloads } = createService({
    email: 'admin@example.test',
    user: adminUser,
  });

  await assert.rejects(
    service.loginConfiguredAdmin({
      email: 'other@example.test',
      password: adminPassword,
    }),
    UnauthorizedException,
  );
  await assert.rejects(
    service.loginConfiguredAdmin({
      email: 'admin@example.test',
      password: 'incorrect-password',
    }),
    UnauthorizedException,
  );
  assert.equal(signedPayloads.length, 0);
});

test('admin login fails clearly when credentials are not configured', async () => {
  const { service } = createService({ user: adminUser });

  await assert.rejects(
    service.loginConfiguredAdmin({
      email: 'admin@example.test',
      password: 'some-password',
    }),
    (error: unknown) =>
      error instanceof ServiceUnavailableException &&
      error.message.includes('Admin authentication is unavailable'),
  );
});

test('buyer and agent records cannot authenticate through the admin login', async () => {
  for (const role of [UserRole.BUYER, UserRole.AGENT]) {
    const { service, signedPayloads } = createService({
      email: 'admin@example.test',
      user: { ...adminUser, role },
    });

    await assert.rejects(
      service.loginConfiguredAdmin({
        email: 'admin@example.test',
        password: adminPassword,
      }),
      (error: unknown) =>
        error instanceof UnauthorizedException &&
        error.message.includes('Invalid administrator credentials'),
    );
    assert.equal(signedPayloads.length, 0);
  }
});

test('admin login rejects missing and invalid database password hashes', async () => {
  for (const passwordHash of [undefined, 'not-a-bcrypt-hash']) {
    const { service, signedPayloads } = createService({
      email: 'admin@example.test',
      user: { ...adminUser, passwordHash },
    });

    await assert.rejects(
      service.loginConfiguredAdmin({
        email: 'admin@example.test',
        password: adminPassword,
      }),
      (error: unknown) =>
        error instanceof UnauthorizedException &&
        error.message.includes('Invalid administrator credentials'),
    );
    assert.equal(signedPayloads.length, 0);
  }
});

test('the regular login flow cannot issue a token for an admin account', async () => {
  const { service, signedPayloads } = createService({
    email: 'admin@example.test',
    user: {
      ...adminUser,
    },
  });

  await assert.rejects(
    service.login({
      email: 'admin@example.test',
      password: adminPassword,
    }),
    UnauthorizedException,
  );
  assert.equal(signedPayloads.length, 0);
});
