import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose, { ClientSession, Connection, Schema, Types } from 'mongoose';
import { AdminService } from '../src/modules/admin/admin.service';
import {
  cleanupAndCloseHardDeleteConnection,
  cleanupAndVerifyHardDeleteFixtures,
  HardDeleteFixtureCleanupModels,
} from './admin-hard-delete-fixture-cleanup';
import { assertIsolatedHardDeleteIntegrationUri } from './admin-hard-delete-integration-uri';

const replicaSetUri = process.env.MONGODB_HARD_DELETE_TEST_URI;

function failAfterWrite<T>(
  query: {
    session(session: ClientSession): unknown;
    exec(): Promise<T>;
  },
  stage: string,
  failureStage: { value: string | undefined },
) {
  return {
    session(session: ClientSession) {
      query.session(session);
      return this;
    },
    async exec() {
      const result = await query.exec();
      if (failureStage.value === stage) {
        throw new Error(`Injected post-write failure: ${stage}`);
      }
      return result;
    },
  };
}

test(
  'MongoDB hard-delete rolls back each write failure, including expired shares',
  { skip: !replicaSetUri },
  async () => {
    const testRunId = randomUUID();
    assertIsolatedHardDeleteIntegrationUri(replicaSetUri!, {
      atlasOptIn: process.env.ALLOW_ATLAS_HARD_DELETE_INTEGRATION,
      expectedAtlasHost: process.env.MONGODB_HARD_DELETE_TEST_ATLAS_HOST,
    });
    let connection: Connection;
    try {
      connection = await mongoose.createConnection(replicaSetUri!, {
        autoIndex: false,
        serverSelectionTimeoutMS: 3000,
      })
      .asPromise();
    } catch {
      throw new Error(
        'Could not connect to the designated hard-delete integration database. Check the local replica set or opted-in Atlas test configuration.',
      );
    }

    const fixturePropertyIds: string[] = [];
    let cleanupModels: HardDeleteFixtureCleanupModels | undefined;
    try {
      const propertyModel = connection.model(
        'HardDeleteIntegrationProperty',
        new Schema(
          {
            agentArchived: Boolean,
            adminRemoved: Boolean,
            status: String,
            images: [String],
            testRunId: String,
          },
          { collection: 'hard_delete_properties' },
        ),
      );
      const advertisementModel = connection.model(
        'HardDeleteIntegrationAdvertisement',
        new Schema(
          { propertyId: Schema.Types.ObjectId, testRunId: String },
          { collection: 'hard_delete_advertisements' },
        ),
      );
      const leadModel = connection.model(
        'HardDeleteIntegrationLead',
        new Schema(
          {
            propertyId: Schema.Types.ObjectId,
            advertisementId: Schema.Types.ObjectId,
            conversationId: Schema.Types.ObjectId,
            testRunId: String,
          },
          { collection: 'hard_delete_leads' },
        ),
      );
      const conversationModel = connection.model(
        'HardDeleteIntegrationConversation',
        new Schema(
          {
            propertyId: Schema.Types.ObjectId,
            advertisementId: Schema.Types.ObjectId,
            leadId: Schema.Types.ObjectId,
            testRunId: String,
          },
          { collection: 'hard_delete_conversations' },
        ),
      );
      const savedPropertyModel = connection.model(
        'HardDeleteIntegrationSavedProperty',
        new Schema(
          { propertyId: Schema.Types.ObjectId, testRunId: String },
          { collection: 'hard_delete_saved_properties' },
        ),
      );
      const notificationModel = connection.model(
        'HardDeleteIntegrationNotification',
        new Schema(
          {
            propertyId: Schema.Types.ObjectId,
            conversationId: Schema.Types.ObjectId,
            testRunId: String,
          },
          { collection: 'hard_delete_notifications' },
        ),
      );
      const shareModel = connection.model(
        'HardDeleteIntegrationShare',
        new Schema(
          {
            propertyId: Schema.Types.ObjectId,
            revokedAt: Date,
            expiresAt: Date,
            testRunId: String,
          },
          { collection: 'hard_delete_shares' },
        ),
      );
      const activityModel = connection.model(
        'HardDeleteIntegrationActivity',
        new Schema(
          {
            adminId: Schema.Types.ObjectId,
            actionType: String,
            entityType: String,
            entityId: String,
            reason: String,
            testRunId: String,
          },
          { collection: 'hard_delete_activity' },
        ),
      );
      cleanupModels = {
        properties: propertyModel,
        advertisements: advertisementModel,
        conversations: conversationModel,
        leads: leadModel,
        notifications: notificationModel,
        savedProperties: savedPropertyModel,
        shares: shareModel,
        activity: activityModel,
      } as unknown as HardDeleteFixtureCleanupModels;
      const failureStage: { value: string | undefined } = { value: undefined };
      const wrappedPropertyModel = {
        findById: propertyModel.findById.bind(propertyModel),
        deleteOne: (filter: Record<string, unknown>) =>
          failAfterWrite(
            propertyModel.deleteOne(filter),
            'property',
            failureStage,
          ),
      };
      const wrappedAdvertisementModel = {
        find: advertisementModel.find.bind(advertisementModel),
        deleteOne: (filter: Record<string, unknown>) =>
          failAfterWrite(
            advertisementModel.deleteOne(filter),
            'advertisement',
            failureStage,
          ),
      };
      const wrappedSavedPropertyModel = {
        deleteMany: (filter: Record<string, unknown>) =>
          failAfterWrite(
            savedPropertyModel.deleteMany(filter),
            'saved-properties',
            failureStage,
          ),
      };
      const wrappedNotificationModel = {
        updateMany: (
          filter: Record<string, unknown>,
          update: Record<string, unknown>,
        ) =>
          failAfterWrite(
            notificationModel.updateMany(filter, update),
            'notifications',
            failureStage,
          ),
      };
      const wrappedShareModel = {
        deleteMany: (filter: Record<string, unknown>) =>
          failAfterWrite(
            shareModel.deleteMany(filter),
            'shares',
            failureStage,
          ),
      };
      const wrappedActivityModel = {
        create: async (
          documents: Record<string, unknown>[],
          options: { session: ClientSession },
        ) => {
          await activityModel.create(
            documents.map((document) => ({ ...document, testRunId })),
            options,
          );
          if (failureStage.value === 'audit') {
            throw new Error('Injected post-write failure: audit');
          }
        },
      };
      const service = new AdminService(
        wrappedPropertyModel as never,
        {} as never,
        undefined,
        wrappedAdvertisementModel as never,
        wrappedActivityModel as never,
        undefined,
        leadModel as never,
        conversationModel as never,
        wrappedShareModel as never,
        undefined,
        wrappedSavedPropertyModel as never,
        wrappedNotificationModel as never,
        connection as never,
      );

      for (const stage of [
        'saved-properties',
        'notifications',
        'shares',
        'advertisement',
        'property',
        'audit',
      ]) {
        const propertyId = new Types.ObjectId();
        fixturePropertyIds.push(String(propertyId));
        await propertyModel.create({
          _id: propertyId,
          agentArchived: true,
          status: 'pending_approval',
          images: ['https://images.example.test/retained.jpg'],
          testRunId,
        });
        const [advertisement] = await advertisementModel.create([
          { propertyId, testRunId },
        ]);
        await savedPropertyModel.create([{ propertyId, testRunId }]);
        await notificationModel.create([{ propertyId, testRunId }]);
        await shareModel.create([
          { propertyId, expiresAt: new Date(Date.now() + 60_000), testRunId },
          { propertyId, expiresAt: new Date(Date.now() - 60_000), testRunId },
        ]);

        failureStage.value = stage;
        await assert.rejects(
          service.deleteProperty(
            String(propertyId),
            { confirmation: 'DELETE PROPERTY', reason: 'Replica-set test' },
            String(new Types.ObjectId()),
          ),
          new RegExp(`Injected post-write failure: ${stage}`),
        );
        failureStage.value = undefined;

        assert.ok(await propertyModel.exists({ _id: propertyId }));
        assert.ok(await advertisementModel.exists({ _id: advertisement._id }));
        assert.equal(await savedPropertyModel.countDocuments({ propertyId }), 1);
        assert.equal(await notificationModel.countDocuments({ propertyId }), 1);
        assert.equal(await shareModel.countDocuments({ propertyId }), 2);
        assert.equal(await activityModel.countDocuments({ entityId: String(propertyId) }), 0);
      }

      const propertyId = new Types.ObjectId();
      fixturePropertyIds.push(String(propertyId));
      await propertyModel.create({
        _id: propertyId,
        agentArchived: true,
        status: 'pending_approval',
        images: ['https://images.example.test/retained.jpg'],
        testRunId,
      });
      await advertisementModel.create([{ propertyId, testRunId }]);
      await shareModel.create([
        { propertyId, expiresAt: new Date(Date.now() + 60_000), testRunId },
        { propertyId, expiresAt: new Date(Date.now() - 60_000), testRunId },
      ]);
      const success = await service.deleteProperty(
        String(propertyId),
        { confirmation: 'DELETE PROPERTY', reason: 'Replica-set test success' },
        String(new Types.ObjectId()),
      );
      assert.equal(success.deleted, true);
      assert.equal(await shareModel.countDocuments({ propertyId }), 0);
      assert.equal(await propertyModel.exists({ _id: propertyId }), null);

      const cleanupOnlyPropertyId = new Types.ObjectId();
      const cleanupOnlyAdvertisementId = new Types.ObjectId();
      const cleanupOnlyConversationId = new Types.ObjectId();
      const cleanupOnlyLeadId = new Types.ObjectId();
      fixturePropertyIds.push(String(cleanupOnlyPropertyId));
      await propertyModel.create({
        _id: cleanupOnlyPropertyId,
        agentArchived: true,
        status: 'pending_approval',
        images: [],
        testRunId,
      });
      await advertisementModel.create([{
        _id: cleanupOnlyAdvertisementId,
        propertyId: cleanupOnlyPropertyId,
        testRunId,
      }]);
      await leadModel.create([{
        _id: cleanupOnlyLeadId,
        conversationId: cleanupOnlyConversationId,
        testRunId,
      }]);
      await conversationModel.create([{
        _id: cleanupOnlyConversationId,
        propertyId: cleanupOnlyPropertyId,
        advertisementId: cleanupOnlyAdvertisementId,
        leadId: cleanupOnlyLeadId,
        testRunId,
      }]);
      await notificationModel.create([{
        propertyId: null,
        conversationId: cleanupOnlyConversationId,
        testRunId,
      }]);
      await savedPropertyModel.create([{
        propertyId: cleanupOnlyPropertyId,
        testRunId,
      }]);
      await shareModel.create([{
        propertyId: cleanupOnlyPropertyId,
        expiresAt: new Date(Date.now() + 60_000),
        testRunId,
      }]);
      await activityModel.create([{
        entityId: String(cleanupOnlyPropertyId),
        testRunId,
      }]);
    } finally {
      await cleanupAndCloseHardDeleteConnection(
        async () => {
          if (cleanupModels) {
            await cleanupAndVerifyHardDeleteFixtures(
              connection,
              cleanupModels,
              fixturePropertyIds,
              testRunId,
            );
          }
        },
        () => connection.close(),
      );
    }
  },
);
