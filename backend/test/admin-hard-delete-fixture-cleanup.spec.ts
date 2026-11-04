import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ClientSession, Types } from 'mongoose';
import {
  cleanupAndCloseHardDeleteConnection,
  cleanupAndVerifyHardDeleteFixtures,
  cleanupHardDeleteFixtures,
  HardDeleteFixtureCleanupModels,
  verifyNoHardDeleteRunFixturesRemain,
} from './admin-hard-delete-fixture-cleanup';

const testRunId = 'run-current';

function makeHarness(options: {
  failCollection?: string;
  remainingRunCounts?: Record<string, number>;
  conversations?: Array<{
    _id: Types.ObjectId;
    leadId?: Types.ObjectId;
  }>;
} = {}) {
  const propertyIds = [new Types.ObjectId(), new Types.ObjectId()];
  const advertisementIds = [new Types.ObjectId()];
  const remainingRunCounts = { ...options.remainingRunCounts };
  const calls: Array<{
    collection: string;
    filter: Record<string, unknown>;
    session?: ClientSession;
  }> = [];
  let endedSession = false;
  const transactionSession = {
    withTransaction: async (callback: () => Promise<void>) => callback(),
    async endSession() {
      endedSession = true;
    },
  } as unknown as ClientSession;
  const model = (
    collection: string,
    findResult: Array<{ _id: Types.ObjectId; leadId?: Types.ObjectId }> = [],
  ) => ({
    find(filter: Record<string, unknown>) {
      const call = { collection: `${collection}:find`, filter } as {
        collection: string;
        filter: Record<string, unknown>;
        session?: ClientSession;
      };
      calls.push(call);
      let activeSession: ClientSession | undefined;
      const query = {
        select() {
          return query;
        },
        session(value: ClientSession) {
          activeSession = value;
          return query;
        },
        async exec() {
          call.session = activeSession;
          return findResult;
        },
      };
      return query;
    },
    deleteMany(filter: Record<string, unknown>) {
      const call = { collection, filter } as {
        collection: string;
        filter: Record<string, unknown>;
        session?: ClientSession;
      };
      calls.push(call);
      let activeSession: ClientSession | undefined;
      const query = {
        session(value: ClientSession) {
          activeSession = value;
          return query;
        },
        async exec() {
          call.session = activeSession;
          if (options.failCollection === collection) {
            throw new Error(`${collection} cleanup failed`);
          }
          if (filter.testRunId === testRunId) {
            const countCollectionNames: Record<string, string> = {
              properties: 'hard_delete_properties',
              advertisements: 'hard_delete_advertisements',
              conversations: 'hard_delete_conversations',
              leads: 'hard_delete_leads',
              notifications: 'hard_delete_notifications',
              'saved-properties': 'hard_delete_saved_properties',
              shares: 'hard_delete_shares',
              activity: 'hard_delete_activity',
            };
            const countCollection = countCollectionNames[collection];
            if (countCollection) remainingRunCounts[countCollection] = 0;
          }
          return { deletedCount: 1 };
        },
      };
      return query;
    },
    countDocuments(filter: Record<string, unknown>) {
      const countCollectionNames: Record<string, string> = {
        properties: 'hard_delete_properties',
        advertisements: 'hard_delete_advertisements',
        conversations: 'hard_delete_conversations',
        leads: 'hard_delete_leads',
        notifications: 'hard_delete_notifications',
        'saved-properties': 'hard_delete_saved_properties',
        shares: 'hard_delete_shares',
        activity: 'hard_delete_activity',
      };
      const countCollection = countCollectionNames[collection];
      const call = { collection: `${countCollection}:count`, filter } as {
        collection: string;
        filter: Record<string, unknown>;
      };
      calls.push(call);
      return {
        async exec() {
          return remainingRunCounts[countCollection] ?? 0;
        },
      };
    },
  });
  const models = {
    properties: model('properties'),
    advertisements: model('advertisements', [{ _id: advertisementIds[0] }]),
    conversations: model(
      'conversations',
      options.conversations ?? [],
    ),
    leads: model('leads'),
    notifications: model('notifications'),
    savedProperties: model('saved-properties'),
    shares: model('shares'),
    activity: model('activity'),
  } as unknown as HardDeleteFixtureCleanupModels;
  const connection = {
    async startSession() {
      return transactionSession;
    },
  };
  return {
    propertyIds,
    advertisementIds,
    calls,
    connection,
    models,
    endedSession: () => endedSession,
    session: transactionSession,
  };
}

test('fixture cleanup scopes related records and collects conversation IDs before leads', async () => {
  const conversationId = new Types.ObjectId();
  const conversationLeadId = new Types.ObjectId();
  const harness = makeHarness({
    conversations: [{ _id: conversationId, leadId: conversationLeadId }],
  });
  await cleanupHardDeleteFixtures(
    harness.connection,
    harness.models,
    harness.propertyIds.map(String),
    testRunId,
  );

  const objectIds = harness.propertyIds;
  const propertyFilter = { testRunId, propertyId: { $in: objectIds } };
  const propertyRelationship = { propertyId: { $in: objectIds } };
  const relatedFilter = {
    testRunId,
    $or: [
      propertyRelationship,
      { advertisementId: { $in: harness.advertisementIds } },
    ],
  };
  assert.deepEqual(harness.calls.map(({ collection }) => collection), [
    'advertisements:find',
    'conversations:find',
    'leads',
    'conversations',
    'notifications',
    'saved-properties',
    'shares',
    'activity',
    'advertisements',
    'properties',
  ]);
  assert.deepEqual(harness.calls[0].filter, propertyFilter);
  assert.deepEqual(harness.calls[1].filter, relatedFilter);
  assert.deepEqual(harness.calls[2].filter, {
    $or: [
      propertyRelationship,
      { advertisementId: { $in: harness.advertisementIds } },
      { conversationId: { $in: [conversationId] } },
      { _id: { $in: [conversationLeadId] } },
    ],
    testRunId,
  });
  assert.deepEqual(harness.calls[3].filter, relatedFilter);
  assert.deepEqual(harness.calls[4].filter, {
    testRunId,
    $or: [
      propertyRelationship,
      { conversationId: { $in: [conversationId] } },
    ],
  });
  assert.deepEqual(harness.calls[5].filter, propertyFilter);
  assert.deepEqual(harness.calls[6].filter, propertyFilter);
  assert.deepEqual(harness.calls[7].filter, {
    entityId: {
      $in: [
        ...harness.propertyIds.map(String),
        ...harness.advertisementIds.map(String),
      ],
    },
    testRunId,
  });
  assert.deepEqual(harness.calls[8].filter, propertyFilter);
  assert.deepEqual(harness.calls[9].filter, {
    testRunId,
    _id: { $in: objectIds },
  });
  assert.ok(harness.calls.every((call) => call.session === harness.session));
  assert.ok(
    harness.calls.findIndex(({ collection }) => collection === 'conversations:find') <
      harness.calls.findIndex(({ collection }) => collection === 'leads'),
  );
  assert.equal(harness.endedSession(), true);
});

test('a lead linked only by conversationId is included in the lead cleanup filter', async () => {
  const conversationId = new Types.ObjectId();
  const harness = makeHarness({
    conversations: [{ _id: conversationId }],
  });

  await cleanupHardDeleteFixtures(
    harness.connection,
    harness.models,
    harness.propertyIds.map(String),
    testRunId,
  );

  const leadCleanup = harness.calls.find(({ collection }) => collection === 'leads');
  assert.ok(leadCleanup);
  assert.deepEqual(leadCleanup.filter, {
    testRunId,
    $or: [
      { propertyId: { $in: harness.propertyIds } },
      { advertisementId: { $in: harness.advertisementIds } },
      { conversationId: { $in: [conversationId] } },
    ],
  });
});

test('every cleanup query uses the transaction session', async () => {
  const harness = makeHarness({
    conversations: [{ _id: new Types.ObjectId() }],
  });

  await cleanupHardDeleteFixtures(
    harness.connection,
    harness.models,
    harness.propertyIds.map(String),
    testRunId,
  );

  assert.ok(harness.calls.length > 0);
  assert.ok(harness.calls.every((call) => call.session === harness.session));
});

test('notification cleanup includes conversation-only and property-linked records', async () => {
  const conversationId = new Types.ObjectId();
  const harness = makeHarness({
    conversations: [{ _id: conversationId }],
  });

  await cleanupHardDeleteFixtures(
    harness.connection,
    harness.models,
    harness.propertyIds.map(String),
    testRunId,
  );

  const notificationCleanup = harness.calls.find(
    ({ collection }) => collection === 'notifications',
  );
  assert.ok(notificationCleanup);
  assert.deepEqual(notificationCleanup.filter, {
    testRunId,
    $or: [
      { propertyId: { $in: harness.propertyIds } },
      { conversationId: { $in: [conversationId] } },
    ],
  });
  assert.equal(notificationCleanup.session, harness.session);
});

test('notification cleanup omits the conversation filter when there are no fixture conversations', async () => {
  const harness = makeHarness({ conversations: [] });

  await cleanupHardDeleteFixtures(
    harness.connection,
    harness.models,
    harness.propertyIds.map(String),
    testRunId,
  );

  const notificationCleanup = harness.calls.find(
    ({ collection }) => collection === 'notifications',
  );
  assert.ok(notificationCleanup);
  assert.deepEqual(notificationCleanup.filter, {
    testRunId,
    $or: [{ propertyId: { $in: harness.propertyIds } }],
  });
  assert.equal(notificationCleanup.session, harness.session);
});

test('fixture cleanup propagates database write errors', async () => {
  const harness = makeHarness({ failCollection: 'shares' });
  await assert.rejects(
    cleanupHardDeleteFixtures(
      harness.connection,
      harness.models,
      harness.propertyIds.map(String),
      testRunId,
    ),
    /shares cleanup failed/,
  );
  assert.equal(harness.endedSession(), true);
});

test('connection closes after cleanup failure and preserves both failures', async () => {
  const cleanupError = new Error('cleanup failed');
  const closeError = new Error('close failed');
  let closed = false;

  await assert.rejects(
    cleanupAndCloseHardDeleteConnection(
      async () => {
        throw cleanupError;
      },
      async () => {
        closed = true;
        throw closeError;
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(error.errors, [cleanupError, closeError]);
      return true;
    },
  );
  assert.equal(closed, true);
});

test('fixture cleanup does nothing for an empty fixture list', async () => {
  const harness = makeHarness();
  await cleanupHardDeleteFixtures(
    harness.connection,
    harness.models,
    [],
    testRunId,
  );
  assert.deepEqual(harness.calls, []);
  assert.equal(harness.endedSession(), false);
});

test('fixture cleanup rejects invalid IDs without opening a session', async () => {
  const harness = makeHarness();
  await assert.rejects(
    cleanupHardDeleteFixtures(
      harness.connection,
      harness.models,
      ['not-an-object-id'],
      testRunId,
    ),
    /Invalid hard-delete fixture property ID/,
  );
  assert.deepEqual(harness.calls, []);
  assert.equal(harness.endedSession(), false);
});

test('current-run fixtures verify removed after scoped cleanup', async () => {
  const collectionNames = [
    'hard_delete_properties',
    'hard_delete_advertisements',
    'hard_delete_conversations',
    'hard_delete_leads',
    'hard_delete_notifications',
    'hard_delete_saved_properties',
    'hard_delete_shares',
    'hard_delete_activity',
  ];
  const harness = makeHarness({
    remainingRunCounts: Object.fromEntries(
      collectionNames.map((name) => [name, 1]),
    ),
    conversations: [{ _id: new Types.ObjectId() }],
  });

  await cleanupAndVerifyHardDeleteFixtures(
    harness.connection,
    harness.models,
    harness.propertyIds.map(String),
    testRunId,
  );

  const verificationCalls = harness.calls.filter(({ collection }) =>
    collection.endsWith(':count'),
  );
  assert.equal(verificationCalls.length, 8);
  assert.ok(
    verificationCalls.every(
      ({ filter }) => filter.testRunId === testRunId,
    ),
  );
});

test('leftover current-run fixtures fail verification with collection and count', async () => {
  const harness = makeHarness({
    remainingRunCounts: {
      hard_delete_notifications: 2,
      hard_delete_activity: 1,
    },
  });

  await assert.rejects(
    verifyNoHardDeleteRunFixturesRemain(harness.models, testRunId),
    /hard_delete_notifications=2, hard_delete_activity=1/,
  );
  assert.equal(
    harness.calls.filter(({ collection }) => collection.endsWith(':count')).length,
    8,
  );
  assert.ok(
    harness.calls
      .filter(({ collection }) => collection.endsWith(':count'))
      .every(({ filter }) => filter.testRunId === testRunId),
  );
});

test('cleanup deletes only the current run marker, preserving other-run documents', async () => {
  const harness = makeHarness();
  await cleanupHardDeleteFixtures(
    harness.connection,
    harness.models,
    harness.propertyIds.map(String),
    testRunId,
  );

  const deleteCalls = harness.calls.filter(
    ({ collection }) => !collection.endsWith(':find'),
  );
  assert.ok(deleteCalls.length > 0);
  assert.ok(deleteCalls.every(({ filter }) => filter.testRunId === testRunId));
  const otherRunDocument = { testRunId: 'run-other' };
  assert.ok(
    deleteCalls.every(({ filter }) => filter.testRunId !== otherRunDocument.testRunId),
  );
});

test('empty fixture IDs skip deletion and still allow exact-run verification', async () => {
  const harness = makeHarness();
  await cleanupAndVerifyHardDeleteFixtures(
    harness.connection,
    harness.models,
    [],
    testRunId,
  );

  assert.equal(harness.calls.filter(({ collection }) =>
    collection.endsWith(':count'),
  ).length, 8);
  assert.equal(harness.calls.filter(({ collection }) =>
    !collection.endsWith(':count'),
  ).length, 0);
  assert.equal(harness.endedSession(), false);
});
