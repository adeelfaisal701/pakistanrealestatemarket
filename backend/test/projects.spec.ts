import 'reflect-metadata';
import { mkdtemp, rm } from 'fs/promises';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Types } from 'mongoose';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { UserRole } from '../src/modules/users/schemas/user.schema';
import { AdminProjectsController } from '../src/modules/projects/admin-projects.controller';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { APPROVED_INDEX_SCHEMAS } from '../src/database/migrate-schema-indexes';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { ProjectDocumentStorageService } from '../src/modules/projects/project-document-storage.service';
import {
  DevelopmentProject,
  DevelopmentProjectSchema,
  DevelopmentProjectStatus,
} from '../src/modules/projects/schemas/development-project.schema';

function document(overrides: Record<string, unknown> = {}) {
  const record = {
    _id: new Types.ObjectId(),
    name: 'Cedar Residences',
    developer: 'Cedar Developments',
    slug: 'cedar-residences',
    shortDescription: 'A new development.',
    description: 'Project description.',
    location: 'Lahore',
    projectType: 'Apartments',
    categories: ['Residential'],
    priceRange: 'From PKR 10,000,000',
    status: DevelopmentProjectStatus.AVAILABLE,
    coverImage: '/api/v1/properties/images/cover.jpg',
    gallery: [],
    amenities: ['Parks'],
    additionalInformation: new Map([['Phase', 'One']]),
    paymentPlan: { enabled: false, milestones: [] },
    isPublished: true,
    isFeatured: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return { ...record, toObject: () => record };
}

function query(value: unknown) {
  return {
    sort() {
      return this;
    },
    select() {
      return this;
    },
    exec: async () => value,
  };
}

function setup(overrides: Record<string, unknown> = {}) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const model = {
    find: (...args: unknown[]) => {
      calls.push({ method: 'find', args });
      return query([document()]);
    },
    findOne: (...args: unknown[]) => {
      calls.push({ method: 'findOne', args });
      return query(document());
    },
    findById: (...args: unknown[]) => {
      calls.push({ method: 'findById', args });
      return query(document());
    },
    findByIdAndUpdate: (...args: unknown[]) => {
      calls.push({ method: 'findByIdAndUpdate', args });
      return query(document());
    },
    findByIdAndDelete: (...args: unknown[]) => {
      calls.push({ method: 'findByIdAndDelete', args });
      return query(document());
    },
    create: async (...args: unknown[]) => {
      calls.push({ method: 'create', args });
      return document();
    },
    ...overrides,
  };
  const service = new ProjectsService(model as never, {} as never, {
    read: async () => ({ buffer: Buffer.alloc(0), contentType: 'image/png' }),
    remove: async () => undefined,
  } as never);
  return { service, calls };
}

test('public featured projects are filtered to published featured project records', async () => {
  const { service, calls } = setup();
  const projects = await service.listPublished(true);
  assert.deepEqual(calls[0], {
    method: 'find',
    args: [{ isPublished: true, isFeatured: true }],
  });
  assert.equal(projects[0].name, 'Cedar Residences');
  assert.deepEqual(projects[0].additionalInformation, { Phase: 'One' });
});

test('public projects include only published records, without a property query', async () => {
  const { service, calls } = setup();
  await service.listPublished();
  assert.deepEqual(calls[0], {
    method: 'find',
    args: [{ isPublished: true }],
  });
  assert.equal(calls.some((call) => call.method === 'findOne'), false);
});

test('public detail lookup requires publication and matches slug or valid project id', async () => {
  const { service, calls } = setup();
  await service.getPublished('cedar-residences');
  const slugQuery = calls[0].args[0] as { isPublished: boolean; $or: unknown[] };
  assert.equal(slugQuery.isPublished, true);
  assert.deepEqual(slugQuery.$or, [{ slug: 'cedar-residences' }]);

  const { service: idService, calls: idCalls } = setup();
  const id = new Types.ObjectId().toHexString();
  await idService.getPublished(id);
  const idQuery = idCalls[0].args[0] as { $or: Array<{ _id?: Types.ObjectId }> };
  assert.equal(idQuery.$or[1]._id?.toHexString(), id);
});

test('create normalizes slugs and keeps project payment plan data in the independent project document', async () => {
  const { service, calls } = setup();
  const payload = {
    name: ' Cedar Residences ',
    developer: 'Cedar Developments',
    slug: 'CEDAR-RESIDENCES',
    shortDescription: ' A new development. ',
    description: 'Project description.',
    location: 'Lahore',
    projectType: 'Apartments',
    categories: ['Residential'],
    status: DevelopmentProjectStatus.AVAILABLE,
    gallery: [],
    amenities: [],
    additionalInformation: {},
    paymentPlan: {
      enabled: true,
      bookingAmount: 500000,
      milestones: [{ title: 'Installment one', amount: 250000 }],
    },
    isPublished: false,
    isFeatured: false,
    displayOrder: 0,
  };

  await service.create(payload as never);
  const saved = calls.find((call) => call.method === 'create')?.args[0] as {
    slug: string;
    paymentPlan: { bookingAmount: number; milestones: Array<{ amount: number }> };
  };
  assert.equal(saved.slug, 'cedar-residences');
  assert.equal(saved.paymentPlan.bookingAmount, 500000);
  assert.equal(saved.paymentPlan.milestones[0].amount, 250000);
});

test('duplicate slugs conflict and unpublished detail records are not returned', async () => {
  const duplicate = Object.assign(new Error('duplicate key'), { code: 11000 });
  const { service } = setup({
    create: async () => {
      throw duplicate;
    },
    findOne: () => query(null),
  });
  await assert.rejects(
    service.create({
      name: 'Cedar Residences',
      developer: 'Cedar Developments',
      slug: 'cedar-residences',
      shortDescription: 'Short description',
      description: 'Full description',
      location: 'Lahore',
      projectType: 'Apartments',
      categories: [],
      status: DevelopmentProjectStatus.AVAILABLE,
      gallery: [],
      amenities: [],
      additionalInformation: {},
      paymentPlan: { enabled: false, milestones: [] },
      isPublished: false,
      isFeatured: false,
      displayOrder: 0,
    } as never),
    ConflictException,
  );
  await assert.rejects(service.getPublished('draft-project'), NotFoundException);
});

test('admin project endpoints require JWT and administrator role', () => {
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    AdminProjectsController,
  ) as Function[];
  assert.ok(guards.includes(JwtAuthGuard));
  assert.ok(guards.includes(RolesGuard));
  assert.deepEqual(Reflect.getMetadata(ROLES_KEY, AdminProjectsController), [
    UserRole.ADMIN,
  ]);
});

test('public project listing, detail, and payment-plan document routes are explicitly public', () => {
  for (const method of [
    ProjectsController.prototype.getFeatured,
    ProjectsController.prototype.getPublishedProjects,
    ProjectsController.prototype.getPublishedProject,
    ProjectsController.prototype.getPaymentPlanDocument,
  ]) {
    assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, method), true);
  }
});

test('project collection has an approved unique slug index for explicit database migration', () => {
  const projectIndexes = DevelopmentProjectSchema.indexes();
  assert.ok(
    projectIndexes.some(
      ([keys, options]) => keys.slug === 1 && options.unique === true,
    ),
  );
  assert.ok(
    APPROVED_INDEX_SCHEMAS.some(
      ({ modelName }) => modelName === DevelopmentProject.name,
    ),
  );
});

test('payment-plan PDFs are stored and served from isolated project document storage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'estatepro-project-documents-'));
  try {
    const storage = new ProjectDocumentStorageService(
      new ConfigService({
        nodeEnv: 'test',
        propertyImages: { storageDir: join(directory, 'property-images') },
      }),
    );
    const content = Buffer.from('%PDF-1.7\nproject plan');
    const uploaded = await storage.save({
      originalname: 'payment-plan.pdf',
      mimetype: 'application/pdf',
      size: content.length,
      buffer: content,
    });
    assert.match(
      uploaded.url,
      /^\/api\/v1\/projects\/media\/[a-f0-9-]{36}\.pdf$/,
    );
    assert.deepEqual(await storage.read(uploaded.filename), content);
    assert.equal(storage.filenameForManagedUrl(uploaded.url), uploaded.filename);
    await assert.rejects(storage.read('../secret.pdf'));

    let publicLookup: Record<string, unknown> | undefined;
    const model = {
      findOne: (filter: Record<string, unknown>) => {
        publicLookup = filter;
        return query(document());
      },
    };
    const imageStorage = {
      read: async () => ({ buffer: content, contentType: 'image/png' }),
      remove: async () => undefined,
    };
    const service = new ProjectsService(model as never, storage, imageStorage as never);
    assert.deepEqual(
      (await service.readPublishedDocument(uploaded.filename)).buffer,
      content,
    );
    assert.equal(publicLookup?.isPublished, true);
    assert.equal(publicLookup?.['paymentPlan.enabled'], true);
    assert.equal(publicLookup?.['paymentPlan.documentUrl'], uploaded.url);

    const imageFilename = `${randomUUID()}.png`;
    const imageUrl = storage.urlForManagedFilename(imageFilename);
    publicLookup = undefined;
    const imageService = new ProjectsService(
      {
        findOne: (filter: Record<string, unknown>) => {
          publicLookup = filter;
          return query(document());
        },
      } as never,
      storage,
      {
        read: async (filename: string) => ({
          buffer: Buffer.from(filename),
          contentType: 'image/png',
        }),
      } as never,
    );
    const imageResponse = await imageService.readPublishedDocument(imageFilename);
    assert.equal(imageResponse.contentType, 'image/png');
    assert.equal(imageResponse.buffer.toString(), imageFilename);
    assert.equal(publicLookup?.['paymentPlan.documentUrl'], imageUrl);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('disabling a project payment plan removes its old managed document after saving', async () => {
  const oldUrl = '/api/v1/projects/media/00000000-0000-4000-8000-000000000001.pdf';
  const existing = document({
    paymentPlan: { enabled: true, documentUrl: oldUrl, milestones: [] },
  });
  const updated = document({
    paymentPlan: { enabled: false, milestones: [] },
  });
  const removed: string[] = [];
  const model = {
    findById: () => query(existing),
    findByIdAndUpdate: () => query(updated),
    findOne: () => query(null),
  };
  const documentStorage = {
    filenameForManagedUrl: (url: string) =>
      url === oldUrl ? '00000000-0000-4000-8000-000000000001.pdf' : undefined,
    remove: async (url: string) => removed.push(url),
  };
  const service = new ProjectsService(
    model as never,
    documentStorage as never,
    { remove: async () => undefined } as never,
  );
  await service.update('project-id', {
    name: 'Cedar Residences',
    developer: 'Cedar Developments',
    slug: 'cedar-residences',
    shortDescription: 'Short description',
    description: 'Full description',
    location: 'Lahore',
    projectType: 'Apartments',
    categories: [],
    status: DevelopmentProjectStatus.AVAILABLE,
    gallery: [],
    amenities: [],
    additionalInformation: {},
    paymentPlan: { enabled: false, milestones: [] },
    isPublished: false,
    isFeatured: false,
    displayOrder: 0,
  } as never);
  assert.deepEqual(removed, [oldUrl]);
});
