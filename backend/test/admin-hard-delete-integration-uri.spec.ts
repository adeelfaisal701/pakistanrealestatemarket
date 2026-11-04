import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertIsolatedHardDeleteIntegrationUri } from './admin-hard-delete-integration-uri';

const atlasHost = 'cluster0.example.mongodb.net';
const atlasUri =
  `mongodb+srv://atlas-test-user:dummy-placeholder@${atlasHost}/estatepro_hard_delete_integration_test?tls=true`;

test('allows only the dedicated local replica-set database', () => {
  assert.doesNotThrow(() =>
    assertIsolatedHardDeleteIntegrationUri(
      'mongodb://127.0.0.1:27017/estatepro_hard_delete_integration_test?replicaSet=rs0',
    ),
  );
});

test('rejects application, production, and overridden database targets', () => {
  for (const uri of [
    'mongodb://127.0.0.1:27017/pak_real_estate?replicaSet=rs0',
    'mongodb://127.0.0.1:27017/production?replicaSet=rs0',
    'mongodb://127.0.0.1:27017/prod?replicaSet=rs0',
    'mongodb://127.0.0.1:27017/estatepro_hard_delete_integration_test?replicaSet=rs0&dbName=pak_real_estate',
  ]) {
    assert.throws(() => assertIsolatedHardDeleteIntegrationUri(uri));
  }
});

test('requires explicit Atlas opt-in, exact host allowlist, and TLS', () => {
  assert.throws(() =>
    assertIsolatedHardDeleteIntegrationUri(atlasUri, {
      expectedAtlasHost: atlasHost,
    }),
  );
  assert.throws(() =>
    assertIsolatedHardDeleteIntegrationUri(atlasUri, {
      atlasOptIn: 'true',
    }),
  );
  assert.throws(() =>
    assertIsolatedHardDeleteIntegrationUri(
      atlasUri.replace('?tls=true', ''),
      { atlasOptIn: 'true', expectedAtlasHost: atlasHost },
    ),
  );
  assert.throws(() =>
    assertIsolatedHardDeleteIntegrationUri(
      atlasUri.replace(atlasHost, 'other.mongodb.net'),
      { atlasOptIn: 'true', expectedAtlasHost: atlasHost },
    ),
  );
  assert.doesNotThrow(() =>
    assertIsolatedHardDeleteIntegrationUri(atlasUri, {
      atlasOptIn: 'true',
      expectedAtlasHost: atlasHost,
    }),
  );
});

test('refuses non-loopback hosts without Atlas opt-in', () => {
  assert.throws(() =>
    assertIsolatedHardDeleteIntegrationUri(
      'mongodb://db.example.test/estatepro_hard_delete_integration_test?replicaSet=rs0',
    ),
  );
});
