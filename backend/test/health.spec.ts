import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../src/modules/health/health.controller';
import {
  DATABASE_HEALTH_TIMEOUT_MS,
  HealthService,
} from '../src/modules/health/health.service';

function createHealthService(
  readyState: number,
  command: () => Promise<unknown>,
) {
  return new HealthService({
    readyState,
    db: { admin: () => ({ command }) },
  } as never);
}

test('database readiness succeeds only when MongoDB responds to ping', async () => {
  const service = createHealthService(1, async () => ({ ok: 1 }));
  assert.equal(await service.isDatabaseReady(), true);
});

test('database readiness fails when the connection is unavailable or ping fails', async () => {
  const disconnected = createHealthService(0, async () => ({ ok: 1 }));
  const failedPing = createHealthService(1, async () => {
    throw new Error('private database connection detail');
  });

  assert.equal(await disconnected.isDatabaseReady(), false);
  assert.equal(await failedPing.isDatabaseReady(), false);
});

test('database readiness is bounded by the configured timeout', async () => {
  const service = createHealthService(1, () => new Promise(() => undefined));
  const startedAt = Date.now();

  assert.equal(await service.isDatabaseReady(), false);
  assert.ok(Date.now() - startedAt < DATABASE_HEALTH_TIMEOUT_MS + 500);
});

test('liveness does not depend on MongoDB and readiness returns 503 when database is down', async () => {
  const controller = new HealthController(
    createHealthService(0, async () => ({ ok: 1 })),
  );
  assert.deepEqual(controller.getLiveness(), { status: 'ok' });

  await assert.rejects(
    controller.getReadiness(),
    (error: unknown) =>
      error instanceof ServiceUnavailableException &&
      error.getStatus() === 503 &&
      JSON.stringify(error.getResponse()).includes('"database":"unavailable"'),
  );
});
