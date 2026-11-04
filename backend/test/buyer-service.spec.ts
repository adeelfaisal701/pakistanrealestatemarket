import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Types } from 'mongoose';
import { BuyerService } from '../src/modules/buyer/buyer.service';
import { BuyerProfileSchema } from '../src/modules/buyer/schemas/buyer-profile.schema';

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

function makeService(overrides: {
  savedPropertyModel?: Record<string, unknown>;
  propertyModel?: Record<string, unknown>;
  advertisementModel?: Record<string, unknown>;
  requirementModel?: Record<string, unknown>;
  requirementOfferModel?: Record<string, unknown>;
  messagingService?: Record<string, unknown>;
} = {}) {
  return new BuyerService(
    {} as never,
    (overrides.propertyModel ?? {}) as never,
    (overrides.advertisementModel ?? {}) as never,
    (overrides.savedPropertyModel ?? {}) as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.requirementModel ?? {}) as never,
    (overrides.requirementOfferModel ?? {}) as never,
    (overrides.messagingService ?? {}) as never,
  );
}

test('saved-property ID hydration is scoped to the current buyer and returns string IDs', async () => {
  const buyerId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  const service = makeService({
    savedPropertyModel: {
      find: (queryFilter: Record<string, unknown>) => {
        filter = queryFilter;
        return query([{ propertyId }]);
      },
    },
  });

  const result = await service.getSavedPropertyIds(String(buyerId));
  assert.equal(String(filter?.buyerId), String(buyerId));
  assert.deepEqual(result, [String(propertyId)]);
});

test('saved-property list returns public Marketplace-like items with saved timestamps', async () => {
  const buyerId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const agentId = new Types.ObjectId();
  const savedAt = new Date('2026-10-30T12:00:00.000Z');
  const service = makeService({
    savedPropertyModel: {
      find: () =>
        query([{ _id: new Types.ObjectId(), propertyId, createdAt: savedAt }]),
    },
    advertisementModel: {
      find: () => query([{ propertyId, agentId }]),
    },
    propertyModel: {
      find: () =>
        query([
          {
            _id: propertyId,
            agentId,
            title: 'Saved home',
            description: 'Public listing',
            purpose: 'Sale',
            propertyType: 'House',
            price: 25000000,
            areaSize: 10,
            areaUnit: 'Marla',
            location: { city: 'Lahore', area: 'Gulberg' },
            features: { bedrooms: 3 },
            images: [],
            status: 'published',
            inventoryStatus: 'available',
            isFeatured: false,
            viewsCount: 0,
            createdAt: savedAt,
            updatedAt: savedAt,
          },
        ]),
    },
  });

  const result = await service.getSavedProperties(String(buyerId), 'recent');
  assert.equal(result.total, 1);
  assert.equal(result.items[0].propertyId, String(propertyId));
  assert.equal(result.items[0].savedAt, savedAt);
  assert.equal(result.items[0].property._id, String(propertyId));
  assert.deepEqual(result.items[0].property.location, {
    city: 'Lahore',
    area: 'Gulberg',
  });
  assert.equal(result.items[0].property.features.bedrooms, 3);
  assert.equal('agentId' in result.items[0].property, false);
});

test('buyer profile schema declares one unique buyer index without a conflicting duplicate', () => {
  const buyerIdIndexes = BuyerProfileSchema.indexes().filter(
    ([keys]) => 'buyerId' in keys,
  );
  assert.equal(buyerIdIndexes.length, 1);
  assert.equal(buyerIdIndexes[0][1].unique, true);
});
