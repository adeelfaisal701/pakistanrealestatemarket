import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateSavedSearchDto } from '../src/modules/buyer/dto/create-saved-search.dto';
import { UpdateBuyerProfileDto } from '../src/modules/buyer/dto/update-buyer-profile.dto';
import {
  buildPropertySearchFilter,
  normalizeSearchFilters,
} from '../src/modules/buyer/buyer-search.utils';

test('saved-search filters accept supported string values and build public listing criteria', () => {
  const filters = normalizeSearchFilters({
    city: '  Lahore ',
    purpose: 'Sale',
    propertyType: 'House',
    minPrice: '1000000',
    maxPrice: '9000000',
    bedrooms: '3',
  });

  assert.deepEqual(filters, {
    city: 'Lahore',
    purpose: 'Sale',
    propertyType: 'House',
    minPrice: '1000000',
    maxPrice: '9000000',
    bedrooms: '3',
  });
  assert.deepEqual(buildPropertySearchFilter(filters), {
    status: 'published',
    inventoryStatus: 'available',
    adminHidden: { $ne: true },
    adminRemoved: { $ne: true },
    agentArchived: { $ne: true },
    'location.city': /Lahore/i,
    purpose: 'Sale',
    propertyType: 'House',
    'features.bedrooms': 3,
    price: { $gte: 1000000, $lte: 9000000 },
  });
});

test('saved-search filters reject unknown keys and malformed or unsafe ranges', () => {
  assert.throws(
    () => normalizeSearchFilters({ agentId: '012345678901234567890123' }),
    BadRequestException,
  );
  assert.throws(
    () => normalizeSearchFilters({ city: '.*' , minPrice: '100', maxPrice: '10' }),
    BadRequestException,
  );
  assert.throws(
    () => normalizeSearchFilters({ propertyType: 'untrusted' }),
    BadRequestException,
  );
  assert.equal(
    (buildPropertySearchFilter(normalizeSearchFilters({ city: '.*' }))[
      'location.city'
    ] as RegExp).source,
    '\\.\\*',
  );
});

test('saved-search request DTO refuses client-supplied ownership fields', async () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  await assert.rejects(
    validationPipe.transform(
      {
        name: 'Lahore houses',
        filters: { city: 'Lahore' },
        frequency: 'instant',
        buyerId: '012345678901234567890123',
      },
      { type: 'body', metatype: CreateSavedSearchDto },
    ),
    BadRequestException,
  );
});

test('buyer profile patches reject null required fields and non-boolean notification preferences', async () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const metadata = { type: 'body' as const, metatype: UpdateBuyerProfileDto };
  await assert.rejects(
    validationPipe.transform({ name: null }, metadata),
    BadRequestException,
  );
  await assert.rejects(
    validationPipe.transform(
      { preferences: { notifications: { inApp: 'false' } } },
      metadata,
    ),
    BadRequestException,
  );
});
