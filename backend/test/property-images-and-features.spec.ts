import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { GUARDS_METADATA, INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { UserRole } from '../src/modules/users/schemas/user.schema';
import {
  PropertyDocument,
  PropertyStatus,
} from '../src/modules/properties/schemas/property.schema';
import { CreatePropertyDto } from '../src/modules/properties/dto/create-property.dto';
import { QueryPropertyDto } from '../src/modules/properties/dto/query-property.dto';
import { PropertyImageStorageService } from '../src/modules/properties/property-image-storage.service';
import { PropertiesService } from '../src/modules/properties/properties.service';
import { PropertiesController } from '../src/modules/properties/properties.controller';
import type { Response } from 'express';
import sharp = require('sharp');

const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVR4nGMIaDoR0HSCAYUCAGIrCZ34E9WjAAAAAElFTkSuQmCC',
  'base64',
);

function createStorage(directory: string) {
  return new PropertyImageStorageService(
    new ConfigService({
      propertyImages: {
        storageDir: directory,
        publicBaseUrl: 'https://api.example.test/api/v1',
      },
    }),
  );
}

function pngFile(contents = TEST_PNG) {
  return {
    originalname: 'home.png',
    mimetype: 'image/png',
    size: contents.length,
    buffer: contents,
  };
}

async function jpegWithExif(exif: {
  IFD0: Record<string, string>;
  GPS?: Record<string, string>;
}) {
  const buffer = await sharp({
    create: {
      width: 40,
      height: 20,
      channels: 3,
      background: { r: 120, g: 60, b: 30 },
    },
  })
    .jpeg()
    .withExif(exif)
    .toBuffer();
  return {
    originalname: 'home.jpg',
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
  };
}

test('property image URLs persist on disk and are readable after storage restart', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-storage-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const firstStorage = createStorage(directory);
  const saved = await firstStorage.save(pngFile());
  const filename = saved.filename;

  const restartedStorage = createStorage(directory);
  const image = await restartedStorage.read(filename);
  assert.equal(image.contentType, 'image/png');
  assert.equal((await sharp(image.buffer).metadata()).format, 'png');
  assert.match(saved.url, /^https:\/\/api\.example\.test\/api\/v1\/properties\/images\//);
});

test('JPEG upload strips EXIF GPS metadata', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-gps-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);
  const file = await jpegWithExif({
    IFD0: { Make: 'Fixture Camera', Model: 'Fixture Device' },
    GPS: {
      GPSLatitudeRef: 'N',
      GPSLatitude: '33/1,41/1,0/1',
      GPSLongitudeRef: 'E',
      GPSLongitude: '73/1,3/1,0/1',
    },
  });
  assert.ok((await sharp(file.buffer).metadata()).exif?.length);

  const saved = await storage.save(file);
  const output = await storage.read(saved.filename);
  assert.equal((await sharp(output.buffer).metadata()).exif, undefined);
});

test('JPEG upload strips camera and device EXIF metadata', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-camera-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);
  const file = await jpegWithExif({
    IFD0: {
      Make: 'Fixture Camera',
      Model: 'Fixture Device',
      DateTime: '2026:01:02 03:04:05',
      Artist: 'Generated Test Fixture',
    },
  });
  assert.ok((await sharp(file.buffer).metadata()).exif?.length);

  const saved = await storage.save(file);
  const output = await storage.read(saved.filename);
  assert.equal((await sharp(output.buffer).metadata()).exif, undefined);
});

test('JPEG upload applies EXIF orientation before stripping metadata', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-orientation-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);
  const base = await jpegWithExif({ IFD0: { Make: 'Fixture Camera' } });
  const orientedBuffer = await sharp(base.buffer)
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const file = { ...base, size: orientedBuffer.length, buffer: orientedBuffer };

  const saved = await storage.save(file);
  const output = await storage.read(saved.filename);
  const metadata = await sharp(output.buffer).metadata();
  assert.equal(metadata.width, 20);
  assert.equal(metadata.height, 40);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.exif, undefined);
});

test('PNG upload remains PNG without adding EXIF metadata', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-png-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);

  const saved = await storage.save(pngFile());
  const output = await storage.read(saved.filename);
  const metadata = await sharp(output.buffer).metadata();
  assert.equal(saved.contentType, 'image/png');
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.exif, undefined);
});

test('WebP upload remains WebP and strips EXIF metadata', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-webp-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);
  const buffer = await sharp({
    create: {
      width: 8,
      height: 6,
      channels: 3,
      background: { r: 20, g: 90, b: 140 },
    },
  })
    .webp()
    .withExif({ IFD0: { Make: 'Fixture Camera' } })
    .toBuffer();

  const saved = await storage.save({
    originalname: 'home.webp',
    mimetype: 'image/webp',
    size: buffer.length,
    buffer,
  });
  const output = await storage.read(saved.filename);
  const metadata = await sharp(output.buffer).metadata();
  assert.equal(saved.contentType, 'image/webp');
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.exif, undefined);
});

test('unsupported and malformed uploads are rejected without publishing files', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-invalid-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);

  await assert.rejects(
    storage.save({
      originalname: 'home.gif',
      mimetype: 'image/gif',
      size: 6,
      buffer: Buffer.from('GIF89a'),
    }),
    BadRequestException,
  );
  await assert.rejects(
    storage.save({
      originalname: 'broken.jpg',
      mimetype: 'image/jpeg',
      size: 3,
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    }),
    BadRequestException,
  );
  assert.deepEqual(await readdir(directory), []);
});

test('image processing failures leave no temporary files', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-processing-failure-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);

  await assert.rejects(
    storage.save({
      originalname: 'broken.jpg',
      mimetype: 'image/jpeg',
      size: 3,
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    }),
    BadRequestException,
  );
  assert.deepEqual(await readdir(directory), []);
});

test('image endpoint writes original image bytes with image response headers', async () => {
  const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const controller = new PropertiesController({
    readImage: async () => ({ buffer: imageBytes, contentType: 'image/jpeg' }),
  } as never);
  const state: {
    status?: number;
    headers?: Record<string, unknown>;
    body?: Buffer;
  } = {};
  const response = {
    status(value: number) {
      state.status = value;
      return this;
    },
    set(headers: Record<string, unknown>) {
      state.headers = headers;
      return this;
    },
    send(body: Buffer) {
      state.body = body;
      return this;
    },
  };

  await controller.getImage(
    '3f634c49-24fa-4be8-8fb8-3912d3c5d4f3.jpg',
    response as unknown as Response,
  );
  assert.equal(state.status, 200);
  assert.equal(state.headers?.['Content-Type'], 'image/jpeg');
  assert.equal(state.headers?.['X-Content-Type-Options'], 'nosniff');
  assert.deepEqual(state.body, imageBytes);
});

test('property image storage rejects mismatched types, oversized files, and path traversal', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-validation-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);

  await assert.rejects(
    storage.save({ ...pngFile(), mimetype: 'image/jpeg' }),
    BadRequestException,
  );
  const oversized = Buffer.alloc(10 * 1024 * 1024 + 1);
  await assert.rejects(
    storage.save(pngFile(oversized)),
    BadRequestException,
  );
  await assert.rejects(storage.read('../../package.json'), NotFoundException);
});

test('listing feature DTO accepts structured counts and rejects wrongly typed groups', async () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const valid = {
    title: 'Family home',
    description: 'A property description.',
    purpose: 'Sale',
    propertyType: 'House',
    price: 25000000,
    areaSize: 5,
    areaUnit: 'Marla',
    location: { city: 'Lahore', area: 'DHA' },
    features: {
      bedrooms: 3,
      bathrooms: 3,
      rooms: { tvLounges: 2, kitchens: 2, storeRooms: 3 },
      outdoor: { openParking: 4 },
      interior: ['marbleFlooring', 'solarSystem'],
      community: ['gatedCommunity'],
      nearby: ['school', 'hospital'],
    },
  };
  const result = await validationPipe.transform(valid, {
    type: 'body',
    metatype: CreatePropertyDto,
  });
  assert.ok(result instanceof CreatePropertyDto);

  await assert.rejects(
    validationPipe.transform(
      { ...valid, features: { ...valid.features, rooms: [] } },
      { type: 'body', metatype: CreatePropertyDto },
    ),
  );
});

test('listing creation rejects unknown feature keys rather than dropping them', async () => {
  class MockPropertyModel {
    constructor(public data: Record<string, unknown>) {}
    async save() { return this; }
  }
  const service = new PropertiesService(
    MockPropertyModel as unknown as Model<PropertyDocument>,
    {} as Model<never>,
    {} as Model<never>,
    {} as never,
    {} as ConfigService,
    {} as PropertyImageStorageService,
  );

  await assert.rejects(
    service.create(
      {
        title: 'Family home',
        description: 'A property description.',
        purpose: 'Sale',
        propertyType: 'House',
        price: 25000000,
        areaSize: 5,
        areaUnit: 'Marla',
        location: { city: 'Lahore', area: 'DHA' },
        features: { rooms: { unknownRoom: 2 } },
      } as CreatePropertyDto,
      new Types.ObjectId().toString(),
    ),
    BadRequestException,
  );
});

test('listing edits persist structured features without replacing image references', async () => {
  const propertyId = new Types.ObjectId().toString();
  const ownerId = new Types.ObjectId().toString();
  const property = {
    _id: new Types.ObjectId(propertyId),
    agentId: new Types.ObjectId(ownerId),
    images: ['https://images.example.test/legacy.jpg'],
    imageMetadata: [],
    status: PropertyStatus.PENDING_APPROVAL,
  };
  const model = {
    findById() {
      return {
        select() { return this; },
        populate() { return this; },
        async exec() { return property; },
      };
    },
    findByIdAndUpdate(_id: string, update: { $set: Record<string, unknown> }) {
      return {
        async exec() {
          Object.assign(property, update.$set);
          return property;
        },
      };
    },
  };
  const service = new PropertiesService(
    model as unknown as Model<PropertyDocument>,
    {} as Model<never>,
    {} as Model<never>,
    {} as never,
    {} as ConfigService,
    {} as PropertyImageStorageService,
  );
  await service.update(
    propertyId,
    {
      title: 'Updated home',
      description: 'Updated description.',
      purpose: 'Sale',
      propertyType: 'House',
      price: 25000000,
      areaSize: 5,
      areaUnit: 'Marla',
      location: { city: 'Lahore', area: 'DHA' },
      features: {
        bedrooms: 3,
        bathrooms: 2,
        rooms: { tvLounges: 2, kitchens: 2 },
        interior: ['solarSystem'],
        nearby: ['school'],
      },
    } as CreatePropertyDto,
    { id: ownerId, role: 'agent' },
  );

  assert.deepEqual(property.images, ['https://images.example.test/legacy.jpg']);
  assert.deepEqual(
    (property as { features?: { rooms?: Record<string, number> } }).features?.rooms,
    { tvLounges: 2, kitchens: 2 },
  );
  await assert.rejects(
    service.update(
      propertyId,
      {
        title: 'Updated home',
        description: 'Updated description.',
        purpose: 'Sale',
        propertyType: 'House',
        price: 25000000,
        areaSize: 5,
        areaUnit: 'Marla',
        location: { city: 'Lahore', area: 'DHA' },
        images: ['https://images.example.test/replaced.jpg'],
      } as CreatePropertyDto,
      { id: ownerId, role: 'agent' },
    ),
    BadRequestException,
  );
});

test('public feature filters target the matching structured property field', async () => {
  let capturedFilter: Record<string, unknown> | undefined;
  const query: Record<string, unknown> = {};
  for (const method of ['sort', 'skip', 'limit', 'populate']) query[method] = () => query;
  query.exec = async () => [];
  const model = {
    find(filter: Record<string, unknown>) {
      capturedFilter = filter;
      return query;
    },
    countDocuments() {
      return { async exec() { return 0; } };
    },
  };
  const service = new PropertiesService(
    model as unknown as Model<PropertyDocument>,
    {} as Model<never>,
    {} as Model<never>,
    {} as never,
    {} as ConfigService,
    {} as PropertyImageStorageService,
  );

  await service.findAll({ feature: 'rooms:tvLounges' } as QueryPropertyDto);
  assert.deepEqual(capturedFilter?.['features.rooms.tvLounges'], { $gt: 0 });
  await assert.rejects(
    service.findAll({ feature: 'rooms:unknownRoom' } as QueryPropertyDto),
    BadRequestException,
  );
});

test('image upload persists references, supports retry, and restricts access to the listing owner', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'property-image-flow-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const storage = createStorage(directory);
  const propertyId = new Types.ObjectId().toString();
  const ownerId = new Types.ObjectId().toString();
  let sharedImageReference = false;
  const property = {
    _id: new Types.ObjectId(propertyId),
    agentId: new Types.ObjectId(ownerId),
    status: PropertyStatus.PENDING_APPROVAL,
    images: [] as string[],
    imageMetadata: [] as Array<Record<string, unknown>>,
  };
  const model = {
    findById() {
      return {
        select() { return this; },
        populate() { return this; },
        async exec() { return property; },
      };
    },
    findByIdAndUpdate(_id: string, update: { $set: Record<string, unknown> }) {
      return {
        async exec() {
          Object.assign(property, update.$set);
          return property;
        },
      };
    },
    exists() {
      return {
        async exec() {
          return sharedImageReference ? { _id: new Types.ObjectId() } : null;
        },
      };
    },
  };
  const service = new PropertiesService(
    model as unknown as Model<PropertyDocument>,
    {} as Model<never>,
    {} as Model<never>,
    {} as never,
    {} as ConfigService,
    storage,
  );

  const controller = new PropertiesController(service);
  const firstUpload = await controller.uploadImages(propertyId, [pngFile()], {
    id: ownerId,
    role: 'agent',
  });
  assert.deepEqual(Object.keys(firstUpload).sort(), ['imageMetadata', 'images', 'uploaded']);
  assert.equal(property.images.length, 1);
  assert.equal(property.images[0], firstUpload.uploaded[0]);
  assert.equal(property.imageMetadata.length, 1);
  assert.equal(property.imageMetadata[0].isCover, true);
  assert.equal(
    (await sharp((await storage.read(firstUpload.uploaded[0].split('/').pop() as string)).buffer)
      .metadata()).exif,
    undefined,
  );

  const retry = await service.uploadImages(propertyId, [pngFile()], {
    id: ownerId,
    role: 'agent',
  });
  assert.equal(retry.images.length, 1);
  assert.equal(retry.uploaded[0], property.images[0]);

  await assert.rejects(
    service.uploadImages(propertyId, [pngFile()], {
      id: new Types.ObjectId().toString(),
      role: 'agent',
    }),
    NotFoundException,
  );
  await assert.rejects(
    service.uploadImages(propertyId, [pngFile()], {
      id: new Types.ObjectId().toString(),
      role: 'buyer',
    }),
    NotFoundException,
  );

  const savedUrl = property.images[0];
  sharedImageReference = true;
  const removal = await service.removeImage(propertyId, savedUrl, {
    id: ownerId,
    role: 'agent',
  });
  assert.equal(removal.fileDeleted, false);
  assert.deepEqual(property.images, []);
  await storage.read(savedUrl.split('/').pop() as string);
  sharedImageReference = false;
  await storage.remove(savedUrl.split('/').pop() as string);
  await assert.rejects(
    storage.read(savedUrl.split('/').pop() as string),
    NotFoundException,
  );
});

test('non-owner agents and buyers cannot access a listing through manager operations', async () => {
  const propertyId = new Types.ObjectId().toString();
  const ownerId = new Types.ObjectId().toString();
  const property = {
    _id: new Types.ObjectId(propertyId),
    agentId: new Types.ObjectId(ownerId),
    status: PropertyStatus.PENDING_APPROVAL,
  };
  const query = {
    select() { return this; },
    populate() { return this; },
    async exec() { return property; },
  };
  const model = {
    findById() { return query; },
  };
  const service = new PropertiesService(
    model as unknown as Model<PropertyDocument>,
    {} as Model<never>,
    {} as Model<never>,
    {} as never,
    {} as ConfigService,
    {} as PropertyImageStorageService,
  );

  assert.equal(
    await service.findByIdForManager(propertyId, { id: ownerId, role: 'agent' }),
    property,
  );
  await assert.rejects(
    service.findByIdForManager(propertyId, {
      id: new Types.ObjectId().toString(),
      role: 'agent',
    }),
    NotFoundException,
  );
  await assert.rejects(
    service.findByIdForManager(propertyId, {
      id: new Types.ObjectId().toString(),
      role: 'buyer',
    }),
    NotFoundException,
  );
});

test('listing writes and image management require agent or admin roles', () => {
  for (const method of [
    'create',
    'update',
    'archive',
    'uploadImages',
    'reorderImages',
    'removeImage',
  ] as const) {
    const handler = PropertiesController.prototype[method];
    assert.deepEqual(
      Reflect.getMetadata(ROLES_KEY, handler),
      [UserRole.AGENT, UserRole.ADMIN],
    );
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    assert.ok(guards.includes(JwtAuthGuard));
    assert.ok(guards.includes(RolesGuard));
  }
  const uploadInterceptors = Reflect.getMetadata(
    INTERCEPTORS_METADATA,
    PropertiesController.prototype.uploadImages,
  ) as unknown[];
  assert.equal(uploadInterceptors.length, 1);
});
