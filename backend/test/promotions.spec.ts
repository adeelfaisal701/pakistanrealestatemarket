import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import sharp = require('sharp');
import { PropertyImageStorageService } from '../src/modules/properties/property-image-storage.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { PromoCampaignDto, PromoEventDto } from '../src/modules/promotions/dto/promo-campaign.dto';
import { PromoMediaStorageService } from '../src/modules/promotions/promo-media-storage.service';
import { PromotionsService } from '../src/modules/promotions/promotions.service';
import {
  PromoCampaignStatus,
  PromoDevice,
  PromoEventType,
  PromoMediaKind,
  PromoPlacement,
} from '../src/modules/promotions/promotion.constants';

const IMAGE_PREFIX = '/api/v1/properties/images/';
const VIDEO_PREFIX = '/api/v1/promotions/media/';
const IMAGE = `${IMAGE_PREFIX}11111111-1111-4111-8111-111111111111.webp`;
const VIDEO = `${VIDEO_PREFIX}22222222-2222-4222-8222-222222222222.mp4`;

/** Temporary upload folders (never the real uploads directory). */
const STORAGE_ROOT = mkdtempSync(join(tmpdir(), 'promo-spec-'));
after(() => rmSync(STORAGE_ROOT, { recursive: true, force: true }));

function storageConfig(values: { nodeEnv?: string; publicBaseUrl?: string; folder?: string } = {}) {
  const imagesDir = join(STORAGE_ROOT, values.folder ?? 'default', 'property-images');
  mkdirSync(imagesDir, { recursive: true });
  mkdirSync(join(imagesDir, '..', 'promo-media'), { recursive: true });
  const map: Record<string, unknown> = {
    nodeEnv: values.nodeEnv ?? 'test',
    'propertyImages.storageDir': imagesDir,
    'propertyImages.publicBaseUrl': values.publicBaseUrl,
  };
  return { config: { get: (key: string) => map[key] } as never, imagesDir, videosDir: join(imagesDir, '..', 'promo-media') };
}

/** Storage with the IMAGE and VIDEO fixtures present, as if uploaded. */
function seededStorage() {
  const { config, imagesDir, videosDir } = storageConfig();
  writeFileSync(join(imagesDir, IMAGE.slice(IMAGE_PREFIX.length)), 'image');
  writeFileSync(join(videosDir, VIDEO.slice(VIDEO_PREFIX.length)), 'video');
  return new PromoMediaStorageService(config);
}

function chain<T>(value: T) {
  const result: Record<string, unknown> = {
    select: () => result,
    sort: () => result,
    limit: () => result,
    lean: () => result,
    exec: async () => value,
  };
  return result;
}

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    title: 'Campaign',
    companyName: 'Builder Co',
    logoUrl: '',
    media: [{ kind: PromoMediaKind.IMAGE, url: IMAGE, alt: '' }],
    destinationUrl: 'https://example.com',
    ctaText: 'Learn more',
    description: '',
    startsAt: new Date(Date.now() - 60_000),
    endsAt: null,
    status: PromoCampaignStatus.ACTIVE,
    devices: [PromoDevice.MOBILE, PromoDevice.DESKTOP],
    placements: [PromoPlacement.HOME_FEATURED],
    targeting: { cities: [], propertyTypes: [], purposes: [] },
    priority: 50,
    displayOrder: 0,
    videoMaxSeconds: 0,
    ...overrides,
  };
}

function makeService(options: {
  rows?: Array<Record<string, unknown>>;
  settings?: Record<string, unknown> | null;
  activeCampaign?: Record<string, unknown> | null;
  images?: unknown;
  videos?: PromoMediaStorageService;
} = {}) {
  const calls = {
    find: [] as unknown[],
    findOne: [] as unknown[],
    create: [] as Array<Record<string, unknown>>,
    dedupKeys: new Set<string>(),
    statUpdates: [] as Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>,
  };
  const campaigns = {
    find: (filter: unknown) => {
      calls.find.push(filter);
      return chain(options.rows ?? []);
    },
    findOne: (filter: unknown) => {
      calls.findOne.push(filter);
      return chain(options.activeCampaign === undefined ? { _id: new Types.ObjectId() } : options.activeCampaign);
    },
    findById: (id: Types.ObjectId) => chain(calls.create.find((row) => String(row._id) === String(id)) ?? null),
    create: async (data: Record<string, unknown>) => {
      const row = { _id: new Types.ObjectId(), ...data };
      calls.create.push(row);
      return row;
    },
  };
  const stats = {
    aggregate: () => chain([]),
    updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      calls.statUpdates.push({ filter, update });
      return chain({ upsertedCount: 1 });
    },
  };
  const dedup = {
    create: async ({ key }: { key: string }) => {
      if (calls.dedupKeys.has(key)) throw Object.assign(new Error('duplicate key'), { code: 11000 });
      calls.dedupKeys.add(key);
      return { key };
    },
  };
  const settingsModel = { findOne: () => chain(options.settings ?? null) };
  const images = options.images ?? {
    filenameForManagedUrl: (url: string) => (url.startsWith(IMAGE_PREFIX) ? url.slice(IMAGE_PREFIX.length) : undefined),
    remove: async () => undefined,
  };
  const videos = options.videos ?? seededStorage();
  const config = { get: (key: string) => (key === 'jwt.secret' ? 'test-secret-value' : undefined) };
  const service = new PromotionsService(
    campaigns as never,
    stats as never,
    dedup as never,
    settingsModel as never,
    images as never,
    videos as never,
    config as never,
  );
  return { service, calls };
}

function dto(overrides: Partial<PromoCampaignDto> = {}): PromoCampaignDto {
  return {
    title: 'Spring launch',
    companyName: 'Builder Co',
    media: [{ kind: PromoMediaKind.IMAGE, url: IMAGE }],
    destinationUrl: 'https://builder.example.com/launch',
    startsAt: new Date(Date.now() - 1000).toISOString(),
    devices: [PromoDevice.MOBILE],
    placements: [PromoPlacement.HOME_FEATURED],
    ...overrides,
  } as PromoCampaignDto;
}

test('serve only queries active, in-schedule campaigns with media for the placement and device', async () => {
  const { service, calls } = makeService();
  await service.serve({ placement: PromoPlacement.HOME_FEATURED, device: PromoDevice.MOBILE });
  const filter = calls.find[0] as Record<string, unknown>;
  assert.equal(filter.status, PromoCampaignStatus.ACTIVE);
  assert.equal(filter.placements, PromoPlacement.HOME_FEATURED);
  assert.equal(filter.devices, PromoDevice.MOBILE);
  assert.ok((filter.startsAt as { $lte: Date }).$lte instanceof Date);
  assert.deepEqual(Object.keys(filter.$or as object[]).length, 2);
  assert.deepEqual(filter['media.0'], { $exists: true });
});

test('serve excludes explicit targeting mismatches, keeps untargeted campaigns and ranks matches first', async () => {
  const lahore = campaign({ title: 'Lahore', priority: 10, targeting: { cities: ['lahore'], propertyTypes: [], purposes: [] } });
  const karachi = campaign({ title: 'Karachi', priority: 90, targeting: { cities: ['karachi'], propertyTypes: [], purposes: [] } });
  const general = campaign({ title: 'General', priority: 60 });
  const { service } = makeService({ rows: [karachi, general, lahore] });

  const inLahore = await service.serve({ placement: PromoPlacement.HOME_FEATURED, city: 'Lahore' });
  assert.deepEqual(inLahore.campaigns.map((item) => item.title), ['Lahore', 'General']);

  // Unknown city: targeted campaigns stay eligible, ordered by priority.
  const unknown = await service.serve({ placement: PromoPlacement.HOME_FEATURED });
  assert.deepEqual(unknown.campaigns.map((item) => item.title), ['Karachi', 'General', 'Lahore']);
});

test('serve returns nothing for a placement disabled in settings', async () => {
  const { service, calls } = makeService({
    rows: [campaign()],
    settings: { listingsInterval: 5, listingsMaxPerPage: 1, enabledPlacements: [PromoPlacement.LISTINGS_INLINE] },
  });
  const result = await service.serve({ placement: PromoPlacement.HOME_FEATURED });
  assert.equal(result.enabled, false);
  assert.equal(result.campaigns.length, 0);
  assert.equal(result.listingsInterval, 5);
  assert.equal(calls.find.length, 0);
});

test('served campaigns never expose targeting, status or admin fields', async () => {
  const { service } = makeService({ rows: [campaign({ createdBy: new Types.ObjectId() })] });
  const result = await service.serve({ placement: PromoPlacement.HOME_FEATURED });
  const keys = Object.keys(result.campaigns[0]).sort();
  assert.deepEqual(keys, [
    'companyName', 'ctaText', 'description', 'destinationUrl', 'id', 'logoUrl', 'media', 'title', 'videoMaxSeconds',
  ]);
});

test('impressions and clicks are deduplicated per visitor and unique impressions counted once a day', async () => {
  const { service, calls } = makeService();
  const event = {
    campaignId: new Types.ObjectId().toHexString(),
    type: PromoEventType.IMPRESSION,
    placement: PromoPlacement.HOME_FEATURED,
    device: PromoDevice.DESKTOP,
    visitorId: '6f1c2c1e-4b0a-4c55-9f43-1d2b3c4d5e6f',
  };
  assert.deepEqual(await service.track(event, 'Mozilla/5.0'), { tracked: true });
  assert.deepEqual(await service.track(event, 'Mozilla/5.0'), { tracked: false, duplicate: true });
  assert.deepEqual(calls.statUpdates[0].update, { $inc: { impressions: 1, uniqueImpressions: 1 } });
  assert.ok(calls.statUpdates[0].filter.campaignId instanceof Types.ObjectId);

  assert.deepEqual(await service.track({ ...event, type: PromoEventType.CLICK }, 'Mozilla/5.0'), { tracked: true });
  assert.deepEqual(await service.track({ ...event, type: PromoEventType.CLICK }, 'Mozilla/5.0'), { tracked: false, duplicate: true });
  assert.equal(calls.statUpdates.length, 2);

  // Raw visitor ids are never stored: dedup keys hold an HMAC digest only.
  for (const key of calls.dedupKeys) assert.ok(!key.includes(event.visitorId));
  // Campaign lookup casts to ObjectId (Mixed-path safe).
  assert.ok((calls.findOne[0] as { _id: unknown })._id instanceof Types.ObjectId);
});

test('automated user agents and inactive campaigns are not tracked', async () => {
  const event = {
    campaignId: new Types.ObjectId().toHexString(),
    type: PromoEventType.IMPRESSION,
    placement: PromoPlacement.HOME_FEATURED,
    device: PromoDevice.DESKTOP,
    visitorId: '6f1c2c1e-4b0a-4c55-9f43-1d2b3c4d5e6f',
  };
  const { service, calls } = makeService();
  assert.deepEqual(await service.track(event, 'Googlebot/2.1'), { tracked: false, reason: 'automated' });
  assert.equal(calls.statUpdates.length, 0);

  const inactive = makeService({ activeCampaign: null });
  await assert.rejects(() => inactive.service.track(event, 'Mozilla/5.0'), NotFoundException);
});

test('campaigns may only reference media uploaded through Ghar Safar', async () => {
  const { service } = makeService();
  await assert.rejects(
    () => service.create(dto({ media: [{ kind: PromoMediaKind.IMAGE, url: 'https://evil.example.com/a.jpg' }] }), new Types.ObjectId().toHexString()),
    BadRequestException,
  );
  await assert.rejects(
    () => service.create(dto({ media: [{ kind: PromoMediaKind.VIDEO, url: IMAGE }] }), new Types.ObjectId().toHexString()),
    BadRequestException,
  );
  await assert.rejects(
    () => service.create(dto({ logoUrl: 'https://evil.example.com/logo.png' }), new Types.ObjectId().toHexString()),
    BadRequestException,
  );
});

test('activation requires media and a valid schedule; admin ids are stored as ObjectIds', async () => {
  const { service, calls } = makeService();
  const adminId = new Types.ObjectId().toHexString();
  await assert.rejects(() => service.create(dto({ media: [], status: PromoCampaignStatus.ACTIVE }), adminId), BadRequestException);
  await assert.rejects(
    () => service.create(dto({ startsAt: '2026-12-10T00:00:00.000Z', endsAt: '2026-12-01T00:00:00.000Z' }), adminId),
    BadRequestException,
  );
  const created = await service.create(
    dto({ media: [{ kind: PromoMediaKind.VIDEO, url: VIDEO, posterUrl: IMAGE }], targeting: { cities: [' Lahore ', 'lahore'] } }),
    adminId,
  );
  assert.equal(created.status, PromoCampaignStatus.DRAFT);
  assert.ok(calls.create[0].createdBy instanceof Types.ObjectId);
  assert.deepEqual((calls.create[0].targeting as { cities: string[] }).cities, ['lahore']);
});

test('effective status reflects the schedule automatically', () => {
  const { service } = makeService();
  const now = new Date('2026-11-14T12:00:00.000Z');
  const base = { status: PromoCampaignStatus.ACTIVE, startsAt: new Date('2026-11-01T00:00:00.000Z'), endsAt: null };
  assert.equal(service.effectiveStatus(base, now), 'live');
  assert.equal(service.effectiveStatus({ ...base, startsAt: new Date('2026-12-01T00:00:00.000Z') }, now), 'scheduled');
  assert.equal(service.effectiveStatus({ ...base, endsAt: new Date('2026-11-10T00:00:00.000Z') }, now), 'expired');
  assert.equal(service.effectiveStatus({ ...base, status: PromoCampaignStatus.PAUSED }, now), 'paused');
});

test('destination URLs must be absolute http(s) without credentials', async () => {
  const check = async (destinationUrl: string) => {
    const instance = plainToInstance(PromoCampaignDto, { ...dto(), destinationUrl });
    const errors = await validate(instance);
    return errors.some((error) => error.property === 'destinationUrl');
  };
  assert.equal(await check('https://builder.example.com/launch?utm=1'), false);
  assert.equal(await check('javascript:alert(1)'), true);
  assert.equal(await check('data:text/html,hi'), true);
  assert.equal(await check('//builder.example.com'), true);
  assert.equal(await check('https://user:pass@builder.example.com'), true);
  assert.equal(await check('http://localhost:3000'), true);
});

test('event payloads require a UUID visitor id and known enums', async () => {
  const errors = await validate(
    plainToInstance(PromoEventDto, {
      campaignId: new Types.ObjectId().toHexString(),
      type: 'purchase',
      placement: 'popup',
      device: 'tv',
      visitorId: 'user@example.com',
    }),
  );
  assert.deepEqual(errors.map((error) => error.property).sort(), ['device', 'placement', 'type', 'visitorId']);
});

test('video storage validates file signatures and only resolves managed filenames', async () => {
  const storage = new PromoMediaStorageService(storageConfig({ folder: 'signatures' }).config);
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(16)]);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(16)]);
  assert.equal(storage.detectVideoType(mp4), 'video/mp4');
  assert.equal(storage.detectVideoType(webm), 'video/webm');
  assert.equal(storage.detectVideoType(Buffer.from('<html><script>')), undefined);

  await assert.rejects(
    () => storage.saveVideo({ originalname: 'a.mp4', mimetype: 'video/mp4', size: 20, buffer: Buffer.from('not a video at all!!') }),
    BadRequestException,
  );
  await assert.rejects(
    () => storage.saveVideo({ originalname: 'a.mp4', mimetype: 'video/webm', size: mp4.length, buffer: mp4 }),
    BadRequestException,
  );

  assert.equal(storage.filenameForManagedUrl(VIDEO), '22222222-2222-4222-8222-222222222222.mp4');
  assert.equal(storage.filenameForManagedUrl(`${VIDEO_PREFIX}../../etc/passwd`), undefined);
  assert.equal(storage.filenameForManagedUrl('https://cdn.example.com/video.mp4'), undefined);
  await assert.rejects(() => storage.pathFor('../secret.mp4'), NotFoundException);
});

// ── Company logo / media references (regression: "Upload the company logo through the media uploader.") ──

async function pngUpload(name = 'logo.png') {
  const buffer = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#0a7' } }).png().toBuffer();
  return { originalname: name, mimetype: 'image/png', size: buffer.length, buffer };
}

test('a logo uploaded under a production loopback image base URL is accepted however the browser holds it', async () => {
  // Production configured with the template value: absolute loopback base URL is kept as-is.
  const { config } = storageConfig({ nodeEnv: 'production', publicBaseUrl: 'http://localhost:5000/api/v1', folder: 'prod-loopback' });
  const images = new PropertyImageStorageService(config);
  const videos = new PromoMediaStorageService(config);
  const saved = await images.save(await pngUpload());
  assert.equal(saved.url, `http://localhost:5000/api/v1/properties/images/${saved.filename}`);

  // The browser's API client rewrites loopback image URLs to relative paths, so the
  // form submitted "/api/v1/properties/images/<file>". The old exact-prefix check rejected it:
  const relative = `/api/v1/properties/images/${saved.filename}`;
  assert.equal(images.filenameForManagedUrl(relative), undefined);

  const { service, calls } = makeService({ images, videos });
  const adminId = new Types.ObjectId().toHexString();
  for (const logoUrl of [relative, saved.url]) {
    const created = await service.create(dto({ logoUrl, media: [{ kind: PromoMediaKind.IMAGE, url: relative }] }), adminId);
    // Stored and returned in the canonical, environment-independent form.
    assert.equal(created.logoUrl, relative);
    assert.equal(calls.create.at(-1)?.logoUrl, relative);
  }
});

test('the media uploader returns canonical paths for images and videos', async () => {
  const { config } = storageConfig({ nodeEnv: 'production', publicBaseUrl: 'https://api.example.com/api/v1', folder: 'prod-public' });
  const videos = new PromoMediaStorageService(config);
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(64)]);
  const video = await videos.saveVideo({ originalname: 'clip.mp4', mimetype: 'video/mp4', size: mp4.length, buffer: mp4 });
  assert.match(video.url, /^\/api\/v1\/promotions\/media\/[0-9a-f-]{36}\.mp4$/);
  // Absolute forms from the configured base are recognised and canonicalised; foreign hosts are not.
  assert.equal(videos.resolveReference(`https://api.example.com/api/v1/promotions/media/${video.filename}`)?.url, video.url);
  assert.equal(videos.resolveReference(`https://evil.example.com/api/v1/promotions/media/${video.filename}`), undefined);
  assert.equal(videos.resolveReference(`/api/v1/properties/images/../../.env`), undefined);
  assert.equal(await videos.exists(videos.resolveReference(video.url)!), true);
});

test('logo errors are specific: not uploaded here, wrong kind, or missing from storage', async () => {
  const { service } = makeService();
  const adminId = new Types.ObjectId().toHexString();
  await assert.rejects(() => service.create(dto({ logoUrl: 'https://cdn.example.com/logo.png' }), adminId), /Upload the company logo through the media uploader/);
  await assert.rejects(() => service.create(dto({ logoUrl: VIDEO }), adminId), /company logo must be a JPG, PNG or WebP image/);
  await assert.rejects(
    () => service.create(dto({ logoUrl: `${IMAGE_PREFIX}99999999-9999-4999-8999-999999999999.png` }), adminId),
    /uploaded company logo could not be found on the server/,
  );
  // A draft without a logo is allowed; activation without a logo is not.
  assert.equal((await service.create(dto(), adminId)).logoUrl, '');
  await assert.rejects(() => service.create(dto({ status: PromoCampaignStatus.ACTIVE }), adminId), /Upload the company logo before activating/);
  const live = await service.create(dto({ logoUrl: IMAGE, status: PromoCampaignStatus.ACTIVE }), adminId);
  assert.equal(live.logoUrl, IMAGE);
});

test('served campaigns expose canonical media URLs even for older absolute stored values', async () => {
  const { config, imagesDir } = storageConfig({ nodeEnv: 'production', publicBaseUrl: 'http://localhost:5000/api/v1', folder: 'serve' });
  const videos = new PromoMediaStorageService(config);
  const filename = '33333333-3333-4333-8333-333333333333.png';
  writeFileSync(join(imagesDir, filename), 'x');
  assert.ok(existsSync(join(imagesDir, filename)));
  const stored = { logoUrl: `http://localhost:5000/api/v1/properties/images/${filename}`, media: [{ kind: PromoMediaKind.IMAGE, url: `http://localhost:5000/api/v1/properties/images/${filename}`, alt: '' }] };
  const { service } = makeService({ videos, rows: [{ ...campaign(), ...stored }] });
  const response = await service.serve({ placement: PromoPlacement.HOME_FEATURED, device: PromoDevice.DESKTOP });
  assert.equal(response.campaigns[0]?.logoUrl, `/api/v1/properties/images/${filename}`);
  assert.equal(response.campaigns[0]?.media[0].url, `/api/v1/properties/images/${filename}`);
});
