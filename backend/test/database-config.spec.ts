import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import configuration from '../src/config/configuration';
import { getDatabaseConfig } from '../src/config/database.config';

test('production configuration does not fall back to local MongoDB or frontend URLs', () => {
  const keys = [
    'NODE_ENV',
    'CORS_ORIGIN',
    'JWT_SECRET',
    'MONGODB_URI',
    'FRONTEND_BASE_URL',
  ] as const;
  const originalValues = new Map(keys.map((key) => [key, process.env[key]]));

  try {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://frontend.example';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-123456';
    delete process.env.MONGODB_URI;
    process.env.FRONTEND_BASE_URL = 'https://frontend.example';
    assert.throws(configuration, /MONGODB_URI must be explicitly configured in production/);

    process.env.MONGODB_URI = 'mongodb://database.example.invalid/estate';
    delete process.env.FRONTEND_BASE_URL;
    assert.throws(configuration, /FRONTEND_BASE_URL must be explicitly configured in production/);

    process.env.MONGODB_URI = 'mongodb://127.0.0.1/estate';
    process.env.FRONTEND_BASE_URL = 'https://frontend.example';
    assert.throws(configuration, /MONGODB_URI must not use a loopback host in production/);

    process.env.MONGODB_URI = 'mongodb://database.example.invalid/estate';
    process.env.FRONTEND_BASE_URL = 'https://localhost';
    assert.throws(configuration, /FRONTEND_BASE_URL must be an HTTPS origin without a loopback host in production/);
  } finally {
    for (const [key, value] of originalValues) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('database indexes are operator-controlled in production', () => {
  const config = getDatabaseConfig({
    get: (key: string) =>
      key === 'nodeEnv' ? 'production' : 'mongodb://example.invalid/database',
  } as never);

  assert.equal(config.uri, 'mongodb://example.invalid/database');
  assert.equal(config.autoIndex, false);
});

test('database indexes remain automatic outside production', () => {
  for (const nodeEnv of ['development', 'test']) {
    const config = getDatabaseConfig({
      get: (key: string) =>
        key === 'nodeEnv' ? nodeEnv : 'mongodb://example.invalid/database',
    } as never);
    assert.equal(config.autoIndex, true, String(nodeEnv));
  }
});

test('database configuration fails closed when NODE_ENV is missing or invalid', () => {
  for (const nodeEnv of [undefined, '', 'prod', 'staging']) {
    assert.throws(
      () =>
        getDatabaseConfig({
          get: (key: string) =>
            key === 'nodeEnv' ? nodeEnv : 'mongodb://example.invalid/database',
        } as never),
      /NODE_ENV must be explicitly set/,
      String(nodeEnv),
    );
  }
});
