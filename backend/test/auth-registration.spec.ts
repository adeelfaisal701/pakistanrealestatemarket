
import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ValidationPipe,
  BadRequestException,
  RequestMethod,
} from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';

const registrationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

const validPayload = {
  name: 'QA Synthetic',
  email: 'qa.user@example.test',
  phone: '03001234567',
  password: 'Password1',
};

function validateRegistration(payload: Record<string, unknown>) {
  return registrationPipe.transform(payload, {
    type: 'body',
    metatype: RegisterDto,
  });
}

test('accepts a valid buyer registration', async () => {
  const result = await validateRegistration({
    ...validPayload,
    role: 'buyer',
  });

  assert.ok(result instanceof RegisterDto);
});

test('rejects public agent registration', async () => {
  await assert.rejects(
    validateRegistration({
      ...validPayload,
      role: 'agent',
      agencyName: 'QA Realty',
    }),
    BadRequestException,
  );
});

test('rejects public agency registration', async () => {
  await assert.rejects(
    validateRegistration({
      ...validPayload,
      role: 'agency',
      agencyName: 'QA Realty',
    }),
    BadRequestException,
  );
});

test('rejects invalid email addresses', async () => {
  await assert.rejects(
    validateRegistration({ ...validPayload, email: 'not-an-email' }),
    BadRequestException,
  );
});

test('rejects missing required fields', async () => {
  const { name: _name, ...payload } = validPayload;

  await assert.rejects(validateRegistration(payload), BadRequestException);
});

test('rejects weak passwords', async () => {
  await assert.rejects(
    validateRegistration({ ...validPayload, password: '12345678' }),
    BadRequestException,
  );
});

test('rejects invalid phone numbers', async () => {
  await assert.rejects(
    validateRegistration({ ...validPayload, phone: 'not-a-phone' }),
    BadRequestException,
  );
});

test('rejects public registration as admin', async () => {
  await assert.rejects(
    validateRegistration({ ...validPayload, role: 'admin' }),
    BadRequestException,
  );
});

test('rejects client-supplied privilege fields', async () => {
  await assert.rejects(
    validateRegistration({ ...validPayload, isVerified: true }),
    BadRequestException,
  );
});

test('new and existing email registrations return the same generic acknowledgement', async () => {
  const createService = (existing: boolean) => {
    let created = false;
    const usersService = {
      findByEmail: async (email: string) =>
        email === 'qa.user@example.test' && existing
          ? { _id: 'existing-id' }
          : null,
      create: async () => {
        created = true;
        return { _id: 'new-id' };
      },
    };
    const service = new AuthService(
      usersService as never,
      { sign: () => 'must-not-issue-a-token' } as never,
      { get: () => undefined } as never,
    );

    return {
      service,
      wasCreated: () => created,
    };
  };

  const newAccount = createService(false);
  const existingAccount = createService(true);
  const newResponse = await newAccount.service.register({
    ...validPayload,
    email: ' QA.USER@example.test ',
  } as RegisterDto);
  const existingResponse = await existingAccount.service.register({
    ...validPayload,
    email: 'qa.user@example.test',
  } as RegisterDto);

  assert.deepEqual(newResponse, existingResponse);
  assert.deepEqual(newResponse, {
    message:
      'If registration was successful, your account is ready to use. If you already have an account, sign in with your existing password.',
  });
  assert.equal(newAccount.wasCreated(), true);
  assert.equal(existingAccount.wasCreated(), false);
});

test('a concurrent duplicate-key registration returns the same generic acknowledgement', async () => {
  const usersService = {
    findByEmail: async () => null,
    create: async () => {
      throw Object.assign(new Error('duplicate key'), { code: 11000 });
    },
  };
  const service = new AuthService(
    usersService as never,
    { sign: () => 'must-not-issue-a-token' } as never,
    { get: () => undefined } as never,
  );

  const response = await service.register(validPayload as RegisterDto);
  assert.deepEqual(response, {
    message:
      'If registration was successful, your account is ready to use. If you already have an account, sign in with your existing password.',
  });
});

test('all registration outcomes use the same default POST status', () => {
  const registrationHandler = AuthController.prototype.register;
  assert.equal(
    Reflect.getMetadata(METHOD_METADATA, registrationHandler),
    RequestMethod.POST,
  );
  assert.equal(
    Reflect.getMetadata(HTTP_CODE_METADATA, registrationHandler),
    undefined,
  );
});
