import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import * as bcrypt from 'bcrypt';
import {
  DEMO_AGENTS,
  DEMO_PROJECTS,
  DEMO_PROPERTIES,
} from '../src/database/demo-seed/demo-seed-data';
import {
  DemoSeedError,
  assertDemoDataConsistency,
  demoAgentEmail,
  dryRunDemoSeed,
  resolveDemoSeedOptions,
  seedDemoData,
  type PlainRecord,
} from '../src/database/demo-seed/demo-seed';
import { PropertyType } from '../src/modules/properties/schemas/property.schema';
import { DevelopmentProjectStatus } from '../src/modules/projects/schemas/development-project.schema';
import { createHarness, newId } from './demo-seed-harness';

const PASSWORD = 'Local-Demo-Pass-2026';
const BASE_ENV = { ALLOW_DEMO_SEED: 'true', NODE_ENV: 'development' };

test('demo data set is internally consistent and sized as specified', () => {
  assertDemoDataConsistency();
  assert.equal(DEMO_AGENTS.length, 10);
  assert.equal(DEMO_PROPERTIES.length, 25);
  assert.equal(DEMO_PROJECTS.length, 5);
  for (const agent of DEMO_AGENTS) {
    const owned = DEMO_PROPERTIES.filter((property) => property.agentKey === agent.key).length;
    assert.ok(owned >= 2 && owned <= 3, `${agent.key} owns ${owned} properties`);
  }
  assert.deepEqual(
    DEMO_AGENTS.map(demoAgentEmail),
    ['faisal@gmail.com', ...Array.from({ length: 9 }, (_, i) => `faisal${i + 1}@gmail.com`)],
  );
  const types = new Set(DEMO_PROPERTIES.map((property) => property.propertyType));
  for (const type of [PropertyType.PLOT, PropertyType.HOUSE, PropertyType.FLAT, PropertyType.COMMERCIAL]) {
    assert.ok(types.has(type), `covers ${type}`);
  }
  const statuses = new Set(DEMO_PROJECTS.map((project) => project.status));
  assert.ok(statuses.size >= 3, 'projects use varied development statuses');
  assert.ok(statuses.has(DevelopmentProjectStatus.LAUNCHED));
});

test('dry run validates every record against the application schemas without connecting', async () => {
  const counts = await dryRunDemoSeed();
  assert.deepEqual(counts, { agents: 10, properties: 25, projects: 5 });
});

test('first run creates agents, owned properties and projects and registers every id in the manifest', async () => {
  const harness = createHarness();
  try {
    const summary = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(summary.agents, { created: 10, updated: 0, unchanged: 0 });
    assert.deepEqual(summary.properties, { created: 25, updated: 0, unchanged: 0 });
    assert.deepEqual(summary.projects, { created: 5, updated: 0, unchanged: 0 });
    assert.deepEqual(summary.advertisements, { created: 25, updated: 0, unchanged: 0 });

    const agentIds = new Set(harness.users.records.map((user) => user._id));
    for (const user of harness.users.records) {
      assert.equal(user.role, 'agent');
      assert.equal(user.accountStatus, 'active');
      assert.notEqual(user.passwordHash, PASSWORD, 'plaintext never stored');
      assert.ok(await bcrypt.compare(PASSWORD, user.passwordHash));
      for (const field of ['name', 'phone', 'agencyName', 'agencyAddress', 'city', 'avatarUrl']) {
        assert.ok(String(user[field] ?? '').trim(), `agent ${user.email} has ${field}`);
      }
      const owned = harness.properties.records.filter((property) => property.agentId === user._id);
      assert.ok(owned.length >= 2 && owned.length <= 3);
    }
    for (const property of harness.properties.records) {
      assert.ok(agentIds.has(property.agentId), 'property owned by a seeded agent');
      assert.equal(property.location.city, 'Lahore');
    }
    const verified = harness.users.records.filter((user) => user.verificationStatus === 'verified');
    assert.equal(verified.length, 10);
    assert.ok(verified.every((user) => user.isVerified === true));
    assert.ok(harness.properties.records.every((p) => p.status === 'published' && p.inventoryStatus === 'available'));
    assert.equal(harness.projects.records.length, 5);
    assert.ok(harness.projects.records.every((project) => project.isPublished === true));

    const manifestIds = new Set([...harness.manifest.entries.values()].map((entry) => `${entry.kind}:${entry.recordId}`));
    assert.equal(manifestIds.size, 65);
    for (const user of harness.users.records) assert.ok(manifestIds.has(`user:${user._id}`));
    for (const property of harness.properties.records) assert.ok(manifestIds.has(`property:${property._id}`));
    for (const project of harness.projects.records) assert.ok(manifestIds.has(`project:${project._id}`));
    for (const ad of harness.advertisements.records) assert.ok(manifestIds.has(`advertisement:${ad._id}`));
  } finally {
    await harness.connection.close();
  }
});

test('re-running is idempotent and preserves admin changes and unrelated data', async () => {
  const realUser: PlainRecord = {
    _id: newId(),
    name: 'Real Customer',
    email: 'customer@example.com',
    role: 'buyer',
    passwordHash: 'unchanged-hash',
  };
  const harness = createHarness({ users: [realUser] });
  try {
    await seedDemoData(harness.collections, PASSWORD);
    // Simulate admin actions taken while testing.
    const property = harness.properties.records[0];
    property.status = 'rejected';
    property.viewsCount = 42;
    const agent = harness.users.records.find((user) => user.email === demoAgentEmail(DEMO_AGENTS[0]))!;
    agent.accountStatus = 'suspended';
    harness.projects.records[0].isPublished = false;
    const writesBefore = harness.totalWrites();

    const second = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(second.agents, { created: 0, updated: 0, unchanged: 10 });
    assert.deepEqual(second.properties, { created: 0, updated: 0, unchanged: 25 });
    assert.deepEqual(second.projects, { created: 0, updated: 0, unchanged: 5 });
    assert.deepEqual(second.advertisements, { created: 0, updated: 0, unchanged: 25 });
    assert.equal(harness.totalWrites(), writesBefore, 'no writes on an unchanged re-run');
    assert.equal(harness.users.records.length, 11);
    assert.equal(harness.properties.records.length, 25);
    assert.equal(harness.projects.records.length, 5);
    assert.equal(harness.advertisements.records.length, 25, 'no duplicate advertisements');
    assert.equal(harness.manifest.entries.size, 65, 'manifest not duplicated');
    assert.equal(property.status, 'rejected');
    assert.equal(property.viewsCount, 42);
    assert.equal(agent.accountStatus, 'suspended');
    assert.equal(harness.projects.records[0].isPublished, false);
    assert.deepEqual(
      harness.users.records.find((user) => user.email === 'customer@example.com'),
      realUser,
    );

    const rotated = await seedDemoData(harness.collections, 'Rotated-Demo-Pass-2026');
    assert.deepEqual(rotated.agents, { created: 0, updated: 10, unchanged: 0 });
    const refreshed = harness.users.records.find((user) => user.email === demoAgentEmail(DEMO_AGENTS[0]))!;
    assert.ok(await bcrypt.compare('Rotated-Demo-Pass-2026', refreshed.passwordHash));
    assert.equal(refreshed.accountStatus, 'suspended', 'password rotation keeps admin state');
  } finally {
    await harness.connection.close();
  }
});

for (const [label, role, extra] of [
  ['an admin', 'admin', {}],
  ['a buyer', 'buyer', {}],
  ['a real agent', 'agent', { phone: '+923331234567', agencyName: 'Real Agency' }],
  ['an agent identical to the seed data but not in the manifest', 'agent', {
    phone: DEMO_AGENTS[3].phone, agencyName: DEMO_AGENTS[3].agencyName,
  }],
] as const) {
  test(`stops before any write and reports the collision when a demo email belongs to ${label}`, async () => {
    const owner: PlainRecord = {
      _id: newId(),
      name: 'Existing Account',
      email: demoAgentEmail(DEMO_AGENTS[3]),
      role,
      passwordHash: 'existing-hash',
      ...extra,
    };
    const harness = createHarness({ users: [owner] });
    try {
      await assert.rejects(
        seedDemoData(harness.collections, PASSWORD),
        (error: unknown) =>
          error instanceof DemoSeedError &&
          error.message.includes(demoAgentEmail(DEMO_AGENTS[3])) &&
          error.message.includes('No records were changed'),
      );
      assert.equal(harness.totalWrites(), 0);
      assert.equal(harness.manifest.entries.size, 0, 'nothing registered');
      assert.deepEqual(harness.users.records, [owner], 'existing account untouched');
    } finally {
      await harness.connection.close();
    }
  });
}

test('creates one published advertisement per demo listing, linked to its listing and agent', async () => {
  const harness = createHarness();
  try {
    const now = new Date('2026-11-13T12:00:00.000Z');
    await seedDemoData(harness.collections, PASSWORD, now);
    const ads = harness.advertisements.records;
    assert.equal(ads.length, 25);
    assert.equal(new Set(ads.map((ad) => ad.propertyId)).size, 25, 'one ad per listing');
    for (const ad of ads) {
      const listing = harness.properties.records.find((property) => property._id === ad.propertyId);
      assert.ok(listing, 'ad references a seeded listing');
      assert.equal(ad.agentId, listing.agentId, 'ad agent matches listing owner');
      assert.equal(ad.status, 'published');
      assert.equal(ad.publishedAt, now.toISOString());
      assert.equal(ad.approvedAt, now.toISOString());
      assert.equal(ad.submittedAt, now.toISOString());
    }
  } finally {
    await harness.connection.close();
  }
});

test('re-running over listings seeded before advertisements existed adds only the 25 ads', async () => {
  const harness = createHarness();
  try {
    await seedDemoData(harness.collections, PASSWORD);
    // Recreate the state of a database seeded by the earlier seeder version.
    harness.advertisements.records.length = 0;
    for (const [id, entry] of [...harness.manifest.entries]) {
      if (entry.kind === 'advertisement') harness.manifest.entries.delete(id);
    }
    const summary = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(summary.agents, { created: 0, updated: 0, unchanged: 10 });
    assert.deepEqual(summary.properties, { created: 0, updated: 0, unchanged: 25 });
    assert.deepEqual(summary.projects, { created: 0, updated: 0, unchanged: 5 });
    assert.deepEqual(summary.advertisements, { created: 25, updated: 0, unchanged: 0 });
    assert.equal(harness.manifest.entries.size, 65);
  } finally {
    await harness.connection.close();
  }
});

test('an advertisement on a demo listing that the seeder did not create is a collision', async () => {
  const harness = createHarness();
  try {
    await seedDemoData(harness.collections, PASSWORD);
    const ad = harness.advertisements.records[3];
    for (const [id, entry] of [...harness.manifest.entries]) {
      if (entry.kind === 'advertisement' && entry.recordId === ad._id) harness.manifest.entries.delete(id);
    }
    const before = JSON.stringify(harness.advertisements.records);
    const writes = harness.totalWrites();
    await assert.rejects(seedDemoData(harness.collections, PASSWORD), /advertisement for listing/);
    assert.equal(harness.totalWrites(), writes, 'nothing written');
    assert.equal(JSON.stringify(harness.advertisements.records), before, 'foreign advertisement untouched');
  } finally {
    await harness.connection.close();
  }
});

test('seeding never touches unrelated advertisements', async () => {
  const realAgentId = newId();
  const realPropertyId = newId();
  const realAds: PlainRecord[] = [
    { _id: newId(), propertyId: realPropertyId, agentId: realAgentId, status: 'pending_review' },
    { _id: newId(), propertyId: newId(), agentId: realAgentId, status: 'paused' },
  ];
  const harness = createHarness({ advertisements: realAds });
  try {
    await seedDemoData(harness.collections, PASSWORD);
    await seedDemoData(harness.collections, PASSWORD);
    assert.equal(harness.advertisements.records.length, 27);
    for (const realAd of realAds) {
      assert.deepEqual(harness.advertisements.records.find((ad) => ad._id === realAd._id), realAd);
    }
  } finally {
    await harness.connection.close();
  }
});

test('stops before any write when a demo project slug already exists outside the manifest', async () => {
  const project = { _id: newId(), slug: DEMO_PROJECTS[2].slug, name: 'Someone else' } as PlainRecord;
  const harness = createHarness({ projects: [project] });
  try {
    await assert.rejects(seedDemoData(harness.collections, PASSWORD), /project demo-canal-gate-business-square/);
    assert.equal(harness.totalWrites(), 0);
    assert.deepEqual(harness.projects.records, [project]);
  } finally {
    await harness.connection.close();
  }
});

test('safety guard refuses production, missing opt-in and unconfirmed targets', () => {
  const run = (env: Record<string, string>, args: string[] = []) =>
    resolveDemoSeedOptions(env as NodeJS.ProcessEnv, args);
  const valid = {
    ...BASE_ENV,
    DEMO_SEED_URI: 'mongodb://127.0.0.1:27017/ghar_safar_demo',
    DEMO_SEED_PASSWORD: PASSWORD,
  };

  for (const marker of ['NODE_ENV', 'RAILWAY_ENVIRONMENT', 'RAILWAY_ENVIRONMENT_NAME', 'VERCEL_ENV']) {
    assert.throws(
      () => run({ ...valid, [marker]: 'production' }, ['--confirm-database=ghar_safar_demo', '--allow-remote']),
      /never runs in production/,
    );
    assert.throws(() => run({ ...valid, [marker]: 'production' }, ['--dry-run']), /never runs in production/);
  }
  assert.throws(() => run({ ...valid, ALLOW_DEMO_SEED: '' }, ['--confirm-database=ghar_safar_demo']), /ALLOW_DEMO_SEED=true/);
  assert.throws(() => run({ ...valid, ALLOW_DEMO_SEED: '1' }, ['--confirm-database=ghar_safar_demo']), /ALLOW_DEMO_SEED=true/);
  assert.throws(
    () => run({ ...BASE_ENV, DEMO_SEED_PASSWORD: PASSWORD, MONGODB_URI: valid.DEMO_SEED_URI }, ['--confirm-database=ghar_safar_demo']),
    /never falls back to MONGODB_URI/,
  );
  assert.throws(() => run(valid), /--confirm-database=ghar_safar_demo/);
  assert.throws(() => run(valid, ['--confirm-database=other']), /--confirm-database=ghar_safar_demo/);
  assert.throws(
    () => run({ ...valid, DEMO_SEED_URI: 'mongodb://127.0.0.1:27017/ghar_safar_prod' }, ['--confirm-database=ghar_safar_prod']),
    /looks like a production database/,
  );
  assert.throws(
    () => run({ ...valid, DEMO_SEED_URI: 'mongodb+srv://cluster.example.net/ghar_safar_demo' }, ['--confirm-database=ghar_safar_demo']),
    /not a local database/,
  );
  assert.throws(() => run({ ...valid, DEMO_SEED_PASSWORD: 'short' }, ['--confirm-database=ghar_safar_demo']), /DEMO_SEED_PASSWORD/);
  assert.equal(
    run({ ...valid, DEMO_SEED_PASSWORD: 'eight888' }, ['--confirm-database=ghar_safar_demo']).password,
    'eight888',
    '8-character passwords are accepted, matching admin-created agents',
  );
  assert.throws(() => run(valid, ['--drop']), /Supported arguments/);

  const ok = run(valid, ['--confirm-database=ghar_safar_demo']);
  assert.equal(ok.databaseName, 'ghar_safar_demo');
  assert.equal(ok.dryRun, false);
  const remote = run(
    { ...valid, DEMO_SEED_URI: 'mongodb+srv://cluster.example.net/ghar_safar_demo' },
    ['--confirm-database=ghar_safar_demo', '--allow-remote'],
  );
  assert.equal(remote.databaseName, 'ghar_safar_demo');
  assert.deepEqual(run(BASE_ENV, ['--dry-run']), { dryRun: true });
});

test('guard error messages never echo the URI or password', () => {
  const secretUri = 'mongodb://user:s3cr3t@127.0.0.1:27017/ghar_safar_demo';
  try {
    resolveDemoSeedOptions(
      { ...BASE_ENV, DEMO_SEED_URI: secretUri, DEMO_SEED_PASSWORD: 'short' } as NodeJS.ProcessEnv,
      ['--confirm-database=ghar_safar_demo'],
    );
    assert.fail('expected refusal');
  } catch (error) {
    assert.ok(error instanceof DemoSeedError);
    assert.ok(!error.message.includes('s3cr3t'));
    assert.ok(!error.message.includes(secretUri));
    assert.ok(!error.message.includes('user:'));
  }
});
