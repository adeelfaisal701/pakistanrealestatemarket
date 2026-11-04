import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getDatabaseConfig } from '../src/config/database.config';

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
