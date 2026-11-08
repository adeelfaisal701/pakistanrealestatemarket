import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import { PropertyImageStorageService } from '../src/modules/properties/property-image-storage.service';
import { QueryPropertyDto } from '../src/modules/properties/dto/query-property.dto';
import { PropertiesService } from '../src/modules/properties/properties.service';
import {
  Property,
  PropertyDocument,
  PropertyStatus,
} from '../src/modules/properties/schemas/property.schema';
import { UsersService } from '../src/modules/users/users.service';

function createService(usersService: Pick<UsersService, 'findPublicAgentIdsForAgency'>) {
  const filters: Record<string, unknown>[] = [];
  const query = {
    sort: () => query,
    skip: () => query,
    limit: () => query,
    populate: () => query,
    exec: async () => [],
  };
  const propertyModel = {
    find: (filter: Record<string, unknown>) => {
      filters.push(filter);
      return query;
    },
    countDocuments: (filter: Record<string, unknown>) => {
      filters.push(filter);
      return { exec: async () => 0 };
    },
  };
  const service = new PropertiesService(
    propertyModel as unknown as Model<PropertyDocument>,
    {} as Model<never>,
    {} as Model<never>,
    usersService as UsersService,
    {} as ConfigService,
    {} as PropertyImageStorageService,
  );
  return { service, filters };
}

test('public agent listing filters retain published visibility restrictions', async () => {
  const { service, filters } = createService({ findPublicAgentIdsForAgency: async () => [] });

  await service.findAll({ agentId: '0123456789abcdef01234567' } as QueryPropertyDto);

  assert.equal(filters.length, 2);
  assert.equal(filters[0].status, PropertyStatus.PUBLISHED);
  assert.deepEqual(filters[0].adminHidden, { $ne: true });
  assert.deepEqual(filters[0].adminRemoved, { $ne: true });
  assert.deepEqual(filters[0].agentArchived, { $ne: true });
  assert.equal(String(filters[0].agentId), '0123456789abcdef01234567');
});

test('public agency listings resolve actual complete agent ids', async () => {
  let queriedAgency = '';
  const { service, filters } = createService({
    findPublicAgentIdsForAgency: async (name) => {
      queriedAgency = name;
      return ['0123456789abcdef01234567', 'fedcba9876543210fedcba98'];
    },
  });

  await service.findAll({ agencyName: 'Estate Group' } as QueryPropertyDto);

  const agentIds = filters[0].agentId as { $in: Array<{ toString(): string }> };
  assert.equal(queriedAgency, 'Estate Group');
  assert.deepEqual(agentIds.$in.map((id) => id.toString()), [
    '0123456789abcdef01234567',
    'fedcba9876543210fedcba98',
  ]);
});

test('public listing filters reject simultaneous agent and agency selectors', async () => {
  const { service, filters } = createService({ findPublicAgentIdsForAgency: async () => [] });

  await assert.rejects(
    service.findAll({
      agentId: '0123456789abcdef01234567',
      agencyName: 'Estate Group',
    } as QueryPropertyDto),
    BadRequestException,
  );
  assert.equal(filters.length, 0);
});
