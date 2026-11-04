import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { APPROVED_INDEX_SCHEMAS } from '../src/database/migrate-schema-indexes';
import {
  SCHEMA_INDEX_MIGRATION_HISTORY,
  SCHEMA_INDEX_MIGRATION_VERSION,
  SchemaIndexMigrationError,
  resolveMigrationTarget,
  runSchemaIndexMigration,
  type MigrationModel,
} from '../src/database/schema-index-migration';

function createHarness(options: {
  existingIndexes?: Array<Record<string, unknown>>;
  duplicates?: { duplicateGroups: number; duplicateDocuments: number };
  failCreate?: boolean;
} = {}) {
  const indexes = [...(options.existingIndexes ?? [])];
  const created: Array<{ key: Record<string, unknown>; options: Record<string, unknown> }> = [];
  const history = new Map<string, Record<string, unknown>>();
  const aggregates: Array<Record<string, unknown>[]> = [];
  const collection = {
    collectionName: 'records',
    listIndexes: () => ({ toArray: async () => indexes }),
    createIndex: async (key: Record<string, unknown>, indexOptions: Record<string, unknown>) => {
      if (options.failCreate) throw Object.assign(new Error('duplicate key value leaked'), { code: 11000 });
      created.push({ key, options: indexOptions });
      indexes.push({
        key,
        name: String(indexOptions.name ?? Object.entries(key).map(([field, value]) => `${field}_${value}`).join('_')),
        ...indexOptions,
      });
      return String(indexOptions.name ?? 'generated_index');
    },
    aggregate: (pipeline: Record<string, unknown>[]) => {
      aggregates.push(pipeline);
      return {
        toArray: async () => options.duplicates?.duplicateGroups
          ? [options.duplicates]
          : [],
      };
    },
  };
  const database = {
    collection(name: string) {
      assert.equal(name, SCHEMA_INDEX_MIGRATION_HISTORY);
      return {
        findOne: async ({ _id }: { _id: string }) => history.get(_id) ?? null,
        insertOne: async (document: Record<string, unknown>) => {
          if (history.has(String(document._id))) {
            throw new Error('duplicate migration version');
          }
          history.set(String(document._id), document);
          return { acknowledged: true };
        },
      };
    },
  };
  return {
    database,
    collection,
    created,
    history,
    aggregates,
    model: (definitions: Array<[Record<string, unknown>, Record<string, unknown>]>) => ({
      modelName: 'Record',
      schema: { indexes: () => definitions },
      collection,
    }) as MigrationModel,
  };
}

test('migration creates approved schema indexes, including TTL and unique indexes', async () => {
  const harness = createHarness();
  const model = harness.model([
    [{ accountId: 1, key: 1 }, { unique: true, name: 'unique_account_key' }],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expire_records' }],
  ]);

  const result = await runSchemaIndexMigration(harness.database, [model]);

  assert.equal(result.created, 2);
  assert.equal(result.alreadyPresent, 0);
  assert.equal(harness.created[0].options.unique, true);
  assert.equal(harness.created[1].options.expireAfterSeconds, 0);
  assert.equal(harness.history.get(SCHEMA_INDEX_MIGRATION_VERSION)?.indexCount, 2);
});

test('repeated migration is safe and records the version only once', async () => {
  const harness = createHarness();
  const model = harness.model([[{ accountId: 1 }, { name: 'account_lookup' }]]);

  await runSchemaIndexMigration(harness.database, [model]);
  const repeated = await runSchemaIndexMigration(harness.database, [model]);

  assert.equal(repeated.created, 0);
  assert.equal(repeated.alreadyPresent, 1);
  assert.equal(harness.created.length, 1);
  assert.equal(harness.history.size, 1);
});

test('an equivalent existing index is reused without recreation', async () => {
  const harness = createHarness({
    existingIndexes: [{ key: { accountId: 1 }, name: 'account_lookup' }],
  });
  const result = await runSchemaIndexMigration(
    harness.database,
    [harness.model([[{ accountId: 1 }, { name: 'account_lookup' }]])],
  );

  assert.equal(result.alreadyPresent, 1);
  assert.equal(harness.created.length, 0);
});

test('conflicting same-key or same-name index definitions are reported', async () => {
  const cases = [
    [{ key: { accountId: 1 }, name: 'account_lookup', unique: true }],
    [{ key: { otherId: 1 }, name: 'account_lookup' }],
  ];
  for (const existingIndex of cases) {
    const harness = createHarness({ existingIndexes: existingIndex });
    await assert.rejects(
      runSchemaIndexMigration(
        harness.database,
        [harness.model([[{ accountId: 1 }, { name: 'account_lookup' }]])],
      ),
      (error: unknown) =>
        error instanceof SchemaIndexMigrationError && /Index conflict/.test(error.message),
    );
    assert.equal(harness.history.size, 0);
  }
});

test('duplicate records block unique-index creation without exposing key values', async () => {
  const harness = createHarness({
    duplicates: { duplicateGroups: 2, duplicateDocuments: 5 },
  });
  await assert.rejects(
    runSchemaIndexMigration(
      harness.database,
      [harness.model([[{ email: 1 }, { unique: true, name: 'unique_email' }]])],
    ),
    (error: unknown) =>
      error instanceof SchemaIndexMigrationError &&
      /2 duplicate key group/.test(error.message) &&
      !/alice|@/.test(error.message),
  );
  assert.equal(harness.created.length, 0);
  assert.equal(harness.history.size, 0);
  assert.equal(harness.aggregates[0][0] && '$group' in harness.aggregates[0][0], true);
});

test('a failed index creation does not record migration success or leak database error text', async () => {
  const harness = createHarness({ failCreate: true });
  await assert.rejects(
    runSchemaIndexMigration(
      harness.database,
      [harness.model([[{ email: 1 }, { unique: true, name: 'unique_email' }]])],
    ),
    (error: unknown) =>
      error instanceof SchemaIndexMigrationError &&
      /database error 11000/.test(error.message) &&
      !/duplicate key value leaked/.test(error.message),
  );
  assert.equal(harness.history.size, 0);
});

test('migration history versions are independently tracked', async () => {
  const harness = createHarness();
  const model = harness.model([[{ accountId: 1 }, { name: 'account_lookup' }]]);
  await runSchemaIndexMigration(harness.database, [model], 'test-index-v1');
  await runSchemaIndexMigration(harness.database, [model], 'test-index-v2');

  assert.deepEqual([...harness.history.keys()].sort(), ['test-index-v1', 'test-index-v2']);
});

test('migration allowlist covers audited indexed schemas and declared TTL definitions', () => {
  assert.equal(APPROVED_INDEX_SCHEMAS.length, 18);
  for (const entry of APPROVED_INDEX_SCHEMAS) {
    assert.ok(entry.purpose.length > 0, `${entry.modelName} needs an index purpose`);
    assert.ok(entry.schema.indexes().length > 0, `${entry.modelName} needs declared indexes`);
  }
  const ttlIndexes = APPROVED_INDEX_SCHEMAS.flatMap(({ schema }) =>
    schema.indexes().filter(([, options]) => 'expireAfterSeconds' in options),
  );
  assert.equal(ttlIndexes.length, 3);
  assert.ok(ttlIndexes.some(([, options]) => options.name === 'visitor_chat_session_expiry'));
});

test('migration requires an explicit URI and exact database confirmation', () => {
  assert.throws(
    () => resolveMigrationTarget(undefined, 'estatepro', 'development', false, false),
    /Set DB_MIGRATION_URI explicitly/,
  );
  assert.throws(
    () => resolveMigrationTarget(
      'mongodb://127.0.0.1:27017/estatepro',
      'other-database',
      'development',
      false,
      false,
    ),
    /exactly match/,
  );
  assert.throws(
    () => resolveMigrationTarget(
      'mongodb+srv://user:secret@example.invalid/estatepro',
      'estatepro',
      'production',
      true,
      false,
    ),
    /--allow-production/,
  );
  assert.throws(
    () => resolveMigrationTarget(
      'mongodb+srv://user:secret@example.invalid/estatepro',
      'estatepro',
      'development',
      false,
      false,
    ),
    /--allow-remote/,
  );
  assert.deepEqual(
    resolveMigrationTarget(
      'mongodb://127.0.0.1:27017/estatepro',
      'estatepro',
      'test',
      false,
      false,
    ),
    {
      uri: 'mongodb://127.0.0.1:27017/estatepro',
      databaseName: 'estatepro',
    },
  );
});

test('importing the explicit migration runner does not connect or run it', () => {
  const child = spawnSync(
    process.execPath,
    ['-r', 'ts-node/register', '-e', "require('./src/database/migrate-schema-indexes')"],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, '');
});
