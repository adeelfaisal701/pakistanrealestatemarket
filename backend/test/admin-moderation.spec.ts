import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Types } from 'mongoose';
import { AdminController } from '../src/modules/admin/admin.controller';
import { AdminService } from '../src/modules/admin/admin.service';
import { AdminMutationRateLimitGuard } from '../src/modules/admin/admin-mutation-rate-limit.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { PropertyAdvertisementStatus } from '../src/modules/properties/schemas/property-advertisement.schema';
import { PropertyStatus } from '../src/modules/properties/schemas/property.schema';

function makeQuery(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'populate', 'sort', 'skip', 'limit', 'session', 'lean']) {
    query[method] = () => query;
  }
  query.exec = async () => result;
  return query;
}

function makeProperty(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    title: '5 marla house for rnt',
    description: 'Synthetic moderation test listing.',
    purpose: 'Rent',
    propertyType: 'House',
    price: 50000,
    areaSize: 5,
    areaUnit: 'Marla',
    location: {
      city: 'Lahore',
      area: 'Bahria Town Lahore',
      address: 'Private address excluded from moderation projection',
      latitude: 31.52,
      longitude: 74.36,
    },
    privateLocation: { encryptedData: 'private-data' },
    features: { bedrooms: 3, bathrooms: 2 },
    images: ['https://example.test/first.jpg', 'https://example.test/second.jpg'],
    status: PropertyStatus.PENDING_APPROVAL,
    createdAt: new Date('2026-10-29T08:00:00.000Z'),
    agentId: {
      _id: new Types.ObjectId(),
      name: 'Synthetic QA Agent',
      phone: '03000000000',
      agencyName: 'QA Agency',
      isVerified: false,
      email: 'not-needed@example.test',
    },
    ...overrides,
  };
}

function makeHardDeleteHarness(options: {
  leads?: number;
  conversations?: number;
  archived?: boolean;
  duplicateAdvertisements?: boolean;
  failAt?: 'saved-properties' | 'notifications' | 'shares' | 'advertisement' | 'property' | 'audit';
  transactionUnavailable?: boolean;
  startSessionFailure?: boolean;
} = {}) {
  const property = makeProperty({ agentArchived: options.archived ?? true });
  const advertisement = {
    _id: new Types.ObjectId(),
    propertyId: property._id,
    agentId: new Types.ObjectId(),
  };
  const operations: string[] = [];
  const cleanupWrites: Record<string, unknown> = {};
  let transactionCommitted = false;
  let transactionAborted = false;
  let endedSession = false;
  const session = {
    withTransaction: async (callback: () => Promise<void>) => {
      try {
        await callback();
        transactionCommitted = true;
      } catch (error) {
        transactionAborted = true;
        throw error;
      }
    },
    endSession: async () => {
      endedSession = true;
    },
  };
  const connection = options.transactionUnavailable
    ? undefined
    : {
        startSession: async () => {
          if (options.startSessionFailure) {
            throw new Error('session unavailable');
          }
          return session;
        },
      };
  const propertyModel = {
    findById: () => makeQuery(property),
    deleteOne: (filter: Record<string, unknown>) => {
      operations.push('property');
      cleanupWrites.propertyDelete = filter;
      if (options.failAt === 'property') throw new Error('property delete failed');
      return makeQuery({ deletedCount: 1 });
    },
  };
  const advertisementModel = {
    find: () =>
      makeQuery(
        options.duplicateAdvertisements
          ? [advertisement, { ...advertisement, _id: new Types.ObjectId() }]
          : [advertisement],
      ),
    deleteOne: (filter: Record<string, unknown>) => {
      operations.push('advertisement');
      cleanupWrites.advertisementDelete = filter;
      if (options.failAt === 'advertisement') {
        throw new Error('advertisement delete failed');
      }
      return makeQuery({ deletedCount: 1 });
    },
  };
  const leadModel = {
    countDocuments: () => makeQuery(options.leads ?? 0),
  };
  const conversationModel = {
    countDocuments: () => makeQuery(options.conversations ?? 0),
    find: () => makeQuery([]),
  };
  const savedPropertyModel = {
    deleteMany: (filter: Record<string, unknown>) => {
      operations.push('saved-properties');
      cleanupWrites.savedProperties = filter;
      if (options.failAt === 'saved-properties') {
        throw new Error('saved-property cleanup failed');
      }
      return makeQuery({ deletedCount: 2 });
    },
  };
  const buyerNotificationModel = {
    updateMany: (
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
    ) => {
      operations.push('notifications');
      cleanupWrites.notificationFilter = filter;
      cleanupWrites.notificationUpdate = update;
      if (options.failAt === 'notifications') {
        throw new Error('notification unlink failed');
      }
      return makeQuery({ modifiedCount: 3 });
    },
  };
  const locationShareModel = {
    deleteMany: (filter: Record<string, unknown>) => {
      operations.push('shares');
      cleanupWrites.shareFilter = filter;
      if (options.failAt === 'shares') {
        throw new Error('share cleanup failed');
      }
      return makeQuery({ modifiedCount: 1 });
    },
  };
  const activityModel = {
    create: async (entries: Record<string, unknown>[]) => {
      operations.push('audit');
      cleanupWrites.audit = entries[0];
      if (options.failAt === 'audit') throw new Error('audit write failed');
    },
  };
  const service = new AdminService(
    propertyModel as never,
    {} as never,
    undefined,
    advertisementModel as never,
    activityModel as never,
    undefined,
    leadModel as never,
    conversationModel as never,
    locationShareModel as never,
    undefined,
    savedPropertyModel as never,
    buyerNotificationModel as never,
    connection as never,
  );
  return {
    service,
    property,
    operations,
    cleanupWrites,
    transactionState: () => ({
      committed: transactionCommitted,
      aborted: transactionAborted,
      endedSession,
    }),
  };
}

test('admin property list returns canonical rent/status/images without exact location fields', async () => {
  const property = makeProperty();
  const propertyModel = {
    find: () => makeQuery([property]),
    countDocuments: () => makeQuery(1),
    aggregate: () => makeQuery([
      { _id: PropertyStatus.PENDING_APPROVAL, count: 1 },
    ]),
  };
  const service = new AdminService(
    propertyModel as never,
    {} as never,
    undefined,
    {
      find: () => makeQuery([
        { propertyId: property._id, status: PropertyAdvertisementStatus.PUBLISHED },
      ]),
    } as never,
  );

  const result = await service.getAdminProperties({ page: 1, limit: 30 });
  const returned = result.items[0];

  assert.equal(returned.id, String(property._id));
  assert.equal(returned.purpose, 'Rent');
  assert.equal(returned.status, PropertyStatus.PENDING_APPROVAL);
  assert.deepEqual(returned.images, property.images);
  assert.deepEqual(returned.location, { city: 'Lahore', area: 'Bahria Town Lahore' });
  assert.equal('privateLocation' in returned, false);
  assert.equal(JSON.stringify(returned).includes('31.52'), false);
  assert.equal(result.counts.pending_approval, 1);
  assert.equal(result.counts.total, 1);
  assert.equal(result.total, 1);
  assert.equal(returned.advertisementStatus, PropertyAdvertisementStatus.PUBLISHED);
});

test('admin hard-delete requires a prior archive/removal state', async () => {
  const harness = makeHardDeleteHarness({ archived: false });

  await assert.rejects(
    harness.service.deleteProperty(
      String(new Types.ObjectId()),
      { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
      String(new Types.ObjectId()),
    ),
    /already archived or removed/,
  );
});

test('admin hard-delete endpoint requires authenticated admin role and mutation rate limit', () => {
  const controllerRoles = Reflect.getMetadata(ROLES_KEY, AdminController) as string[];
  const controllerGuards = Reflect.getMetadata(
    GUARDS_METADATA,
    AdminController,
  ) as unknown[];
  const methodGuards = Reflect.getMetadata(
    GUARDS_METADATA,
    AdminController.prototype.deleteProperty,
  ) as unknown[];

  assert.deepEqual(controllerRoles, ['admin']);
  assert.ok(controllerGuards.includes(JwtAuthGuard));
  assert.ok(controllerGuards.includes(RolesGuard));
  assert.ok(methodGuards.includes(AdminMutationRateLimitGuard));
});

test('admin hard-delete blocks linked lead or conversation retention records', async () => {
  for (const reference of ['leads', 'conversations'] as const) {
    const harness = makeHardDeleteHarness({ [reference]: 1 });
    await assert.rejects(
      harness.service.deleteProperty(
        String(new Types.ObjectId()),
        { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
        String(new Types.ObjectId()),
      ),
      ConflictException,
    );
    assert.deepEqual(harness.operations, []);
    assert.equal(harness.transactionState().aborted, true);
  }
});

test('admin hard-delete fails closed when duplicate advertisements are present', async () => {
  const harness = makeHardDeleteHarness({ duplicateAdvertisements: true });

  await assert.rejects(
    harness.service.deleteProperty(
      String(new Types.ObjectId()),
      { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
      String(new Types.ObjectId()),
    ),
    /Multiple advertisements/,
  );
  assert.deepEqual(harness.operations, []);
  assert.equal(harness.transactionState().aborted, true);
});

test('admin hard-delete cleans favorites, unlinks notifications, removes shares, and retains audit analytics', async () => {
  const harness = makeHardDeleteHarness();
  const result = await harness.service.deleteProperty(
    String(new Types.ObjectId()),
    { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
    String(new Types.ObjectId()),
  );

  assert.equal(result.deleted, true);
  assert.deepEqual(harness.operations, [
    'saved-properties',
    'notifications',
    'shares',
    'advertisement',
    'property',
    'audit',
  ]);
  assert.deepEqual(harness.cleanupWrites.savedProperties, {
    propertyId: harness.property._id,
  });
  assert.deepEqual(harness.cleanupWrites.notificationFilter, {
    propertyId: harness.property._id,
  });
  assert.deepEqual(harness.cleanupWrites.notificationUpdate, {
    $set: { propertyId: null },
  });
  assert.deepEqual(harness.cleanupWrites.shareFilter, {
    propertyId: harness.property._id,
  });
  assert.deepEqual(harness.cleanupWrites.propertyDelete, {
    _id: harness.property._id,
  });
  const audit = harness.cleanupWrites.audit as {
    metadata: Record<string, unknown>;
  };
  assert.equal(audit.metadata.analyticsRetained, true);
  assert.equal(audit.metadata.reportsRetained, true);
  assert.equal(audit.metadata.imagesRetained, 2);
  assert.equal(audit.metadata.locationSharesDeleted, true);
  assert.deepEqual(harness.transactionState(), {
    committed: true,
    aborted: false,
    endedSession: true,
  });
});

test('admin hard-delete propagates cleanup errors to the transaction runner', async () => {
  const harness = makeHardDeleteHarness({ failAt: 'notifications' });

  await assert.rejects(
    harness.service.deleteProperty(
      String(new Types.ObjectId()),
      { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
      String(new Types.ObjectId()),
    ),
    /notification unlink failed/,
  );

  assert.deepEqual(harness.operations, ['saved-properties', 'notifications']);
  assert.deepEqual(harness.transactionState(), {
    committed: false,
    aborted: true,
    endedSession: true,
  });
});

test('admin hard-delete passes every cleanup or audit failure to the transaction runner', async (t) => {
  for (const failAt of [
    'saved-properties',
    'notifications',
    'shares',
    'advertisement',
    'property',
    'audit',
  ] as const) {
    await t.test(failAt, async () => {
      const harness = makeHardDeleteHarness({ failAt });
      await assert.rejects(
        harness.service.deleteProperty(
          String(new Types.ObjectId()),
          { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
          String(new Types.ObjectId()),
        ),
      );
      assert.equal(harness.transactionState().committed, false);
      assert.equal(harness.transactionState().aborted, true);
      assert.equal(harness.transactionState().endedSession, true);
    });
  }
});

test('admin hard-delete propagates property deletion failure', async () => {
  const harness = makeHardDeleteHarness({ failAt: 'property' });

  await assert.rejects(
    harness.service.deleteProperty(
      String(new Types.ObjectId()),
      { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
      String(new Types.ObjectId()),
    ),
    /property delete failed/,
  );

  assert.deepEqual(harness.operations, [
    'saved-properties',
    'notifications',
    'shares',
    'advertisement',
    'property',
  ]);
  assert.deepEqual(harness.transactionState(), {
    committed: false,
    aborted: true,
    endedSession: true,
  });
});

test('admin hard-delete fails closed when transaction support is unavailable', async () => {
  const harness = makeHardDeleteHarness({ transactionUnavailable: true });

  await assert.rejects(
    harness.service.deleteProperty(
      String(new Types.ObjectId()),
      { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
      String(new Types.ObjectId()),
    ),
    ServiceUnavailableException,
  );
  assert.deepEqual(harness.operations, []);
});

test('admin hard-delete fails closed when starting a session fails', async () => {
  const harness = makeHardDeleteHarness({ startSessionFailure: true });

  await assert.rejects(
    harness.service.deleteProperty(
      String(new Types.ObjectId()),
      { confirmation: 'DELETE PROPERTY', reason: 'Exceptional purge' },
      String(new Types.ObjectId()),
    ),
    /session unavailable/,
  );
  assert.deepEqual(harness.operations, []);
});

test('moderation atomically changes only pending listings and records the admin decision', async () => {
  const property = makeProperty({ status: PropertyStatus.PUBLISHED });
  let filter: Record<string, unknown> | undefined;
  let update: Record<string, unknown> | undefined;
  const propertyModel = {
    findOneAndUpdate: (
      query: Record<string, unknown>,
      changes: Record<string, unknown>,
    ) => {
      filter = query;
      update = changes;
      return makeQuery(property);
    },
  };
  const service = new AdminService(propertyModel as never, {} as never);

  await service.moderateProperty(
    String(property._id),
    { status: PropertyStatus.PUBLISHED },
    'admin-id',
  );

  assert.deepEqual(filter, {
    _id: String(property._id),
    status: PropertyStatus.PENDING_APPROVAL,
    inventoryStatus: 'available',
    agentArchived: { $ne: true },
    adminHidden: { $ne: true },
    adminRemoved: { $ne: true },
  });
  assert.equal(
    (update?.$set as Record<string, unknown>).status,
    PropertyStatus.PUBLISHED,
  );
  assert.equal(
    (update?.$set as Record<string, unknown>).moderatedBy,
    'admin-id',
  );
  assert.ok((update?.$set as Record<string, unknown>).moderatedAt instanceof Date);
});

test('moderation refuses non-pending records and distinguishes missing records', async () => {
  const existingProperty = makeProperty({ status: PropertyStatus.PUBLISHED });
  const service = new AdminService(
    {
      findOneAndUpdate: () => makeQuery(null),
      exists: () => makeQuery({ _id: existingProperty._id }),
    } as never,
    {} as never,
  );
  await assert.rejects(
    service.moderateProperty(
      String(existingProperty._id),
      { status: PropertyStatus.REJECTED, moderationNotes: 'Review reason' },
      'admin-id',
    ),
    ConflictException,
  );

  const missingService = new AdminService(
    {
      findOneAndUpdate: () => makeQuery(null),
      exists: () => makeQuery(null),
    } as never,
    {} as never,
  );
  await assert.rejects(
    missingService.moderateProperty(
      String(existingProperty._id),
      { status: PropertyStatus.PUBLISHED },
      'admin-id',
    ),
    NotFoundException,
  );
});

test('moderation synchronizes the linked advertisement status and decision metadata', async () => {
  const property = makeProperty({ status: PropertyStatus.PENDING_APPROVAL });
  let synchronized:
    | [string, PropertyStatus, string | null, string, Date]
    | undefined;
  const service = new AdminService(
    {
      findOneAndUpdate: () => makeQuery(property),
    } as never,
    {} as never,
    {
      syncAdvertisementModeration: async (
        id: string,
        status: PropertyStatus,
        notes: string | null,
        adminId: string,
        moderatedAt: Date,
      ) => {
        synchronized = [id, status, notes, adminId, moderatedAt];
      },
    } as never,
  );

  await service.moderateProperty(
    String(property._id),
    { status: PropertyStatus.REJECTED, moderationNotes: 'Missing required documents.' },
    'admin-id',
  );

  assert.equal(synchronized?.[0], String(property._id));
  assert.equal(synchronized?.[1], PropertyStatus.REJECTED);
  assert.equal(synchronized?.[2], 'Missing required documents.');
  assert.equal(synchronized?.[3], 'admin-id');
  assert.ok(synchronized?.[4] instanceof Date);
});

test('admin advertisement approval rejects archived or unavailable properties', async () => {
  const property = makeProperty({
    inventoryStatus: 'available',
    agentArchived: true,
  });
  const ad = {
    _id: new Types.ObjectId(),
    propertyId: property._id,
    agentId: (property.agentId as { _id: Types.ObjectId })._id,
    status: PropertyAdvertisementStatus.PENDING_REVIEW,
    async save() {},
  };
  const service = new AdminService(
    {
      findById: () => makeQuery(property),
    } as never,
    {} as never,
    undefined,
    { findById: () => makeQuery(ad) } as never,
  );

  await assert.rejects(
    service.adminAdvertisementAction(
      String(ad._id),
      { action: 'approve' } as never,
      String(new Types.ObjectId()),
    ),
    BadRequestException,
  );
});

test('admin advertisement approval refuses reserved inventory', async () => {
  const property = makeProperty({ inventoryStatus: 'reserved' });
  const ad = {
    _id: new Types.ObjectId(),
    propertyId: property._id,
    agentId: (property.agentId as { _id: Types.ObjectId })._id,
    status: PropertyAdvertisementStatus.PENDING_REVIEW,
    async save() {},
  };
  const service = new AdminService(
    { findById: () => makeQuery(property) } as never,
    {} as never,
    undefined,
    { findById: () => makeQuery(ad) } as never,
  );

  await assert.rejects(
    service.adminAdvertisementAction(
      String(ad._id),
      { action: 'approve' } as never,
      String(new Types.ObjectId()),
    ),
    BadRequestException,
  );
});

test('admin rejection clears stale advertisement approval timestamps', async () => {
  const property = makeProperty();
  const ad = {
    _id: new Types.ObjectId(),
    propertyId: property._id,
    agentId: (property.agentId as { _id: Types.ObjectId })._id,
    status: PropertyAdvertisementStatus.PENDING_REVIEW,
    approvedAt: new Date('2026-10-29T08:00:00.000Z'),
    publishedAt: new Date('2026-10-29T08:00:00.000Z'),
    async save() {},
  };
  let revokedShares = false;
  const service = new AdminService(
    {
      findById: () => makeQuery(property),
      updateOne: () => makeQuery({ modifiedCount: 1 }),
    } as never,
    {} as never,
    undefined,
    { findById: () => makeQuery(ad) } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      updateMany: () => {
        revokedShares = true;
        return makeQuery({ modifiedCount: 1 });
      },
    } as never,
  );

  await service.adminAdvertisementAction(
    String(ad._id),
    { action: 'reject', reason: 'Rejected during review' } as never,
    String(new Types.ObjectId()),
  );

  assert.equal(ad.status, PropertyAdvertisementStatus.REJECTED);
  assert.equal(ad.approvedAt, undefined);
  assert.equal(ad.publishedAt, undefined);
  assert.equal(revokedShares, true);
});

test('admin hiding a property revokes active location shares', async () => {
  const property = makeProperty({ status: PropertyStatus.PUBLISHED });
  let revokedShares = false;
  const service = new AdminService(
    {
      findById: () => makeQuery(property),
      findByIdAndUpdate: () =>
        makeQuery({ ...property, adminHidden: true }),
    } as never,
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      updateMany: () => {
        revokedShares = true;
        return makeQuery({ modifiedCount: 1 });
      },
    } as never,
  );

  await service.adminPropertyAction(
    String(property._id),
    { action: 'hide', reason: 'Safety review' } as never,
    String(new Types.ObjectId()),
  );

  assert.equal(revokedShares, true);
});
