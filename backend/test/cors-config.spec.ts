import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  createCorsPolicy,
  createPrivateNetworkCorsMiddleware,
} from '../src/config/cors.config';

function decideOrigin(
  policy: ReturnType<typeof createCorsPolicy>,
  origin: string | undefined,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    policy.origin(origin, (error, allowed) => {
      if (error) reject(error);
      else resolve(Boolean(allowed));
    });
  });
}

test('production CORS allows only explicitly configured HTTPS origins without credentials', async () => {
  const policy = createCorsPolicy(
    'production',
    'https://estate.example,https://admin.estate.example',
  );
  assert.equal(await decideOrigin(policy, 'https://estate.example'), true);
  assert.equal(await decideOrigin(policy, 'https://admin.estate.example'), true);
  assert.equal(await decideOrigin(policy, 'https://unlisted.example'), false);
  assert.equal(policy.credentials, false);
  assert.deepEqual(policy.methods, ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
  assert.ok(policy.allowedHeaders.includes('Authorization'));
  assert.ok(policy.allowedHeaders.includes('X-Visitor-Session'));
});

test('production CORS rejects missing, wildcard, malformed, and localhost allowlists', () => {
  for (const configured of [
    undefined,
    '',
    '*',
    'https://estate.example/path',
    'http://estate.example',
    'http://localhost:3000',
    'https://admin.localhost',
    'http://127.0.0.1:3000',
  ]) {
    assert.throws(() => createCorsPolicy('production', configured), undefined, String(configured));
  }
});

test('development CORS uses only development origins and never reflects arbitrary origins', async () => {
  const policy = createCorsPolicy('development', undefined);
  assert.equal(await decideOrigin(policy, 'http://localhost:3000'), true);
  assert.equal(await decideOrigin(policy, 'http://admin.localhost:3000'), true);
  assert.equal(await decideOrigin(policy, 'https://attacker.example'), false);
  assert.equal(await decideOrigin(policy, undefined), false);
});

test('non-development environments cannot configure localhost origins', () => {
  assert.throws(
    () => createCorsPolicy('test', 'http://localhost:3000'),
    /Local HTTP CORS origins are allowed only in development/,
  );
});

test('missing Origin requests remain usable without adding CORS headers', async () => {
  const policy = createCorsPolicy('production', 'https://estate.example');
  assert.equal(await decideOrigin(policy, undefined), false);
  assert.equal(await decideOrigin(policy, 'https://not-listed.example'), false);
});

test('private-network permission is limited to verified development preflights', () => {
  const origins = ['http://localhost:3000', 'http://admin.localhost:3000'];
  const middleware = createPrivateNetworkCorsMiddleware('development', origins);
  const makeRequest = (method: string, origin?: string, privateNetwork?: string) => ({
    method,
    get(name: string) {
      if (name === 'origin') return origin;
      if (name === 'access-control-request-private-network') return privateNetwork;
      return undefined;
    },
  });
  const run = (request: ReturnType<typeof makeRequest>) => {
    let header: unknown;
    let continued = false;
    middleware(
      request as never,
      { setHeader: (_name: string, value: string) => { header = value; } } as never,
      () => { continued = true; },
    );
    assert.equal(continued, true);
    return header;
  };

  assert.equal(run(makeRequest('OPTIONS', 'http://admin.localhost:3000', 'true')), 'true');
  assert.equal(run(makeRequest('OPTIONS', 'https://attacker.example', 'true')), undefined);
  assert.equal(run(makeRequest('GET', 'http://localhost:3000', 'true')), undefined);
  const productionMiddleware = createPrivateNetworkCorsMiddleware('production', origins);
  let productionHeaderSet = false;
  productionMiddleware(
    makeRequest('OPTIONS', 'http://localhost:3000', 'true') as never,
    { setHeader: () => { productionHeaderSet = true; } } as never,
    () => undefined,
  );
  assert.equal(productionHeaderSet, false);
});
