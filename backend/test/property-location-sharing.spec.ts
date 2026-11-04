import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Types } from 'mongoose';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { UserRole } from '../src/modules/users/schemas/user.schema';
import { PropertiesController } from '../src/modules/properties/properties.controller';
import { ManagePropertyLocationDto } from '../src/modules/properties/dto/manage-property-location.dto';
import { CreatePropertyDto } from '../src/modules/properties/dto/create-property.dto';
import { PropertiesService } from '../src/modules/properties/properties.service';
import {
  decryptPrivateLocation,
  encryptPrivateLocation,
  hashLocationShareToken,
  toPublicProperty,
} from '../src/modules/properties/property-location-sharing.utils';
import { PropertyStatus } from '../src/modules/properties/schemas/property.schema';

const testEncryptionKey = Buffer.alloc(32, 7).toString('base64');
const agentId = new Types.ObjectId().toHexString();
const recipientId = new Types.ObjectId().toHexString();
const otherUserId = new Types.ObjectId().toHexString();
const propertyId = new Types.ObjectId().toHexString();
const shareId = new Types.ObjectId().toHexString();
const advertisementPublishedAt = new Date('2026-10-29T08:00:00.000Z');

function makeQuery(result: unknown) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'populate', 'sort', 'skip', 'limit', 'lean']) {
    query[method] = () => query;
  }
  query.exec = async () => result;
  return query;
}

function makePublishedProperty(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(propertyId),
    title: 'Synthetic QA listing',
    status: PropertyStatus.PUBLISHED,
    inventoryStatus: 'available',
    agentId: new Types.ObjectId(agentId),
    location: {
      city: 'Lahore',
      area: 'Synthetic QA society',
      address: 'Legacy private address',
      latitude: 31.52,
      longitude: 74.36,
    },
    privateLocation: {
      encryptedData: encryptPrivateLocation(
        {
          address: 'Private QA entrance',
          latitude: 31.521,
          longitude: 74.361,
        },
        testEncryptionKey,
      ),
    },
    toObject() {
      return { ...this };
    },
    ...overrides,
  };
}

function makeService(options: {
  property?: Record<string, unknown>;
  share?: Record<string, unknown>;
  advertisement?: Record<string, unknown> | null;
  recipient?: { id: string; role: string } | null;
  config?: Record<string, string | number>;
} = {}) {
  const property: Record<string, unknown> =
    options.property ?? makePublishedProperty();
  const savedShares: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const revokedShares: Record<string, unknown>[] = [];
  const advertisement = options.advertisement === undefined
    ? {
        _id: new Types.ObjectId(),
        propertyId: new Types.ObjectId(propertyId),
        agentId: new Types.ObjectId(agentId),
        status: 'published',
        publishedAt: advertisementPublishedAt,
        updatedAt: advertisementPublishedAt,
      }
    : options.advertisement;
  const propertyModel = {
    find: () => makeQuery([property]),
    findById: () => makeQuery(property),
    findOne: () =>
      makeQuery(
        property.status === PropertyStatus.PUBLISHED &&
          property.inventoryStatus === 'available' &&
          !property.agentArchived &&
          !property.adminHidden &&
          !property.adminRemoved
          ? property
          : null,
      ),
    findOneAndUpdate: () => makeQuery(property),
    countDocuments: () => makeQuery(1),
    findByIdAndUpdate: (_id: string, update: Record<string, unknown>) => {
      updates.push(update);
      return makeQuery(property);
    },
  };
  const locationShareModel = {
    create: async (value: Record<string, unknown>) => {
      savedShares.push(value);
      return { _id: new Types.ObjectId(shareId), ...value };
    },
    find: () => makeQuery([]),
    findOne: () => makeQuery(options.share ?? null),
    findOneAndUpdate: () => makeQuery({ _id: shareId }),
    exists: () => makeQuery({ _id: shareId }),
    updateMany: (filter: Record<string, unknown>) => {
      revokedShares.push(filter);
      return makeQuery({ modifiedCount: 1 });
    },
  };
  const advertisementModel = {
    findOne: () => makeQuery(advertisement),
    find: () => makeQuery([]),
  };
  const usersService = {
    findBuyerIdentityByEmail: async () => options.recipient ?? {
      id: recipientId,
      role: UserRole.BUYER,
    },
  };
  const defaultConfig: Record<string, string | number> = {
    'propertyLocationShare.ttlHours': 24,
    'propertyLocationShare.frontendBaseUrl': 'http://localhost:3000',
    'propertyLocationShare.encryptionKey': testEncryptionKey,
  };
  const configService = {
    get: (key: string) => options.config?.[key] ?? defaultConfig[key],
  };
  const service = new PropertiesService(
    propertyModel as never,
    { create: async () => ({}) } as never,
    locationShareModel as never,
    usersService as never,
    configService as never,
    {} as never,
    advertisementModel as never,
  );
  return {
    service,
    propertyModel,
    locationShareModel,
    savedShares,
    updates,
    revokedShares,
  };
}

test('private location encryption authenticates ciphertext and rejects tampering', () => {
  const location = {
    latitude: 31.521,
    longitude: 74.361,
    address: 'Private QA entrance',
  };
  const encrypted = encryptPrivateLocation(location, testEncryptionKey);
  const parts = encrypted.split('.');
  parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`;

  assert.deepEqual(decryptPrivateLocation(encrypted, testEncryptionKey), location);
  assert.notEqual(encrypted.includes(location.address), true);
  assert.throws(() => decryptPrivateLocation(parts.join('.'), testEncryptionKey));
});

const validationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

test('public property projection omits exact and private location fields', () => {
  const property = makePublishedProperty({
    privateLocation: { latitude: 1.23, longitude: 4.56, address: 'secret' },
    moderationNotes: 'private moderation note',
  });
  const response = toPublicProperty(property);
  const serialized = JSON.stringify(response);

  assert.deepEqual(response.location, {
    city: 'Lahore',
    area: 'Synthetic QA society',
  });
  assert.equal(serialized.includes('latitude'), false);
  assert.equal(serialized.includes('longitude'), false);
  assert.equal(serialized.includes('Legacy private address'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(serialized.includes('moderationNotes'), false);
});

test('public property detail preserves its listing images and public agent fields', () => {
  const property = makePublishedProperty({
    _id: new Types.ObjectId(propertyId),
    description: 'Actual listing description',
    images: ['https://example.test/one.jpg', 'https://example.test/two.jpg'],
    agentId: {
      _id: new Types.ObjectId(agentId),
      name: 'Public Agent',
      phone: '+923001234567',
      agencyName: 'Example Realty',
      email: 'private@example.test',
    },
  });
  const response = toPublicProperty(property);
  const serialized = JSON.stringify(response);

  assert.equal(String(response._id), propertyId);
  assert.equal(response.description, 'Actual listing description');
  assert.deepEqual(response.images, [
    'https://example.test/one.jpg',
    'https://example.test/two.jpg',
  ]);
  assert.equal(serialized.includes('Public Agent'), true);
  assert.equal(serialized.includes('private@example.test'), false);
  assert.equal(serialized.includes('latitude'), false);
  assert.equal(serialized.includes('longitude'), false);
});

test('public property listing service sanitizes every returned record', async () => {
  const { service } = makeService();
  const result = await service.findAll({} as never);

  assert.equal(result.data.length, 1);
  assert.deepEqual(result.data[0].location, {
    city: 'Lahore',
    area: 'Synthetic QA society',
  });
  assert.equal(JSON.stringify(result).includes('latitude'), false);
});

test('valid buyer-directed share stores only a token hash and returns a fragment URL', async () => {
  const { service, savedShares } = makeService({
    config: {
      'propertyLocationShare.ttlHours': 12,
      'propertyLocationShare.frontendBaseUrl': 'https://market.example.test',
    },
  });
  const result = await service.createLocationShare(
    propertyId,
    { id: agentId, role: UserRole.AGENT },
    { recipientEmail: 'buyer@example.test' },
  );
  const token = new URLSearchParams(new URL(result.shareUrl).hash.slice(1)).get(
    'token',
  );

  assert.ok(token);
  assert.equal(token.length, 43);
  assert.equal(savedShares.length, 1);
  assert.equal(savedShares[0].tokenHash, hashLocationShareToken(token));
  assert.notEqual(savedShares[0].tokenHash, token);
  assert.equal(savedShares[0].recipientId.toString(), recipientId);
  assert.equal(
    (savedShares[0].advertisementPublishedAt as Date).getTime(),
    advertisementPublishedAt.getTime(),
  );
  assert.ok(
    (savedShares[0].expiresAt as Date).getTime() - Date.now() <=
      12 * 60 * 60 * 1000,
  );
});

test('a different agent cannot create a location share for another agent property', async () => {
  const { service, savedShares } = makeService();

  await assert.rejects(
    service.createLocationShare(
      propertyId,
      { id: otherUserId, role: UserRole.AGENT },
      { recipientEmail: 'buyer@example.test' },
    ),
    NotFoundException,
  );
  assert.equal(savedShares.length, 0);
});

test('location shares cannot use legacy unencrypted coordinates', async () => {
  const { service, savedShares } = makeService({
    property: makePublishedProperty({ privateLocation: undefined }),
  });

  await assert.rejects(
    service.createLocationShare(
      propertyId,
      { id: agentId, role: UserRole.AGENT },
      { recipientEmail: 'buyer@example.test' },
    ),
    BadRequestException,
  );
  assert.equal(savedShares.length, 0);
});

test('location shares cannot be created for archived, hidden, removed, or unavailable properties', async (t) => {
  const scenarios = [
    { name: 'archived property', overrides: { agentArchived: true } },
    { name: 'admin-hidden property', overrides: { adminHidden: true } },
    { name: 'admin-removed property', overrides: { adminRemoved: true } },
    { name: 'reserved property', overrides: { inventoryStatus: 'reserved' } },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const { service, savedShares } = makeService({
        property: makePublishedProperty(scenario.overrides),
      });

      await assert.rejects(
        service.createLocationShare(
          propertyId,
          { id: agentId, role: UserRole.AGENT },
          { recipientEmail: 'buyer@example.test' },
        ),
        BadRequestException,
      );
      assert.equal(savedShares.length, 0);
    });
  }
});

test('saving exact location persists ciphertext and clears legacy exact fields', async () => {
  const { service, updates } = makeService();

  const result = await service.savePrivateLocation(
    propertyId,
    { id: agentId, role: UserRole.AGENT },
    {
      latitude: 31.522,
      longitude: 74.362,
      address: 'Updated private entrance',
    },
  );

  assert.deepEqual(result, { saved: true });
  const update = updates[0] as {
    $set: { privateLocation: { encryptedData: string } };
    $unset: Record<string, number>;
  };
  assert.deepEqual(
    decryptPrivateLocation(
      update.$set.privateLocation.encryptedData,
      testEncryptionKey,
    ),
    {
      latitude: 31.522,
      longitude: 74.362,
      address: 'Updated private entrance',
    },
  );
  assert.equal(
    JSON.stringify(update).includes('Updated private entrance'),
    false,
  );
  assert.deepEqual(Object.keys(update.$unset).sort(), [
    'location.address',
    'location.latitude',
    'location.longitude',
  ]);
});

test('location save is unavailable when the encryption key is missing', async () => {
  const { service } = makeService({
    config: { 'propertyLocationShare.encryptionKey': '' },
  });

  await assert.rejects(
    service.savePrivateLocation(
      propertyId,
      { id: agentId, role: UserRole.AGENT },
      { latitude: 31.522, longitude: 74.362 },
    ),
    ServiceUnavailableException,
  );
});

test('location links cannot be issued to an unregistered buyer account', async () => {
  const { service, savedShares } = makeService({
    recipient: { id: otherUserId, role: UserRole.AGENT },
  });

  await assert.rejects(
    service.createLocationShare(
      propertyId,
      { id: agentId, role: UserRole.AGENT },
      { recipientEmail: 'agent@example.test' },
    ),
    BadRequestException,
  );
  assert.equal(savedShares.length, 0);
});

test('a valid share returns exact location only to its bound recipient', async () => {
  const token = 'A'.repeat(43);
  const { service } = makeService({
    share: {
      propertyId: new Types.ObjectId(propertyId),
      recipientId: new Types.ObjectId(recipientId),
      tokenHash: hashLocationShareToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      advertisementPublishedAt,
    },
    property: makePublishedProperty({
      agentId: {
        _id: new Types.ObjectId(agentId),
        name: 'Synthetic Agent',
        phone: '+923001234567',
      },
    }),
  });

  const result = await service.accessPrivateLocation(token, {
    id: recipientId,
  });
  assert.deepEqual(result.location, {
    latitude: 31.521,
    longitude: 74.361,
    address: 'Private QA entrance',
  });
  assert.equal(result.property.agent.name, 'Synthetic Agent');
});

test('a share cannot fall back to legacy unencrypted coordinates', async () => {
  const token = 'C'.repeat(43);
  const { service } = makeService({
    share: {
      propertyId: new Types.ObjectId(propertyId),
      recipientId: new Types.ObjectId(recipientId),
      tokenHash: hashLocationShareToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    },
    property: makePublishedProperty({
      privateLocation: undefined,
    }),
  });

  await assert.rejects(
    service.accessPrivateLocation(token, { id: recipientId }),
    NotFoundException,
  );
});

test('a share is denied while its property is admin hidden', async () => {
  const token = 'D'.repeat(43);
  const { service } = makeService({
    share: {
      propertyId: new Types.ObjectId(propertyId),
      recipientId: new Types.ObjectId(recipientId),
      tokenHash: hashLocationShareToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      advertisementPublishedAt,
    },
    property: makePublishedProperty({ adminHidden: true }),
  });

  await assert.rejects(
    service.accessPrivateLocation(token, { id: recipientId }),
    NotFoundException,
  );
});

test('an old share cannot be reused after the advertisement is republished', async () => {
  const token = 'E'.repeat(43);
  const { service } = makeService({
    share: {
      propertyId: new Types.ObjectId(propertyId),
      recipientId: new Types.ObjectId(recipientId),
      tokenHash: hashLocationShareToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      advertisementPublishedAt,
    },
    advertisement: {
      status: 'published',
      publishedAt: new Date(advertisementPublishedAt.getTime() + 1_000),
    },
  });

  await assert.rejects(
    service.accessPrivateLocation(token, { id: recipientId }),
    NotFoundException,
  );
});

test('invalid, expired, revoked, and forwarded links are rejected', async (t) => {
  const token = 'B'.repeat(43);
  const scenarios = [
    { name: 'invalid token', share: null, requester: recipientId },
    {
      name: 'expired token',
      share: {
        recipientId: new Types.ObjectId(recipientId),
        expiresAt: new Date(Date.now() - 1),
        revokedAt: null,
      },
      requester: recipientId,
    },
    {
      name: 'revoked token',
      share: {
        recipientId: new Types.ObjectId(recipientId),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
      },
      requester: recipientId,
    },
    {
      name: 'token forwarded to another account',
      share: {
        recipientId: new Types.ObjectId(recipientId),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      },
      requester: otherUserId,
    },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const { service } = makeService({
        share: scenario.share
          ? {
              propertyId: new Types.ObjectId(propertyId),
              tokenHash: hashLocationShareToken(token),
              ...scenario.share,
            }
          : null,
      });
      await assert.rejects(
        service.accessPrivateLocation(token, { id: scenario.requester }),
        NotFoundException,
      );
    });
  }
});

test('only agent and admin roles are allowed on management endpoints', () => {
  const handler = PropertiesController.prototype.createLocationShare;
  const roles = Reflect.getMetadata(ROLES_KEY, handler) as string[];
  const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];

  assert.deepEqual(roles, [UserRole.AGENT, UserRole.ADMIN]);
  assert.ok(guards.includes(RolesGuard));
});

test('public property creation rejects exact coordinates in the approximate location', async () => {
  const payload = {
    title: 'Synthetic listing',
    description: 'Synthetic description',
    purpose: 'Sale',
    propertyType: 'House',
    price: 1,
    areaSize: 1,
    areaUnit: 'Marla',
    location: {
      city: 'Lahore',
      area: 'Synthetic society',
      latitude: 31.52,
      longitude: 74.36,
    },
  };

  await assert.rejects(
    validationPipe.transform(payload, {
      type: 'body',
      metatype: CreatePropertyDto,
    }),
    BadRequestException,
  );
});

test('private location DTO rejects coordinates outside geographic bounds', async () => {
  await assert.rejects(
    validationPipe.transform(
      { latitude: 91, longitude: 74 },
      { type: 'body', metatype: ManagePropertyLocationDto },
    ),
    BadRequestException,
  );
});
