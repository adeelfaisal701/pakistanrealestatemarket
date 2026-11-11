import 'reflect-metadata';
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { UsersService } from '../src/modules/users/users.service';

test('featured agencies include only their matching saved logo and cover URLs', async () => {
  const agencies = [
    { name: 'Both Images Realty', agentCount: 2, locations: [], officeAddresses: [] },
    { name: 'Logo Only Estates', agentCount: 1, locations: [], officeAddresses: [] },
    { name: 'Cover Only Properties', agentCount: 1, locations: [], officeAddresses: [] },
    { name: 'No Images Agency', agentCount: 1, locations: [], officeAddresses: [] },
  ];
  const profiles = [
    {
      normalizedName: 'both images realty',
      logoUrl: '/api/v1/properties/images/logo-a.webp',
      coverImageUrl: '/api/v1/properties/images/cover-a.webp',
    },
    {
      normalizedName: 'logo only estates',
      logoUrl: '/api/v1/properties/images/logo-b.webp',
    },
    {
      normalizedName: 'cover only properties',
      coverImageUrl: '/api/v1/properties/images/cover-c.webp',
    },
  ];
  const userModel = {
    aggregate: () => ({ exec: async () => agencies }),
  };
  const agencyModel = {
    find: (filter: Record<string, unknown>) => ({
      select() {
        return this;
      },
      lean() {
        return this;
      },
      exec: async () => ('status' in filter ? [] : profiles),
    }),
    findOne: () => ({
      select() { return this; },
      lean() { return this; },
      exec: async () => null,
    }),
  };
  const service = new UsersService(userModel as never, agencyModel as never);

  assert.deepEqual(await service.findPublicAgencies(), [
    {
      ...agencies[0],
      logoUrl: '/api/v1/properties/images/logo-a.webp',
      coverImageUrl: '/api/v1/properties/images/cover-a.webp',
    },
    {
      ...agencies[1],
      logoUrl: '/api/v1/properties/images/logo-b.webp',
    },
    {
      ...agencies[2],
      coverImageUrl: '/api/v1/properties/images/cover-c.webp',
    },
    agencies[3],
  ]);
});
