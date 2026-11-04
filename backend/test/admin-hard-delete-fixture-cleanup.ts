import { ClientSession, Types } from 'mongoose';

type CleanupQuery<T> = {
  session(session: ClientSession): CleanupQuery<T>;
  select?(fields: string): CleanupQuery<T>;
  exec(): Promise<T>;
};

interface CleanupModel {
  find(
    filter: Record<string, unknown>,
  ): CleanupQuery<Array<{ _id: Types.ObjectId; leadId?: Types.ObjectId }>>;
  deleteMany(filter: Record<string, unknown>): CleanupQuery<unknown>;
  countDocuments(filter: Record<string, unknown>): CleanupQuery<number>;
}

export interface HardDeleteFixtureCleanupModels {
  properties: CleanupModel;
  advertisements: CleanupModel;
  conversations: CleanupModel;
  leads: CleanupModel;
  notifications: CleanupModel;
  savedProperties: CleanupModel;
  shares: CleanupModel;
  activity: CleanupModel;
}

interface CleanupConnection {
  startSession(): Promise<ClientSession>;
}

export async function cleanupHardDeleteFixtures(
  connection: CleanupConnection,
  models: HardDeleteFixtureCleanupModels,
  fixturePropertyIds: readonly string[],
  testRunId: string,
): Promise<void> {
  if (!testRunId.trim()) throw new Error('Hard-delete test run ID is required.');
  const propertyIds = [
    ...new Set(fixturePropertyIds.map((id) => id.toLowerCase())),
  ];
  if (propertyIds.length === 0) return;
  if (propertyIds.some((id) => !Types.ObjectId.isValid(id))) {
    throw new Error('Invalid hard-delete fixture property ID.');
  }

  const objectIds = propertyIds.map((id) => new Types.ObjectId(id));
  const session = await connection.startSession();
  let transactionError: unknown;
  let transactionFailed = false;
  try {
    await session.withTransaction(async () => {
      const propertyFilter = {
        testRunId,
        propertyId: { $in: objectIds },
      };
      const propertyRelationship = { propertyId: { $in: objectIds } };
      const advertisementQuery = models.advertisements.find(propertyFilter);
      advertisementQuery.select?.('_id');
      advertisementQuery.session(session);
      const advertisements = await advertisementQuery.exec();
      const advertisementIds = advertisements.map(({ _id }) => _id);
      const advertisementFilter = advertisementIds.length
        ? { advertisementId: { $in: advertisementIds } }
        : undefined;
      const conversationFilter: Record<string, unknown> = {
        testRunId,
        $or: [
          { propertyId: { $in: objectIds } },
          ...(advertisementFilter ? [advertisementFilter] : []),
        ],
      };

      const conversationQuery = models.conversations.find(conversationFilter);
      conversationQuery.select?.('_id leadId');
      conversationQuery.session(session);
      const conversations = await conversationQuery.exec();
      const conversationIds = conversations.map(({ _id }) => _id);
      const conversationLeadIds = conversations
        .map(({ leadId }) => leadId)
        .filter((id): id is Types.ObjectId => id !== undefined);

      const leadRelationships: Record<string, unknown>[] = [
        propertyRelationship,
        ...(advertisementFilter ? [advertisementFilter] : []),
        ...(conversationIds.length
          ? [{ conversationId: { $in: conversationIds } }]
          : []),
        ...(conversationLeadIds.length
          ? [{ _id: { $in: conversationLeadIds } }]
          : []),
      ];
      const leadFilter = { testRunId, $or: leadRelationships };
      const notificationRelationships: Record<string, unknown>[] = [
        propertyRelationship,
        ...(conversationIds.length
          ? [{ conversationId: { $in: conversationIds } }]
          : []),
      ];
      const notificationFilter = {
        testRunId,
        $or: notificationRelationships,
      };

      const operations = [
        models.leads.deleteMany(leadFilter),
        models.conversations.deleteMany(conversationFilter),
        models.notifications.deleteMany(notificationFilter),
        models.savedProperties.deleteMany(propertyFilter),
        models.shares.deleteMany(propertyFilter),
        models.activity.deleteMany({
          testRunId,
          entityId: {
            $in: [...propertyIds, ...advertisementIds.map(String)],
          },
        }),
        models.advertisements.deleteMany(propertyFilter),
        models.properties.deleteMany({
          testRunId,
          _id: { $in: objectIds },
        }),
      ];

      for (const operation of operations) {
        operation.session(session);
        await operation.exec();
      }
    });
  } catch (error) {
    transactionError = error;
    transactionFailed = true;
  }

  try {
    await session.endSession();
  } catch (endSessionError) {
    if (transactionFailed) {
      throw new AggregateError(
        [transactionError, endSessionError],
        'Fixture cleanup and transaction session closure both failed.',
      );
    }
    throw endSessionError;
  }
  if (transactionFailed) throw transactionError;
}

export async function verifyNoHardDeleteRunFixturesRemain(
  models: HardDeleteFixtureCleanupModels,
  testRunId: string,
): Promise<void> {
  if (!testRunId.trim()) throw new Error('Hard-delete test run ID is required.');
  const collections = [
    ['hard_delete_properties', models.properties],
    ['hard_delete_advertisements', models.advertisements],
    ['hard_delete_conversations', models.conversations],
    ['hard_delete_leads', models.leads],
    ['hard_delete_notifications', models.notifications],
    ['hard_delete_saved_properties', models.savedProperties],
    ['hard_delete_shares', models.shares],
    ['hard_delete_activity', models.activity],
  ] as const;
  const remaining = await Promise.all(
    collections.map(async ([name, model]) => ({
      name,
      count: await model.countDocuments({ testRunId }).exec(),
    })),
  );
  const leftovers = remaining.filter(({ count }) => count > 0);
  if (leftovers.length > 0) {
    throw new Error(
      `Hard-delete test fixtures remain: ${leftovers
        .map(({ name, count }) => `${name}=${count}`)
        .join(', ')}`,
    );
  }
}

export async function cleanupAndVerifyHardDeleteFixtures(
  connection: CleanupConnection,
  models: HardDeleteFixtureCleanupModels,
  fixturePropertyIds: readonly string[],
  testRunId: string,
): Promise<void> {
  let cleanupError: unknown;
  let verificationError: unknown;
  let cleanupFailed = false;
  let verificationFailed = false;
  try {
    await cleanupHardDeleteFixtures(
      connection,
      models,
      fixturePropertyIds,
      testRunId,
    );
  } catch (error) {
    cleanupError = error;
    cleanupFailed = true;
  }
  try {
    await verifyNoHardDeleteRunFixturesRemain(models, testRunId);
  } catch (error) {
    verificationError = error;
    verificationFailed = true;
  }

  if (cleanupFailed && verificationFailed) {
    throw new AggregateError(
      [cleanupError, verificationError],
      'Fixture cleanup and post-cleanup verification both failed.',
    );
  }
  if (cleanupFailed) throw cleanupError;
  if (verificationFailed) throw verificationError;
}

export async function cleanupAndCloseHardDeleteConnection(
  cleanup: () => Promise<void>,
  close: () => Promise<unknown>,
): Promise<void> {
  let cleanupError: unknown;
  let closeError: unknown;
  let cleanupFailed = false;
  let closeFailed = false;
  try {
    await cleanup();
  } catch (error) {
    cleanupError = error;
    cleanupFailed = true;
  }
  try {
    await close();
  } catch (error) {
    closeError = error;
    closeFailed = true;
  }

  if (cleanupFailed && closeFailed) {
    throw new AggregateError(
      [cleanupError, closeError],
      'Fixture cleanup and database connection closure both failed.',
    );
  }
  if (cleanupFailed) throw cleanupError;
  if (closeFailed) throw closeError;
}
