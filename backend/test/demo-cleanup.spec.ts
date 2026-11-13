import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DEMO_AGENTS, DEMO_PROJECTS } from '../src/database/demo-seed/demo-seed-data';
import { DemoSeedError, demoAgentEmail, seedDemoData, type PlainRecord } from '../src/database/demo-seed/demo-seed';
import {
  DEMO_DEPENDENCY_SPECS,
  cleanupDemoData,
  resolveDemoCleanupOptions,
} from '../src/database/demo-seed/demo-cleanup';
import { createHarness, newId, type HarnessSeed } from './demo-seed-harness';

const PASSWORD = 'Local-Demo-Pass-2026';

function unrelatedData() {
  const realAgentId = newId();
  const realPropertyId = newId();
  return {
    users: [
      { _id: realAgentId, name: 'Real Agent', email: 'real.agent@example.com', role: 'agent', passwordHash: 'h1' },
      { _id: newId(), name: 'Real Buyer', email: 'buyer@example.com', role: 'buyer', passwordHash: 'h2' },
      { _id: newId(), name: 'Admin', email: 'admin@example.com', role: 'admin', passwordHash: 'h3' },
    ] as PlainRecord[],
    properties: [{ _id: realPropertyId, title: 'Real Listing', agentId: realAgentId } as PlainRecord],
    advertisements: [
      { _id: newId(), propertyId: realPropertyId, agentId: realAgentId, status: 'published' },
      { _id: newId(), propertyId: newId(), agentId: realAgentId, status: 'pending_review' },
    ] as PlainRecord[],
    // Even a project using the demo- prefix is untouched unless the seeder created it.
    projects: [
      { _id: newId(), slug: 'real-project', name: 'Real Project' },
      { _id: newId(), slug: 'demo-someone-elses-project', name: 'Not seeded' },
    ] as PlainRecord[],
  };
}

async function seededHarness(extra: HarnessSeed = {}) {
  const base = unrelatedData();
  const harness = createHarness({
    users: [...base.users, ...(extra.users ?? [])],
    properties: [...base.properties, ...(extra.properties ?? [])],
    projects: [...base.projects, ...(extra.projects ?? [])],
    advertisements: [...base.advertisements, ...(extra.advertisements ?? [])],
    dependencies: extra.dependencies,
  });
  await seedDemoData(harness.collections, PASSWORD);
  return { harness, base };
}

const demoAgent = (harness: ReturnType<typeof createHarness>, index = 0) =>
  harness.users.records.find((user) => user.email === demoAgentEmail(DEMO_AGENTS[index]))!;
const demoListing = (harness: ReturnType<typeof createHarness>, agentIndex = 0) =>
  harness.properties.records.find((property) => property.agentId === demoAgent(harness, agentIndex)._id)!;

test('dry run reports exactly the seeded records and deletes nothing', async () => {
  const { harness } = await seededHarness();
  try {
    const writes = harness.totalWrites();
    const result = await cleanupDemoData(harness.store, { dryRun: true });
    assert.equal(result.dryRun, true);
    assert.equal(result.plan.users.length, 10);
    assert.equal(result.plan.properties.length, 25);
    assert.equal(result.plan.projects.length, 5);
    assert.equal(result.plan.advertisements.length, 25);
    assert.deepEqual(result.plan.blockers, [], 'own advertisements are not treated as dependencies');
    assert.deepEqual(result.deleted, { advertisements: 0, users: 0, properties: 0, projects: 0, manifestEntries: 0 });
    assert.equal(harness.totalWrites(), writes, 'dry run performs no writes');
    assert.equal(harness.manifest.entries.size, 65);
    assert.equal(harness.users.records.length, 13);
    assert.equal(harness.advertisements.records.length, 27);
  } finally {
    await harness.connection.close();
  }
});

test('cleanup removes only manifest records, leaves unrelated data intact, and is repeatable', async () => {
  const { harness, base } = await seededHarness();
  try {
    const result = await cleanupDemoData(harness.store, { dryRun: false });
    assert.deepEqual(result.deleted, { advertisements: 25, users: 10, properties: 25, projects: 5, manifestEntries: 65 });
    assert.deepEqual(harness.deletionOrder, ['advertisements', 'properties', 'projects', 'users'],
      'advertisements are removed before their listings');
    assert.deepEqual(harness.users.records, base.users);
    assert.deepEqual(harness.properties.records, base.properties);
    assert.deepEqual(harness.projects.records, base.projects);
    assert.deepEqual(harness.advertisements.records, base.advertisements, 'unrelated advertisements preserved');
    assert.equal(harness.manifest.entries.size, 0);

    const again = await cleanupDemoData(harness.store, { dryRun: false });
    assert.deepEqual(again.deleted, { advertisements: 0, users: 0, properties: 0, projects: 0, manifestEntries: 0 });
    assert.deepEqual(harness.users.records, base.users, 'second cleanup changes nothing');
    assert.deepEqual(harness.advertisements.records, base.advertisements);

    // Seeding again after cleanup recreates the demo set cleanly.
    const reseed = await seedDemoData(harness.collections, PASSWORD);
    assert.deepEqual(reseed.agents, { created: 10, updated: 0, unchanged: 0 });
    assert.deepEqual(reseed.properties, { created: 25, updated: 0, unchanged: 0 });
    assert.deepEqual(reseed.advertisements, { created: 25, updated: 0, unchanged: 0 });
  } finally {
    await harness.connection.close();
  }
});

const BLOCKING_SAMPLES: Record<string, (ids: { userId: string; propertyId: string; agencyName: string }) => Record<string, unknown>> = {
  Lead: ({ propertyId }) => ({ propertyId, agentId: newId(), name: 'Buyer enquiry' }),
  PropertyConversation: ({ userId }) => ({ agentId: userId, propertyId: newId() }),
  PropertyMessage: ({ userId }) => ({ senderId: userId, conversationId: newId() }),
  VisitorChatSession: ({ propertyId }) => ({ propertyId }),
  SavedProperty: ({ propertyId }) => ({ propertyId, buyerId: newId() }),
  BuyerNotification: ({ propertyId }) => ({ propertyId, buyerId: newId() }),
  PropertyAdvertisement: ({ propertyId }) => ({ propertyId, agentId: newId() }),
  PropertyLocationShare: ({ userId }) => ({ agentId: userId, propertyId: newId(), recipientId: newId() }),
  RequirementOffer: ({ userId }) => ({ agentId: userId, propertyId: newId(), requirementId: newId() }),
  ClientRequirement: ({ userId }) => ({ offeredAgentIds: [newId(), userId], buyerId: newId() }),
  UserReport: ({ propertyId }) => ({ targetId: propertyId, targetType: 'property' }),
  Agency: ({ agencyName }) => ({ normalizedName: agencyName, name: 'Agency' }),
};

test('every blocking dependency spec has a protection test sample', () => {
  const blocking = DEMO_DEPENDENCY_SPECS.filter((spec) => spec.blocking).map((spec) => spec.modelName).sort();
  assert.deepEqual(blocking, Object.keys(BLOCKING_SAMPLES).sort());
});

for (const [modelName, sample] of Object.entries(BLOCKING_SAMPLES)) {
  test(`cleanup stops and deletes nothing when demo records have ${modelName} dependencies`, async () => {
    const { harness } = await seededHarness();
    try {
      const agent = demoAgent(harness);
      const listing = demoListing(harness);
      const dependency = harness.dependencies.get(modelName)!;
      const dependencyId = newId();
      dependency.records.push({
        _id: dependencyId,
        ...sample({
          userId: agent._id,
          propertyId: listing._id,
          agencyName: String(agent.agencyName).trim().replace(/\s+/g, ' ').toLowerCase(),
        }),
      } as PlainRecord);
      const writes = harness.totalWrites();

      for (const dryRun of [true, false]) {
        await assert.rejects(
          cleanupDemoData(harness.store, { dryRun }),
          (error: unknown) =>
            error instanceof DemoSeedError &&
            /nothing was deleted/.test(error.message) &&
            error.message.includes(DEMO_DEPENDENCY_SPECS.find((s) => s.modelName === modelName)!.label),
        );
      }
      assert.equal(harness.totalWrites(), writes);
      assert.equal(harness.manifest.entries.size, 65);
      assert.ok(dependency.records.some((record) => record._id === dependencyId), 'dependency itself untouched');
    } finally {
      await harness.connection.close();
    }
  });
}

test('dependencies on unrelated records do not block cleanup', async () => {
  const { harness, base } = await seededHarness();
  try {
    harness.dependencies.get('Lead')!.records.push({
      _id: newId(), propertyId: base.properties[0]._id, agentId: base.users[0]._id,
    } as PlainRecord);
    harness.dependencies.get('SavedProperty')!.records.push({
      _id: newId(), propertyId: base.properties[0]._id, buyerId: base.users[1]._id,
    } as PlainRecord);
    const result = await cleanupDemoData(harness.store, { dryRun: false });
    assert.equal(result.deleted.users, 10);
    assert.equal(harness.dependencies.get('Lead')!.records.length, 1);
    assert.equal(harness.dependencies.get('SavedProperty')!.records.length, 1);
  } finally {
    await harness.connection.close();
  }
});

test('an advertisement on a demo listing that is not in the manifest blocks cleanup', async () => {
  const { harness } = await seededHarness();
  try {
    const ownAd = harness.advertisements.records.find((ad) => ad.propertyId === demoListing(harness)._id)!;
    for (const [id, entry] of [...harness.manifest.entries]) {
      if (entry.recordId === ownAd._id) harness.manifest.entries.delete(id);
    }
    await assert.rejects(cleanupDemoData(harness.store, { dryRun: false }), /advertisements not created by the demo seeder/);
    assert.equal(harness.advertisements.records.length, 27, 'no advertisement deleted');
    assert.equal(harness.properties.records.length, 26, 'no listing deleted');
  } finally {
    await harness.connection.close();
  }
});

test('a manifest advertisement moved off its demo listing blocks cleanup', async () => {
  const { harness, base } = await seededHarness();
  try {
    const ownAd = harness.advertisements.records.find((ad) => ad.propertyId === demoListing(harness)._id)!;
    ownAd.propertyId = base.properties[0]._id;
    await assert.rejects(cleanupDemoData(harness.store, { dryRun: true }), /no longer attached to a demo listing/);
    assert.equal(harness.advertisements.records.length, 27);
  } finally {
    await harness.connection.close();
  }
});

test('listings created through a demo agent login block cleanup', async () => {
  const { harness } = await seededHarness();
  try {
    harness.properties.records.push({ _id: newId(), title: 'Posted via demo login', agentId: demoAgent(harness, 2)._id } as PlainRecord);
    await assert.rejects(cleanupDemoData(harness.store, { dryRun: true }), /listings created through demo agent logins/);
    await assert.rejects(cleanupDemoData(harness.store, { dryRun: false }), /listings created through demo agent logins/);
    assert.equal(harness.properties.records.length, 27);
  } finally {
    await harness.connection.close();
  }
});

test('a manifest account whose email or role changed blocks cleanup', async () => {
  const { harness } = await seededHarness();
  try {
    demoAgent(harness, 4).email = 'changed@example.com';
    await assert.rejects(cleanupDemoData(harness.store, { dryRun: false }), /no longer match a demo agent/);
    assert.equal(harness.users.records.length, 13);
  } finally {
    await harness.connection.close();
  }
});

test('automatic records (analytics, notifications, audit log) are reported and left in place', async () => {
  const { harness } = await seededHarness();
  try {
    const agent = demoAgent(harness);
    const listing = demoListing(harness);
    harness.dependencies.get('PropertyAnalyticsEvent')!.records.push({ _id: newId(), propertyId: listing._id } as PlainRecord);
    harness.dependencies.get('UserNotification')!.records.push({ _id: newId(), userId: agent._id } as PlainRecord);
    harness.dependencies.get('AdminActivity')!.records.push({ _id: newId(), entityId: agent._id } as PlainRecord);
    const result = await cleanupDemoData(harness.store, { dryRun: false });
    assert.equal(result.deleted.users, 10);
    assert.equal(result.plan.retained.length, 3);
    assert.equal(harness.dependencies.get('PropertyAnalyticsEvent')!.records.length, 1);
    assert.equal(harness.dependencies.get('UserNotification')!.records.length, 1);
    assert.equal(harness.dependencies.get('AdminActivity')!.records.length, 1);
  } finally {
    await harness.connection.close();
  }
});

test('stale manifest entries (record already removed) are cleared without error', async () => {
  const { harness } = await seededHarness();
  try {
    const project = harness.projects.records.find((p) => p.slug === DEMO_PROJECTS[0].slug)!;
    harness.projects.records.splice(harness.projects.records.indexOf(project), 1);
    const result = await cleanupDemoData(harness.store, { dryRun: false });
    assert.equal(result.plan.staleEntries.length, 1);
    assert.equal(result.deleted.projects, 4);
    assert.equal(harness.manifest.entries.size, 0);
  } finally {
    await harness.connection.close();
  }
});

test('cleanup guard requires opt-in, a confirmed database and refuses production markers', () => {
  const valid = {
    ALLOW_DEMO_SEED: 'true',
    NODE_ENV: 'development',
    DEMO_SEED_URI: 'mongodb+srv://cluster.example.net/ghar_db',
  } as NodeJS.ProcessEnv;
  assert.throws(() => resolveDemoCleanupOptions(valid, ['--allow-remote']), /--confirm-database=ghar_db/);
  assert.throws(() => resolveDemoCleanupOptions(valid, ['--allow-remote', '--dry-run']), /--confirm-database=ghar_db/);
  assert.throws(() => resolveDemoCleanupOptions(valid, ['--confirm-database=ghar_db']), /not a local database/);
  assert.throws(() => resolveDemoCleanupOptions({ ...valid, ALLOW_DEMO_SEED: undefined }, ['--confirm-database=ghar_db', '--allow-remote']), /ALLOW_DEMO_SEED=true/);
  assert.throws(() => resolveDemoCleanupOptions({ ...valid, NODE_ENV: 'production' }, ['--confirm-database=ghar_db', '--allow-remote']), /production/);
  const options = resolveDemoCleanupOptions(valid, ['--confirm-database=ghar_db', '--allow-remote', '--dry-run']);
  assert.equal(options.dryRun, true);
  assert.equal(options.databaseName, 'ghar_db');
  assert.equal(
    resolveDemoCleanupOptions(valid, ['--confirm-database=ghar_db', '--allow-remote']).dryRun,
    false,
  );
});
