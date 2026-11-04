import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { PropertiesService } from '../src/modules/properties/properties.service';
import { BuyerNotificationType } from '../src/modules/buyer/schemas/buyer-notification.schema';
import { SavedSearchFrequency } from '../src/modules/buyer/schemas/saved-search.schema';
import { PropertyStatus } from '../src/modules/properties/schemas/property.schema';

function query<T>(value: T) {
  const result: Record<string, unknown> = {
    select: () => result,
    populate: () => result,
    sort: () => result,
    limit: () => result,
    lean: () => result,
    exec: async () => value,
  };
  return result;
}

test('a price change persists an instant, deduplicated in-app notification for matching searches', async () => {
  const propertyId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const buyerId = new Types.ObjectId();
  const savedSearchId = new Types.ObjectId();
  const priorProperty = {
    _id: propertyId,
    agentId,
    title: 'Public house',
    price: 100,
    status: PropertyStatus.PUBLISHED,
    inventoryStatus: 'available',
  };
  const updatedProperty = {
    ...priorProperty,
    price: 90,
    updatedAt: new Date('2026-10-30T12:00:00.000Z'),
  };
  let notification: Record<string, unknown> | undefined;
  const savedSearch = {
    _id: savedSearchId,
    buyerId,
    frequency: SavedSearchFrequency.INSTANT,
    alertsEnabled: true,
    filters: { city: 'Lahore' },
    save: async () => undefined,
  };
  const propertyModel = {
    findById: () => query(priorProperty),
    findByIdAndUpdate: () => query(updatedProperty),
    findOne: () => query(updatedProperty),
    exists: () => query({ _id: propertyId }),
  };
  const service = new PropertiesService(
    propertyModel as never,
    {} as never,
    {} as never,
    {} as never,
    new ConfigService(),
    {} as never,
    { findOne: () => query({ _id: new Types.ObjectId() }) } as never,
    { find: () => query([savedSearch]) } as never,
    { create: async (value: Record<string, unknown>) => (notification = value) } as never,
    { find: () => query([]) } as never,
  );

  await service.update(
    String(propertyId),
    { features: {}, price: 90 } as never,
    { id: String(agentId), role: 'agent' },
  );

  assert.equal(notification?.buyerId, buyerId);
  assert.equal(notification?.savedSearchId, savedSearchId);
  assert.equal(notification?.type, BuyerNotificationType.PRICE_CHANGED);
  assert.equal(notification?.propertyId, propertyId);
  assert.equal(
    notification?.dedupeKey,
    `saved-search:${String(savedSearchId)}:${BuyerNotificationType.PRICE_CHANGED}:${updatedProperty.updatedAt.toISOString()}`,
  );
});
