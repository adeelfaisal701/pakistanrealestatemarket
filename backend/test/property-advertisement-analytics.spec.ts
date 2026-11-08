import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PropertiesService } from '../src/modules/properties/properties.service';
import {
  PropertyAdvertisementStatus,
} from '../src/modules/properties/schemas/property-advertisement.schema';
import {
  PropertyAnalyticsEventType,
} from '../src/modules/properties/schemas/property-analytics-event.schema';
import { PropertyAnalyticsEventSchema } from '../src/modules/properties/schemas/property-analytics-event.schema';
import {
  PropertyAnalyticsDeduplication,
  PropertyAnalyticsDeduplicationSchema,
} from '../src/modules/properties/schemas/property-analytics-deduplication.schema';
import { PropertyStatus } from '../src/modules/properties/schemas/property.schema';
import { buildPropertySearchFilter } from '../src/modules/buyer/buyer-search.utils';

function query<T>(value: T) {
  const result: Record<string, unknown> = {
    select: () => result,
    populate: () => result,
    sort: () => result,
    skip: () => result,
    limit: () => result,
    exec: async () => value,
  };
  return result;
}

function makeService(overrides: {
  property?: Record<string, unknown>;
  advertisements?: Record<string, unknown>;
  events?: Record<string, unknown>;
} = {}) {
  const propertyId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const property = overrides.property ?? {
    _id: propertyId,
    title: 'Private home',
    agentId,
    status: PropertyStatus.AVAILABLE,
    inventoryStatus: 'available',
    images: ['https://images.example.test/home.jpg'],
    createdAt: new Date('2026-10-30T09:00:00.000Z'),
  };
  const propertyModel = {
    findById: () => query(property),
    findOne: () => query(property),
    find: (_filter?: unknown) => query([property]),
    countDocuments: () => query(1),
    updateOne: (_filter?: unknown, _update?: Record<string, unknown>) => query({ modifiedCount: 1 }),
    findOneAndUpdate: (_filter?: unknown, _update?: Record<string, unknown>) => query(property),
  };
  const advertisementsModel = {
    updateOne: (_filter?: unknown, _update?: Record<string, unknown>) => query({ upsertedCount: 1 }),
    findOne: () => query(null),
    find: () => query([]),
    findOneAndUpdate: (_filter?: unknown, _update?: Record<string, unknown>) => query(null),
    findByIdAndUpdate: () => query(null),
    findById: () => query(null),
    exists: () => query(null),
    create: async (data: Record<string, unknown>) => data,
  };
  const locationShareModel = {
    updateMany: (_filter?: unknown, _update?: Record<string, unknown>) =>
      query({ modifiedCount: 0 }),
  };
  const analyticsDeduplicationModel = {
    findOneAndUpdate: () => query({}),
    deleteOne: () => query({ deletedCount: 1 }),
  };
  const eventsModel = {
    countDocuments: () => query(0),
    exists: () => query(null),
    create: async (data: Record<string, unknown>) => data,
    find: () => query([]),
    ...overrides.events,
  };
  const service = new PropertiesService(
    propertyModel as never,
    eventsModel as never,
    locationShareModel as never,
    {} as never,
    new ConfigService({ jwt: { secret: 'test-analytics-secret-key' } }),
    {} as never,
    advertisementsModel as never,
    undefined,
    undefined,
    undefined,
    analyticsDeduplicationModel as never,
  );
  return {
    service,
    property,
    propertyId,
    agentId,
    propertyModel,
    advertisementsModel,
    locationShareModel,
    analyticsDeduplicationModel,
    eventsModel,
  };
}

test('public property results expose the lifetime published-ad view total', async () => {
  const state = makeService();
  const advertisementId = new Types.ObjectId();
  state.advertisementsModel.find = () =>
    query([{ _id: advertisementId, propertyId: state.propertyId }]);
  let aggregationPipeline: unknown;
  Object.assign(state.eventsModel, {
    aggregate: (pipeline: unknown) => {
      aggregationPipeline = pipeline;
      return query([{ _id: advertisementId, count: 1247 }]);
    },
  });

  const response = (await state.service.findAll({} as never)) as {
    data: Array<Record<string, unknown>>;
  };

  assert.equal(response.data[0].viewsCount, 1247);
  assert.match(JSON.stringify(aggregationPipeline), /property_view/);
  assert.match(JSON.stringify(aggregationPipeline), new RegExp(String(advertisementId)));
});

test('public property results default to zero views when an ad has no events', async () => {
  const state = makeService();
  state.advertisementsModel.find = () =>
    query([{ _id: new Types.ObjectId(), propertyId: state.propertyId }]);
  Object.assign(state.eventsModel, {
    aggregate: () => query([]),
  });

  const response = (await state.service.findAll({} as never)) as {
    data: Array<Record<string, unknown>>;
  };

  assert.equal(response.data[0].viewsCount, 0);
});

test('private inventory submission creates one linked pending ad and updates existing property', async () => {
  const state = makeService();
  let createdAdvertisement: Record<string, unknown> | undefined;
  state.advertisementsModel.findOne = () => query(null);
  state.advertisementsModel.findOneAndUpdate = (_filter: unknown, update: Record<string, unknown>) => {
    createdAdvertisement = update.$set as Record<string, unknown>;
    return query({
      _id: new Types.ObjectId(),
      propertyId: state.propertyId,
      agentId: state.agentId,
      status: PropertyAdvertisementStatus.PENDING_REVIEW,
    });
  };
  let propertyUpdate: Record<string, unknown> | undefined;
  state.propertyModel.updateOne = (_filter?: unknown, update?: Record<string, unknown>) => {
    propertyUpdate = update?.$set as Record<string, unknown>;
    return query({ modifiedCount: 1 });
  };

  const result = await state.service.submitForAdvertising(
    String(state.propertyId),
    { id: String(state.agentId), role: 'agent' },
  );

  assert.equal(result.status, PropertyAdvertisementStatus.PENDING_REVIEW);
  assert.equal(createdAdvertisement?.status, PropertyAdvertisementStatus.PENDING_REVIEW);
  assert.equal(propertyUpdate?.status, PropertyStatus.PENDING_APPROVAL);
  assert.equal(String((state.property as { _id: Types.ObjectId })._id), String(state.propertyId));
});

test('reserved inventory may enter review but remains unpublished', async () => {
  const state = makeService();
  Object.assign(state.property, {
    status: PropertyStatus.RESERVED,
    inventoryStatus: 'reserved',
  });
  let createdAdvertisement: Record<string, unknown> | undefined;
  state.advertisementsModel.findOne = () => query(null);
  state.advertisementsModel.findOneAndUpdate = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    createdAdvertisement = update.$set as Record<string, unknown>;
    return query({ status: PropertyAdvertisementStatus.PENDING_REVIEW });
  };
  let propertyStatus: unknown;
  state.propertyModel.updateOne = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    propertyStatus = (update.$set as Record<string, unknown>).status;
    return query({ modifiedCount: 1 });
  };

  const result = await state.service.submitForAdvertising(
    String(state.propertyId),
    { id: String(state.agentId), role: 'agent' },
  );

  assert.equal(result.status, PropertyAdvertisementStatus.PENDING_REVIEW);
  assert.equal(createdAdvertisement?.status, PropertyAdvertisementStatus.PENDING_REVIEW);
  assert.equal(propertyStatus, PropertyStatus.PENDING_APPROVAL);
  assert.notEqual(propertyStatus, PropertyStatus.PUBLISHED);
});

test('analytics events require a published property and advertisement and persist linked visitor events', async () => {
  const state = makeService({
    property: {
      _id: new Types.ObjectId(),
      agentId: new Types.ObjectId(),
      status: PropertyStatus.PUBLISHED,
    },
  });
  const ad = { _id: new Types.ObjectId(), status: PropertyAdvertisementStatus.PUBLISHED };
  state.advertisementsModel.updateOne = () => query({ upsertedCount: 0 });
  state.advertisementsModel.findOne = () => query(ad);
  let event: Record<string, unknown> | undefined;
  state.eventsModel.create = async (data: Record<string, unknown>) => {
    event = data;
    return data;
  };
  let viewsIncremented = false;
  state.propertyModel.updateOne = () => {
    viewsIncremented = true;
    return query({ modifiedCount: 1 });
  };

  const result = await state.service.trackPublicEvent(
    String((state.property as { _id: Types.ObjectId })._id),
    PropertyAnalyticsEventType.PROPERTY_VIEW,
    '7981c8b0-bcc9-43f3-aea3-52f80f088718',
    'Mozilla/5.0',
  );

  assert.deepEqual(result, { tracked: true });
  assert.equal(event?.type, PropertyAnalyticsEventType.PROPERTY_VIEW);
  assert.equal(String(event?.advertisementId), String(ad._id));
  assert.equal(String(event?.agentId), String((state.property as { agentId: Types.ObjectId }).agentId));
  assert.equal(typeof event?.visitorHash, 'string');
  assert.equal(String(event?.visitorHash).includes('7981c8b0'), false);
  assert.equal(viewsIncremented, true);
});

test('repeat and bot events are rejected without inserting new analytics', async () => {
  const state = makeService({
    property: {
      _id: new Types.ObjectId(),
      agentId: new Types.ObjectId(),
      status: PropertyStatus.PUBLISHED,
    },
  });
  state.advertisementsModel.updateOne = () => query({ upsertedCount: 0 });
  state.advertisementsModel.findOne = () => query({
    _id: new Types.ObjectId(),
    status: PropertyAdvertisementStatus.PUBLISHED,
  });
  state.eventsModel.exists = () => query({ _id: new Types.ObjectId() });
  let inserted = 0;
  state.eventsModel.create = async () => {
    inserted += 1;
    return {};
  };

  const duplicate = await state.service.trackPublicEvent(
    String((state.property as { _id: Types.ObjectId })._id),
    PropertyAnalyticsEventType.PROPERTY_VIEW,
    '7981c8b0-bcc9-43f3-aea3-52f80f088718',
    'Mozilla/5.0',
  );
  assert.deepEqual(duplicate, { tracked: false, duplicate: true });
  await assert.rejects(
    state.service.trackPublicEvent(
      String((state.property as { _id: Types.ObjectId })._id),
      PropertyAnalyticsEventType.PROPERTY_VIEW,
      '7981c8b0-bcc9-43f3-aea3-52f80f088718',
      'Googlebot/2.1',
    ),
    /Automated requests/,
  );
  assert.equal(inserted, 0);
});

test('analytics deduplication schemas declare atomic and expiry indexes', () => {
  const reservationIndexes = PropertyAnalyticsDeduplicationSchema.indexes();
  assert.ok(
    reservationIndexes.some(
      ([keys, options]) =>
        keys.key === 1 && options.unique === true,
    ),
  );
  assert.ok(
    reservationIndexes.some(
      ([keys, options]) =>
        keys.expiresAt === 1 && options.expireAfterSeconds === 0,
    ),
  );
  assert.ok(
    PropertyAnalyticsEventSchema.indexes().some(
      ([keys, options]) =>
        keys.dedupeKey === 1 && options.unique === true && options.sparse === true,
    ),
  );
  assert.equal(PropertyAnalyticsDeduplication.name, 'PropertyAnalyticsDeduplication');
});

test('concurrent analytics events are serialized by the atomic reservation', async () => {
  const state = makeService({
    property: {
      _id: new Types.ObjectId(),
      agentId: new Types.ObjectId(),
      status: PropertyStatus.PUBLISHED,
    },
  });
  state.advertisementsModel.findOne = () => query({
    _id: new Types.ObjectId(),
    status: PropertyAdvertisementStatus.PUBLISHED,
  });
  let reservationActive = false;
  let reservationFilter: Record<string, unknown> | undefined;
  let reservationUpdate: Record<string, unknown> | undefined;
  state.analyticsDeduplicationModel.findOneAndUpdate = (
    filter?: Record<string, unknown>,
    update?: Record<string, unknown>,
  ) => {
    if (filter) reservationFilter = filter;
    if (update) reservationUpdate = update;
    if (reservationActive) {
      const error = new Error('Duplicate reservation');
      Object.assign(error, { code: 11000 });
      throw error;
    }
    reservationActive = true;
    return query({});
  };
  let eventInsertions = 0;
  state.eventsModel.create = async () => {
    eventInsertions += 1;
    return {};
  };
  const track = () =>
    state.service.trackPublicEvent(
      String(state.propertyId),
      PropertyAnalyticsEventType.PROPERTY_VIEW,
      'b6f7a201-1050-4b3b-b596-b4e51d303ffa',
      'Mozilla/5.0',
    );

  const results = await Promise.all([track(), track()]);

  assert.equal(eventInsertions, 1);
  assert.equal(results.filter((result) => result.tracked).length, 1);
  assert.equal(results.filter((result) => result.duplicate).length, 1);
  assert.equal(typeof reservationFilter?.key, 'string');
  assert.ok(
    (reservationFilter?.expiresAt as { $lte?: Date })?.$lte instanceof Date,
  );
  assert.ok(
    (reservationUpdate?.$set as { expiresAt?: Date })?.expiresAt instanceof Date,
  );
});

test('failed analytics event insertion releases its deduplication reservation', async () => {
  const state = makeService({
    property: {
      _id: new Types.ObjectId(),
      agentId: new Types.ObjectId(),
      status: PropertyStatus.PUBLISHED,
    },
  });
  state.advertisementsModel.findOne = () => query({
    _id: new Types.ObjectId(),
    status: PropertyAdvertisementStatus.PUBLISHED,
  });
  state.eventsModel.create = async () => {
    throw new Error('analytics write failed');
  };
  let released = false;
  state.analyticsDeduplicationModel.deleteOne = () => {
    released = true;
    return query({ deletedCount: 1 });
  };

  await assert.rejects(
    state.service.trackPublicEvent(
      String(state.propertyId),
      PropertyAnalyticsEventType.CALL_CLICK,
      'b6f7a201-1050-4b3b-b596-b4e51d303ffa',
      'Mozilla/5.0',
    ),
    /analytics write failed/,
  );
  assert.equal(released, true);
});

test('analytics aggregate event-backed views, unique reach, calls, and WhatsApp clicks', async () => {
  const agentId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const now = new Date();
  const events = [
    { propertyId, occurredAt: now, type: PropertyAnalyticsEventType.PROPERTY_VIEW, visitorHash: 'visitor-a' },
    { propertyId, occurredAt: now, type: PropertyAnalyticsEventType.PROPERTY_VIEW, visitorHash: 'visitor-a' },
    { propertyId, occurredAt: now, type: PropertyAnalyticsEventType.PROPERTY_VIEW, visitorHash: 'visitor-b' },
    { propertyId, occurredAt: now, type: PropertyAnalyticsEventType.CALL_CLICK },
    { propertyId, occurredAt: now, type: PropertyAnalyticsEventType.WHATSAPP_CLICK },
  ];
  const state = makeService({
    events: {
      find: () => query(events),
    },
  });
  state.propertyModel.find = () => query([{ _id: propertyId, title: 'Measured listing' }]);

  const analytics = await state.service.getAgentAnalytics(String(agentId), 1);
  assert.deepEqual(analytics.totals, {
    propertyViews: 3,
    peopleReached: 2,
    callClicks: 1,
    whatsappClicks: 1,
  });
  assert.equal(analytics.properties[0].propertyTitle, 'Measured listing');
});

test('listing and activity reads do not upsert legacy advertisements', async () => {
  const propertyId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const state = makeService({
    property: {
      _id: propertyId,
      title: 'Published property',
      agentId,
      status: PropertyStatus.PUBLISHED,
      inventoryStatus: 'available',
      createdAt: new Date('2026-10-30T09:00:00.000Z'),
      toObject: () => ({
        _id: propertyId,
        title: 'Published property',
        agentId,
        status: PropertyStatus.PUBLISHED,
        inventoryStatus: 'available',
      }),
    },
  });
  let advertisementWrites = 0;
  state.advertisementsModel.updateOne = () => {
    advertisementWrites += 1;
    return query({ modifiedCount: 0, upsertedCount: 0 });
  };
  state.advertisementsModel.findOne = () => query({
    status: PropertyAdvertisementStatus.PUBLISHED,
    approvedAt: new Date('2026-10-30T09:00:00.000Z'),
  });

  await state.service.findAll({ page: 1, limit: 10 } as never);
  await state.service.findById(String(propertyId));
  await state.service.findByAgent(String(agentId));
  await state.service.findAdvertisementsByAgent(String(agentId));
  await state.service.getAgentRecentActivity(String(agentId));

  assert.equal(advertisementWrites, 0);
});

test('public property and buyer search filters exclude archived inventory', async () => {
  const state = makeService();
  let publicFilter: Record<string, unknown> | undefined;
  state.propertyModel.find = (filter: Record<string, unknown>) => {
    publicFilter = filter;
    return query([]);
  };

  await state.service.findAll({ page: 1, limit: 10 } as never);

  assert.deepEqual(publicFilter?.agentArchived, { $ne: true });
  assert.deepEqual(buildPropertySearchFilter({}).agentArchived, { $ne: true });
});

test('agent archive preserves property history, ends active advertising, and revokes location shares', async () => {
  const state = makeService();
  const property = state.property as {
    _id: Types.ObjectId;
    agentId: Types.ObjectId;
    agentArchived?: boolean;
  };
  let propertyUpdate: Record<string, unknown> | undefined;
  state.propertyModel.findOneAndUpdate = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    propertyUpdate = update.$set as Record<string, unknown>;
    return query({ ...property, ...propertyUpdate });
  };
  let advertisementUpdate: Record<string, unknown> | undefined;
  state.advertisementsModel.updateOne = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    advertisementUpdate = update.$set as Record<string, unknown>;
    return query({ modifiedCount: 1 });
  };
  let shareRevokedAt: unknown;
  state.locationShareModel.updateMany = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    shareRevokedAt = (update.$set as Record<string, unknown>).revokedAt;
    return query({ modifiedCount: 1 });
  };

  const result = await state.service.archive(
    String(state.propertyId),
    { id: String(state.agentId), role: 'agent' },
    'ARCHIVE PROPERTY',
  );

  assert.equal(result.archived, true);
  assert.equal(propertyUpdate?.agentArchived, true);
  assert.ok(propertyUpdate?.agentArchivedAt instanceof Date);
  assert.equal(
    advertisementUpdate?.status,
    PropertyAdvertisementStatus.ENDED,
  );
  assert.ok(advertisementUpdate?.endedAt instanceof Date);
  assert.ok(shareRevokedAt instanceof Date);
  assert.equal('deleteOne' in state.advertisementsModel, false);
  assert.equal('deleteMany' in state.eventsModel, false);
});

test('restore only unhides inventory and keeps advertising ended', async () => {
  const state = makeService();
  state.property.agentArchived = true;
  let propertyUpdate: Record<string, unknown> | undefined;
  state.propertyModel.findOneAndUpdate = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    propertyUpdate = update.$set as Record<string, unknown>;
    return query({ _id: state.propertyId });
  };
  let advertisementStatus: unknown;
  state.advertisementsModel.updateOne = (_filter: unknown, update: Record<string, unknown>) => {
    advertisementStatus = (update.$set as Record<string, unknown>).status;
    return query({ modifiedCount: 1 });
  };

  const result = await state.service.restore(
    String(state.propertyId),
    { id: String(state.agentId), role: 'agent' },
    'RESTORE PROPERTY',
  );

  assert.equal(result.archived, false);
  assert.equal(propertyUpdate?.agentArchived, false);
  assert.equal(advertisementStatus, PropertyAdvertisementStatus.ENDED);
});

test('rejecting an approved advertisement clears approval timestamps and blocks resuming it', async () => {
  const state = makeService();
  const property = state.property as { _id: Types.ObjectId; agentId: Types.ObjectId };
  const approvedAt = new Date('2026-10-30T09:00:00.000Z');
  const advertisement = {
    _id: new Types.ObjectId(),
    propertyId: property._id,
    agentId: property.agentId,
    status: PropertyAdvertisementStatus.PUBLISHED,
    approvedAt,
    publishedAt: approvedAt,
  };
  state.propertyModel.findById = () => query(property);
  state.advertisementsModel.updateOne = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    Object.assign(advertisement, update.$set);
    for (const key of Object.keys(update.$unset as Record<string, unknown>)) {
      delete (advertisement as Record<string, unknown>)[key];
    }
    return query({ modifiedCount: 1 });
  };
  await state.service.syncAdvertisementModeration(
    String(property._id),
    PropertyStatus.REJECTED,
    'Rejected in review',
    String(new Types.ObjectId()),
    new Date(),
  );
  assert.equal(advertisement.status, PropertyAdvertisementStatus.REJECTED);
  assert.equal(advertisement.approvedAt, undefined);
  assert.equal(advertisement.publishedAt, undefined);

  state.advertisementsModel.findById = () => query(advertisement);
  await assert.rejects(
    state.service.updateAdvertisementStatus(
      String(advertisement._id),
      PropertyAdvertisementStatus.PUBLISHED,
      { id: String(property.agentId), role: 'agent' },
    ),
    BadRequestException,
  );
});

test('publishing requires an available, visible, unarchived property owned by the ad agent', async () => {
  const cases: Array<{
    label: string;
    property: Record<string, unknown> | null;
  }> = [
    { label: 'archived', property: { agentArchived: true, inventoryStatus: 'available' } },
    { label: 'admin-hidden', property: { adminHidden: true, inventoryStatus: 'available' } },
    { label: 'admin-removed', property: { adminRemoved: true, inventoryStatus: 'available' } },
    { label: 'sold', property: { inventoryStatus: 'sold' } },
    { label: 'rented', property: { inventoryStatus: 'rented' } },
    { label: 'missing', property: null },
    {
      label: 'different owner',
      property: {
        inventoryStatus: 'available',
        agentId: new Types.ObjectId(),
      },
    },
  ];

  for (const testCase of cases) {
    const state = makeService();
    const ad = {
      _id: new Types.ObjectId(),
      propertyId: state.propertyId,
      agentId: state.agentId,
      status: PropertyAdvertisementStatus.PAUSED,
      approvedAt: new Date(),
      async save() {},
    };
    state.advertisementsModel.findById = () => query(ad);
    const validProperty = {
      _id: state.propertyId,
      agentId: state.agentId,
      inventoryStatus: 'available',
      ...testCase.property,
    };
    let selectedFields = '';
    state.propertyModel.findById = () => {
      const result = query(testCase.property === null ? null : validProperty);
      result.select = (fields: string) => {
        selectedFields = fields;
        return result;
      };
      return result;
    };

    await assert.rejects(
      state.service.updateAdvertisementStatus(
        String(ad._id),
        PropertyAdvertisementStatus.PUBLISHED,
        { id: String(state.agentId), role: 'agent' },
      ),
      BadRequestException,
      testCase.label,
    );
    assert.equal(
      selectedFields,
      '_id agentId inventoryStatus agentArchived adminHidden adminRemoved',
    );
  }
});

test('advertisement save failure never marks the property published', async () => {
  const state = makeService();
  const advertisement = {
    _id: new Types.ObjectId(),
    propertyId: state.propertyId,
    agentId: state.agentId,
    status: PropertyAdvertisementStatus.PAUSED,
    approvedAt: new Date(),
    async save() {
      throw new Error('advertisement save failed');
    },
  };
  state.advertisementsModel.findById = () => query(advertisement);
  let propertyWrites = 0;
  state.propertyModel.updateOne = () => {
    propertyWrites += 1;
    return query({ matchedCount: 1, modifiedCount: 1 });
  };

  await assert.rejects(
    state.service.updateAdvertisementStatus(
      String(advertisement._id),
      PropertyAdvertisementStatus.PUBLISHED,
      { id: String(state.agentId), role: 'agent' },
    ),
    /advertisement save failed/,
  );
  assert.equal(propertyWrites, 0);
});

test('property eligibility write failure restores the prior advertisement state', async () => {
  const state = makeService();
  const previousPublishedAt = new Date('2026-10-30T09:00:00.000Z');
  const advertisement = {
    _id: new Types.ObjectId(),
    propertyId: state.propertyId,
    agentId: state.agentId,
    status: PropertyAdvertisementStatus.PAUSED,
    approvedAt: new Date(),
    pausedAt: previousPublishedAt,
    publishedAt: previousPublishedAt,
    async save() {},
  };
  const persistedStatuses: string[] = [];
  advertisement.save = async function save() {
    persistedStatuses.push(this.status);
  };
  state.advertisementsModel.findById = () => query(advertisement);
  state.propertyModel.updateOne = () => query({ matchedCount: 0, modifiedCount: 0 });

  await assert.rejects(
    state.service.updateAdvertisementStatus(
      String(advertisement._id),
      PropertyAdvertisementStatus.PUBLISHED,
      { id: String(state.agentId), role: 'agent' },
    ),
    /no longer eligible/,
  );
  assert.deepEqual(persistedStatuses, [
    PropertyAdvertisementStatus.PUBLISHED,
    PropertyAdvertisementStatus.PAUSED,
  ]);
  assert.equal(advertisement.status, PropertyAdvertisementStatus.PAUSED);
  assert.equal(advertisement.pausedAt, previousPublishedAt);
  assert.equal(advertisement.publishedAt, previousPublishedAt);
});

test('an agent cannot publish another agent advertisement', async () => {
  const state = makeService();
  const ad = {
    _id: new Types.ObjectId(),
    propertyId: state.propertyId,
    agentId: new Types.ObjectId(),
    status: PropertyAdvertisementStatus.PAUSED,
    approvedAt: new Date(),
  };
  state.advertisementsModel.findById = () => query(ad);

  await assert.rejects(
    state.service.updateAdvertisementStatus(
      String(ad._id),
      PropertyAdvertisementStatus.PUBLISHED,
      { id: String(state.agentId), role: 'agent' },
    ),
    /Advertisement not found/,
  );
});

test('a valid approved advertisement can be published and updates its canonical property', async () => {
  const state = makeService();
  const advertisement = {
    _id: new Types.ObjectId(),
    propertyId: state.propertyId,
    agentId: state.agentId,
    status: PropertyAdvertisementStatus.PAUSED,
    approvedAt: new Date(),
    async save() {},
  };
  state.advertisementsModel.findById = () => query(advertisement);
  let propertyStatus: unknown;
  state.propertyModel.updateOne = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    propertyStatus = (update.$set as Record<string, unknown>).status;
    return query({ matchedCount: 1, modifiedCount: 1 });
  };

  await state.service.updateAdvertisementStatus(
    String(advertisement._id),
    PropertyAdvertisementStatus.PUBLISHED,
    { id: String(state.agentId), role: 'agent' },
  );

  assert.equal(advertisement.status, PropertyAdvertisementStatus.PUBLISHED);
  assert.equal(propertyStatus, PropertyStatus.PUBLISHED);
});

test('an inventory-ended advertisement keeps approval for explicit resume only', async () => {
  const state = makeService();
  const approvedAt = new Date('2026-10-30T09:00:00.000Z');
  const advertisement = {
    _id: new Types.ObjectId(),
    propertyId: state.propertyId,
    agentId: state.agentId,
    status: PropertyAdvertisementStatus.ENDED,
    approvedAt,
    endedAt: new Date('2026-10-30T10:00:00.000Z'),
    async save() {},
  };
  state.advertisementsModel.findById = () => query(advertisement);
  let propertyStatus: unknown;
  state.propertyModel.updateOne = (
    _filter: unknown,
    update: Record<string, unknown>,
  ) => {
    propertyStatus = (update.$set as Record<string, unknown>).status;
    return query({ matchedCount: 1, modifiedCount: 1 });
  };

  await state.service.updateAdvertisementStatus(
    String(advertisement._id),
    PropertyAdvertisementStatus.PUBLISHED,
    { id: String(state.agentId), role: 'agent' },
  );

  assert.equal(advertisement.status, PropertyAdvertisementStatus.PUBLISHED);
  assert.equal(advertisement.approvedAt, approvedAt);
  assert.equal(propertyStatus, PropertyStatus.PUBLISHED);
});

test('analytics activity labels distinguish clicks from calls, chats, and property views', async () => {
  const state = makeService();
  const occurredAt = new Date('2026-10-30T09:00:00.000Z');
  state.propertyModel.find = () => query([]);
  state.advertisementsModel.find = () => query([{
    _id: new Types.ObjectId(),
    propertyId: null,
    status: PropertyAdvertisementStatus.PUBLISHED,
    submittedAt: occurredAt,
  }]);
  state.eventsModel.find = () => query([
    {
      _id: new Types.ObjectId(),
      type: PropertyAnalyticsEventType.CALL_CLICK,
      occurredAt,
      propertyId: { title: 'Call listing' },
    },
    {
      _id: new Types.ObjectId(),
      type: PropertyAnalyticsEventType.WHATSAPP_CLICK,
      occurredAt,
      propertyId: { title: 'WhatsApp listing' },
    },
    {
      _id: new Types.ObjectId(),
      type: PropertyAnalyticsEventType.PROPERTY_VIEW,
      occurredAt,
      propertyId: null,
    },
    {
      _id: new Types.ObjectId(),
      type: PropertyAnalyticsEventType.PROPERTY_VIEW,
      occurredAt,
      propertyId: { title: 'Viewed listing' },
    },
  ]);

  const activity = await state.service.getAgentRecentActivity(String(state.agentId));
  assert.deepEqual(
    activity.map((item) => item.title),
    [
      'Advertisement submitted',
      'Call button clicked',
      'WhatsApp button clicked',
      'Property viewed',
      'Property viewed',
    ],
  );
  assert.equal(activity[0].description, 'Property listing · published');
  assert.equal(activity[3].description, 'Property listing');
  assert.equal(activity[4].description, 'Viewed listing');
});

test('availability transitions end ads when inventory becomes unavailable and do not republish on return', async () => {
  const transitions = [
    { from: 'available', to: 'sold', expectedProperty: PropertyStatus.SOLD },
    { from: 'available', to: 'rented', expectedProperty: PropertyStatus.RENTED },
    { from: 'available', to: 'reserved', expectedProperty: PropertyStatus.RESERVED },
    { from: 'reserved', to: 'available', expectedProperty: PropertyStatus.AVAILABLE },
    { from: 'sold', to: 'available', expectedProperty: PropertyStatus.AVAILABLE },
    { from: 'rented', to: 'available', expectedProperty: PropertyStatus.AVAILABLE },
  ] as const;

  for (const transition of transitions) {
    const state = makeService();
    Object.assign(state.property, {
      status: transition.from === 'available'
        ? PropertyStatus.PUBLISHED
        : transition.from,
      inventoryStatus: transition.from,
    });
    const ad = {
      _id: new Types.ObjectId(),
      propertyId: state.propertyId,
      agentId: state.agentId,
      status: transition.from === 'available'
        ? PropertyAdvertisementStatus.PUBLISHED
        : PropertyAdvertisementStatus.ENDED,
      approvedAt: new Date(),
    };
    let propertyUpdate: Record<string, unknown> | undefined;
    state.propertyModel.updateOne = (
      _filter: unknown,
      update: Record<string, unknown>,
    ) => {
      propertyUpdate = update.$set as Record<string, unknown>;
      return query({ modifiedCount: 1 });
    };
    let advertisementUpdate: Record<string, unknown> | undefined;
    state.advertisementsModel.findOne = () => query(ad);
    state.advertisementsModel.updateOne = (
      _filter: unknown,
      update: Record<string, unknown>,
    ) => {
      advertisementUpdate = update.$set as Record<string, unknown>;
      return query({ modifiedCount: 1 });
    };

    await state.service.updateInventoryStatus(
      String(state.propertyId),
      transition.to,
      { id: String(state.agentId), role: 'agent' },
    );

    assert.equal(
      propertyUpdate?.status,
      transition.expectedProperty,
      transition.from + ' to ' + transition.to,
    );
    if (transition.to !== 'available') {
      assert.equal(advertisementUpdate?.status, PropertyAdvertisementStatus.ENDED);
    } else {
      assert.notEqual(propertyUpdate?.status, PropertyStatus.PUBLISHED);
      assert.equal(advertisementUpdate, undefined);
    }
  }
});

test('archive and restore require explicit confirmation', async () => {
  const state = makeService();
  await assert.rejects(
    state.service.archive(
      String(state.propertyId),
      { id: String(state.agentId), role: 'agent' },
      '',
    ),
    /Explicit archive confirmation/,
  );
  await assert.rejects(
    state.service.restore(
      String(state.propertyId),
      { id: String(state.agentId), role: 'agent' },
      '',
    ),
    /Explicit restore confirmation/,
  );
});
