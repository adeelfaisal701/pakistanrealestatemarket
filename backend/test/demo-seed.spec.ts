import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import * as bcrypt from 'bcrypt';
import {
  DEMO_AGENCIES,
  DEMO_AGENTS,
  DEMO_PROJECTS,
  DEMO_PROPERTIES,
} from '../src/database/demo-seed/demo-seed-data';
import {
  DemoSeedError,
  assertDemoDataConsistency,
  demoAgentEmail,
  dryRunDemoSeed,
  normalizeDemoAgencyName,
  resolveDemoSeedOptions,
  seedDemoData,
  type PlainRecord,
} from '../src/database/demo-seed/demo-seed';
import { PropertyType } from '../src/modules/properties/schemas/property.schema';
import { DevelopmentProjectStatus } from '../src/modules/projects/schemas/development-project.schema';
import mongoose = require('mongoose');
import { PropertySchema } from '../src/modules/properties/schemas/property.schema';
import { PropertyAdvertisementSchema } from '../src/modules/properties/schemas/property-advertisement.schema';
import { createHarness, newId } from './demo-seed-harness';

/**
 * Makes reference-id lookups behave like the real database: Property.agentId
 * and PropertyAdvertisement.propertyId are Mixed paths, so a hex string never
 * matches a stored ObjectId. Records which value types the seeder queried with.
 */
function emulateMixedReferenceLookups(harness: ReturnType<typeof createHarness>) {
  const queried: unknown[] = [];
  const strictOn = (collection: { findOne: Function; findMany: Function }, field: string) => {
    const findOne = collection.findOne.bind(collection);
    const findMany = collection.findMany.bind(collection);
    const isString = (filter: Record<string, unknown>) => {
      if (field in filter) queried.push(filter[field]);
      return typeof filter[field] === 'string';
    };
    collection.findOne = async (filter: Record<string, unknown>) => (isString(filter) ? null : findOne(filter));
    collection.findMany = async (filter: Record<string, unknown>) => (isString(filter) ? [] : findMany(filter));
  };
  strictOn(harness.properties.collection, 'agentId');
  strictOn(harness.advertisements.collection, 'propertyId');
  return queried;
}

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
  assert.deepEqual(counts, { agents: 10, agencies: 4, properties: 25, projects: 5 });
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
    assert.equal(manifestIds.size, 69);
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
    assert.equal(harness.manifest.entries.size, 69, 'manifest not duplicated');
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
    assert.equal(harness.manifest.entries.size, 69);
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

test('demo agents are grouped into 4 agencies of 2-3 agents with matching names and hosted logos', () => {
  assert.equal(DEMO_AGENCIES.length, 4);
  // Must match AgenciesService/UsersService normalization exactly.
  assert.equal(normalizeDemoAgencyName('  Raza   Estates (Demo) '), 'raza estates (demo)');
  assert.deepEqual(
    DEMO_AGENCIES.map((agency) => normalizeDemoAgencyName(agency.name)),
    [
      'raza estates (demo)',
      'malik property advisors (demo)',
      'crescent realty consultants (demo)',
      'lakeview property network (demo)',
    ],
  );
  for (const agency of DEMO_AGENCIES) {
    const members = DEMO_AGENTS.filter((agent) => agent.agencyKey === agency.key);
    assert.ok(members.length >= 2 && members.length <= 3, `${agency.key} has ${members.length} agents`);
    for (const agent of members) {
      assert.equal(normalizeDemoAgencyName(agent.agencyName), normalizeDemoAgencyName(agency.name));
    }
    for (const url of [agency.logoUrl, agency.coverImageUrl]) {
      const parsed = new URL(url);
      assert.equal(parsed.origin, 'https://images.unsplash.com', 'allowed default frontend image origin');
      assert.match(parsed.pathname, /^\/photo-\d+-[0-9a-f]+$/);
    }
  }
  assert.equal(new Set(DEMO_AGENTS.map((agent) => normalizeDemoAgencyName(agent.agencyName))).size, 4);
});

test('first run creates 4 active agency profiles with logos, tracked in the manifest', async () => {
  const harness = createHarness();
  try {
    const summary = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(summary.agencies, { created: 4, updated: 0, unchanged: 0 });
    const agencies = harness.agencies.records;
    assert.equal(agencies.length, 4);
    const manifestIds = new Set([...harness.manifest.entries.values()].map((e) => `${e.kind}:${e.recordId}`));
    for (const agency of agencies) {
      assert.ok(manifestIds.has(`agency:${agency._id}`), 'agency tracked in manifest');
      assert.equal(agency.status, 'active');
      assert.equal(agency.city, 'Lahore');
      assert.ok(String(agency.logoUrl).startsWith('https://images.unsplash.com/'));
      assert.ok(String(agency.coverImageUrl).startsWith('https://images.unsplash.com/'));
      assert.equal(agency.normalizedName, normalizeDemoAgencyName(agency.name));
      // Public agency endpoints match agents by trimmed, case-insensitive agencyName.
      const members = harness.users.records.filter(
        (user) => normalizeDemoAgencyName(user.agencyName) === agency.normalizedName,
      );
      assert.ok(members.length >= 2 && members.length <= 3, `${agency.name} has ${members.length} agents`);
    }
    const covered = harness.users.records.filter((user) =>
      agencies.some((agency) => agency.normalizedName === normalizeDemoAgencyName(user.agencyName)),
    );
    assert.equal(covered.length, 10, 'every demo agent belongs to a seeded agency profile');
  } finally {
    await harness.connection.close();
  }
});

test('agency re-runs are idempotent and keep agent/admin edits to agency profiles', async () => {
  const harness = createHarness();
  try {
    await seedDemoData(harness.collections, PASSWORD);
    const agency = harness.agencies.records[0];
    agency.status = 'suspended';
    agency.logoUrl = '/api/v1/properties/images/uploaded-by-agent.webp';
    agency.description = 'Edited by the agency manager';
    const writes = harness.totalWrites();
    const second = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(second.agencies, { created: 0, updated: 0, unchanged: 4 });
    assert.equal(harness.totalWrites(), writes, 'no writes on re-run');
    assert.equal(harness.agencies.records.length, 4, 'no duplicate agencies');
    assert.equal(agency.status, 'suspended');
    assert.equal(agency.logoUrl, '/api/v1/properties/images/uploaded-by-agent.webp');
    assert.equal(agency.description, 'Edited by the agency manager');
  } finally {
    await harness.connection.close();
  }
});

test('re-running over agents seeded with the earlier per-agent agency names regroups them', async () => {
  const harness = createHarness();
  try {
    await seedDemoData(harness.collections, PASSWORD);
    // Recreate the earlier seeder state: per-agent agency names, no Agency docs.
    const agent = harness.users.records.find((user) => user.email === demoAgentEmail(DEMO_AGENTS[6]))!;
    agent.agencyName = 'Haider Estate Consultants (Demo)';
    harness.agencies.records.length = 0;
    for (const [id, entry] of [...harness.manifest.entries]) {
      if (entry.kind === 'agency') harness.manifest.entries.delete(id);
    }
    const summary = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(summary.agents, { created: 0, updated: 1, unchanged: 9 });
    assert.deepEqual(summary.agencies, { created: 4, updated: 0, unchanged: 0 });
    const refreshed = harness.users.records.find((user) => user.email === demoAgentEmail(DEMO_AGENTS[6]))!;
    assert.equal(refreshed.agencyName, DEMO_AGENTS[6].agencyName);
    assert.equal(harness.manifest.entries.size, 69);
  } finally {
    await harness.connection.close();
  }
});

test('an agency profile with a demo agency name that the seeder did not create is a collision', async () => {
  const foreign: PlainRecord = {
    _id: newId(),
    name: DEMO_AGENCIES[2].name,
    normalizedName: normalizeDemoAgencyName(DEMO_AGENCIES[2].name),
    status: 'active',
    galleryUrls: [],
  };
  const harness = createHarness({ agencies: [foreign] });
  try {
    await assert.rejects(
      seedDemoData(harness.collections, PASSWORD),
      (error: unknown) =>
        error instanceof DemoSeedError &&
        error.message.includes(`agency profile "${DEMO_AGENCIES[2].name}"`) &&
        error.message.includes('No records were changed'),
    );
    assert.equal(harness.totalWrites(), 0);
    assert.equal(harness.manifest.entries.size, 0);
    assert.deepEqual(harness.agencies.records, [foreign], 'existing agency untouched');
  } finally {
    await harness.connection.close();
  }
});

test('regression: the reference paths the seeder looks up are Mixed, so strings are not cast', () => {
  // Documents the real-database behaviour behind the duplicate-listing bug.
  assert.equal(PropertySchema.path('agentId').instance, 'Mixed');
  assert.equal(PropertyAdvertisementSchema.path('propertyId').instance, 'Mixed');
});

test('regression: re-running against ObjectId-typed references never duplicates listings or ads', async () => {
  const harness = createHarness();
  const queried = emulateMixedReferenceLookups(harness);
  try {
    await seedDemoData(harness.collections, PASSWORD);
    const writes = harness.totalWrites();
    queried.length = 0;
    const second = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(second.properties, { created: 0, updated: 0, unchanged: 25 });
    assert.deepEqual(second.advertisements, { created: 0, updated: 0, unchanged: 25 });
    assert.equal(harness.properties.records.length, 25, 'no duplicate listings');
    assert.equal(harness.advertisements.records.length, 25, 'no duplicate advertisements');
    assert.equal(harness.manifest.entries.size, 69);
    assert.equal(harness.totalWrites(), writes, 'no writes on re-run');
    assert.equal(queried.length, 50, 'one listing and one advertisement lookup per demo property');
    assert.ok(
      queried.every((value) => value instanceof mongoose.Types.ObjectId),
      'reference ids are queried as real ObjectIds',
    );
  } finally {
    await harness.connection.close();
  }
});

test('regression: duplicate demo listings for one agent stop the seeder before any write', async () => {
  const harness = createHarness();
  try {
    await seedDemoData(harness.collections, PASSWORD);
    // Recreate the production state: a second manifest-owned copy of a listing.
    const original = harness.properties.records[0];
    const copy = { ...original, _id: newId() };
    harness.properties.records.push(copy);
    await harness.manifest.manifest.add({ kind: 'property', recordId: copy._id, seedKey: 'copy' });
    const writes = harness.totalWrites();
    const manifestSize = harness.manifest.entries.size;
    await assert.rejects(
      seedDemoData(harness.collections, PASSWORD),
      (error: unknown) =>
        error instanceof DemoSeedError &&
        error.message.includes(`2 listings titled "${original.title}"`) &&
        error.message.includes('No records were changed'),
    );
    assert.equal(harness.totalWrites(), writes, 'nothing written');
    assert.equal(harness.manifest.entries.size, manifestSize, 'manifest unchanged');
    assert.equal(harness.properties.records.length, 26);
  } finally {
    await harness.connection.close();
  }
});

test('seeding never touches unrelated agency profiles', async () => {
  const realAgency: PlainRecord = {
    _id: newId(), name: 'Real Agency', normalizedName: 'real agency', status: 'active',
    logoUrl: '/api/v1/properties/images/real.webp', galleryUrls: [],
  };
  const harness = createHarness({ agencies: [realAgency] });
  try {
    await seedDemoData(harness.collections, PASSWORD);
    await seedDemoData(harness.collections, PASSWORD);
    assert.equal(harness.agencies.records.length, 5);
    assert.deepEqual(harness.agencies.records.find((a) => a._id === realAgency._id), realAgency);
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
