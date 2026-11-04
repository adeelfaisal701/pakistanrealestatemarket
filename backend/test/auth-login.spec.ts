import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '../src/modules/users/schemas/user.schema';

const password = 'Synthetic-login-password-2026';
const validHash = bcrypt.hashSync(password, 4);

function createService(user: Record<string, unknown> | null) {
  const usersService = {
    findByEmail: async (email: string) =>
      email === 'known@example.test' ? user : null,
  };
  const jwtService = { sign: () => 'synthetic-access-token' };
  const configService = { get: () => undefined };

  return new AuthService(
    usersService as never,
    jwtService as never,
    configService as never,
  );
}

test('unknown account and incorrect password have the same generic login response', async () => {
  const service = createService({
    _id: 'buyer-id',
    email: 'known@example.test',
    passwordHash: validHash,
    role: UserRole.BUYER,
  });

  let unknownAccountError: unknown;
  let incorrectPasswordError: unknown;

  try {
    await service.login({
      email: 'missing@example.test',
      password,
    });
  } catch (error) {
    unknownAccountError = error;
  }

  try {
    await service.login({
      email: 'known@example.test',
      password: 'wrong-password',
    });
  } catch (error) {
    incorrectPasswordError = error;
  }

  assert.ok(unknownAccountError instanceof UnauthorizedException);
  assert.ok(incorrectPasswordError instanceof UnauthorizedException);
  assert.equal(
    (unknownAccountError as UnauthorizedException).message,
    (incorrectPasswordError as UnauthorizedException).message,
  );
  assert.equal(
    (unknownAccountError as UnauthorizedException).message,
    'Invalid email or password',
  );
});
