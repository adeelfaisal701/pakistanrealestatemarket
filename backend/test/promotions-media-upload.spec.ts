import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { Controller, Module, Post, UploadedFile, UseInterceptors, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PromoMediaStorageService, storageError } from '../src/modules/promotions/promo-media-storage.service';
import { PromoMediaUploadInterceptor, uploadError, type PromoUploadedFile } from '../src/modules/promotions/promo-media-upload.interceptor';
import { PromotionsService } from '../src/modules/promotions/promotions.service';
import { PromoCampaignStatus, PromoDevice, PromoMediaKind, PromoPlacement } from '../src/modules/promotions/promotion.constants';

const MB = 1024 * 1024;
const ROOT = mkdtempSync(join(tmpdir(), 'promo-upload-spec-'));
after(() => rmSync(ROOT, { recursive: true, force: true }));

function storage(folder: string, mediaStorageDir?: string) {
  const imagesDir = join(ROOT, folder, 'property-images');
  mkdirSync(imagesDir, { recursive: true });
  const values: Record<string, unknown> = {
    nodeEnv: 'test',
    'propertyImages.storageDir': imagesDir,
    'promotions.mediaStorageDir': mediaStorageDir,
  };
  const config = { get: (key: string) => values[key] } as unknown as ConfigService;
  return { service: new PromoMediaStorageService(config), config, imagesDir };
}

const mp4 = (bytes: number) => {
  const buffer = Buffer.alloc(bytes, 0x11);
  buffer.writeUInt32BE(0x18, 0);
  buffer.write('ftypmp42', 4, 'ascii');
  return buffer;
};
const webm = (bytes: number) => {
  const buffer = Buffer.alloc(bytes, 0x22);
  buffer.writeUInt32BE(0x1a45dfa3, 0);
  return buffer;
};
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

// ── Storage location, legacy lookup and migration ──────────────────────────

test('videos are stored inside the configured storage folder (PROPERTY_IMAGE_STORAGE_DIR/promo-media) by default', async () => {
  const { service, imagesDir } = storage('default-dir');
  await service.onModuleInit();
  assert.equal(service.storageDirectory, join(imagesDir, 'promo-media'));
  const saved = await service.saveVideo({ originalname: 'a.mp4', mimetype: 'video/mp4', size: 64, buffer: mp4(64) });
  assert.ok(existsSync(join(imagesDir, 'promo-media', saved.filename)));
  assert.ok(!existsSync(join(imagesDir, '..', 'promo-media', saved.filename)), 'never written to the old sibling folder');
  assert.equal(saved.url, `/api/v1/promotions/media/${saved.filename}`);
});

test('PROMO_MEDIA_STORAGE_DIR overrides the video folder', async () => {
  const custom = join(ROOT, 'custom-volume', 'campaign-videos');
  const { service } = storage('override', custom);
  await service.onModuleInit();
  assert.equal(service.storageDirectory, custom);
  const saved = await service.saveVideo({ originalname: 'a.webm', mimetype: 'video/webm', size: 64, buffer: webm(64) });
  assert.ok(existsSync(join(custom, saved.filename)));
});

test('videos from the legacy sibling folder are found, then copied with checksum verification; originals are kept', async () => {
  const { service, imagesDir } = storage('legacy');
  const legacyDir = join(imagesDir, '..', 'promo-media');
  mkdirSync(legacyDir, { recursive: true });
  const name = `${randomUUID()}.mp4`;
  writeFileSync(join(legacyDir, name), mp4(2048));
  writeFileSync(join(legacyDir, 'notes.txt'), 'not a video'); // ignored

  // Found before migration (backward-compatible lookup).
  assert.equal(await service.exists({ kind: 'video', filename: name, url: `/api/v1/promotions/media/${name}` }), true);
  assert.equal((await service.pathFor(name)).path, join(legacyDir, name));

  const first = await service.migrateLegacyVideos();
  assert.deepEqual(first, { copied: 1, skipped: 0, failed: 0 });
  const copy = join(imagesDir, 'promo-media', name);
  assert.equal(sha256(copy), sha256(join(legacyDir, name)));
  assert.ok(existsSync(join(legacyDir, name)), 'original must not be deleted');
  assert.equal((await service.pathFor(name)).path, copy, 'the persistent copy is preferred');
  assert.deepEqual(await service.migrateLegacyVideos(), { copied: 0, skipped: 1, failed: 0 });
  assert.ok(!readdirSync(join(imagesDir, 'promo-media')).some((entry) => entry.endsWith('.tmp')));
});

test('startup removes temporary uploads older than 1 hour and keeps recent ones', async () => {
  const { service, imagesDir } = storage('stale-temp');
  const dir = join(imagesDir, 'promo-media');
  mkdirSync(dir, { recursive: true });
  const stale = join(dir, `.upload-${randomUUID()}.tmp`);
  const recent = join(dir, `.upload-${randomUUID()}.tmp`);
  writeFileSync(stale, 'partial');
  writeFileSync(recent, 'partial');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  utimesSync(stale, twoHoursAgo, twoHoursAgo);
  await service.onModuleInit();
  assert.equal(existsSync(stale), false, 'stale temporary upload removed');
  assert.equal(existsSync(recent), true, 'a recent one may belong to an upload in progress on another instance');
});

test('missing files are reported as missing, and path traversal is refused', async () => {
  const { service } = storage('missing');
  await service.onModuleInit();
  const ghost = `${randomUUID()}.mp4`;
  assert.equal(await service.exists({ kind: 'video', filename: ghost, url: `/api/v1/promotions/media/${ghost}` }), false);
  await assert.rejects(() => service.pathFor(ghost), /Media not found/);
  await assert.rejects(() => service.pathFor('../../.env'), /Media not found/);
  assert.equal(service.resolveReference('/api/v1/promotions/media/../../secret.mp4'), undefined);
});

test('storage errors become clear, non-revealing HTTP errors', () => {
  assert.equal(storageError(Object.assign(new Error('x'), { code: 'ENOSPC' })).getStatus(), 507);
  assert.equal(storageError(Object.assign(new Error('x'), { code: 'EACCES' })).getStatus(), 503);
  assert.equal(storageError(Object.assign(new Error('x'), { code: 'EROFS' })).getStatus(), 503);
  assert.equal(storageError(new Error('x')).getStatus(), 500);
  const interrupted = uploadError(new Error('Unexpected end of form'));
  assert.equal(interrupted.getStatus(), 400);
  assert.match(interrupted.message, /interrupted before it finished/);
  assert.equal(uploadError(Object.assign(new Error('File too large'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' })).getStatus(), 413);
  assert.equal(uploadError(Object.assign(new Error('Unexpected field'), { name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE' })).getStatus(), 400);
});

// ── Real multipart uploads over HTTP through PromoMediaUploadInterceptor ───

describe('upload interceptor (real HTTP, streaming to disk)', () => {
  let app: INestApplication;
  let base = '';
  const { service, imagesDir } = storage('http');
  const mediaDir = join(imagesDir, 'promo-media');

  before(async () => {
    @Controller('upload')
    class UploadController {
      constructor(private readonly videos: PromoMediaStorageService) {}
      @Post()
      @UseInterceptors(PromoMediaUploadInterceptor)
      async upload(@UploadedFile() file?: PromoUploadedFile) {
        if (!file) return { kind: 'none' };
        if (file.promoVideo) return this.videos.commitVideo(file.promoVideo);
        return { kind: 'image', size: file.size, buffered: Buffer.isBuffer(file.buffer) };
      }
    }
    @Module({
      controllers: [UploadController],
      providers: [{ provide: PromoMediaStorageService, useValue: service }, PromoMediaUploadInterceptor],
    })
    class UploadTestModule {}
    await service.onModuleInit();
    app = await NestFactory.create(UploadTestModule, { logger: false });
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  after(async () => app?.close());

  const post = async (bytes: Buffer, type: string, name: string) => {
    const form = new FormData();
    form.append('file', new Blob([bytes as unknown as BlobPart], { type }), name);
    const response = await fetch(`${base}/upload`, { method: 'POST', body: form });
    return { status: response.status, body: (await response.json()) as Record<string, any> };
  };
  const leftovers = () => readdirSync(mediaDir).filter((entry) => entry.startsWith('.'));

  test('images up to 10 MB are accepted (buffered for the image pipeline); 10.1 MB is refused', async () => {
    const small = await post(Buffer.alloc(Math.round(0.5 * MB), 1), 'image/png', 'small.png');
    assert.equal(small.status, 201);
    assert.equal(small.body.buffered, true);
    const edge = await post(Buffer.alloc(Math.round(9.9 * MB), 1), 'image/jpeg', 'edge.jpg');
    assert.equal(edge.status, 201);
    const tooBig = await post(Buffer.alloc(Math.round(10.1 * MB), 1), 'image/webp', 'big.webp');
    assert.equal(tooBig.status, 413);
    assert.match(tooBig.body.message, /Images must be 10 MB or smaller/);
  });

  test('MP4 and WebM videos up to 60 MB stream to disk; 61 MB is refused and nothing is left behind', async () => {
    for (const [bytes, type, name] of [
      [mp4(5 * MB), 'video/mp4', 'five.mp4'],
      [webm(15 * MB), 'video/webm', 'fifteen.webm'],
      [mp4(59 * MB), 'video/mp4', 'fifty-nine.mp4'],
    ] as const) {
      const result = await post(bytes, type, name);
      assert.equal(result.status, 201, `${name}: ${JSON.stringify(result.body)}`);
      const stored = join(mediaDir, result.body.data?.filename ?? result.body.filename);
      assert.ok(existsSync(stored), `${name} stored`);
      assert.equal(readFileSync(stored).length, bytes.length, `${name} stored completely`);
    }
    const tooBig = await post(mp4(61 * MB), 'video/mp4', 'sixty-one.mp4');
    assert.equal(tooBig.status, 413);
    assert.match(tooBig.body.message, /Videos must be 60 MB or smaller/);
    assert.deepEqual(leftovers(), []);
  });

  test('a video with a wrong signature, an unsupported type or two files is rejected without storing anything', async () => {
    const before = readdirSync(mediaDir).length;
    const fake = await post(Buffer.alloc(MB, 0x41), 'video/mp4', 'fake.mp4');
    assert.equal(fake.status, 400);
    assert.match(fake.body.message, /Unsupported video/);
    const mismatch = await post(webm(MB), 'video/mp4', 'mismatch.mp4');
    assert.equal(mismatch.status, 400);
    const gif = await post(Buffer.alloc(1024, 1), 'image/gif', 'anim.gif');
    assert.equal(gif.status, 400);
    assert.match(gif.body.message, /Unsupported file type/);
    const form = new FormData();
    form.append('file', new Blob([mp4(1024)], { type: 'video/mp4' }), 'a.mp4');
    form.append('file', new Blob([mp4(1024)], { type: 'video/mp4' }), 'b.mp4');
    const two = await fetch(`${base}/upload`, { method: 'POST', body: form });
    assert.equal(two.status, 400);
    assert.equal(readdirSync(mediaDir).length, before);
    assert.deepEqual(leftovers(), []);
  });

  test('an upload interrupted by the client leaves no temporary file', async () => {
    const boundary = '----interrupt' + randomUUID();
    const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="cut.mp4"\r\nContent-Type: video/mp4\r\n\r\n`);
    const url = new URL(`${base}/upload`);
    await new Promise<void>((resolve) => {
      const request = httpRequest({
        host: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(head.length + 20 * MB) },
      });
      request.on('error', () => resolve());
      request.write(head);
      request.write(mp4(4 * MB));
      setTimeout(() => {
        request.destroy();
        resolve();
      }, 300);
    });
    const deadline = Date.now() + 3000;
    while (leftovers().length && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(leftovers(), []);
  });
});

// ── Missing media in admin and public responses ─────────────────────────────

function chain<T>(value: T) {
  const result: Record<string, unknown> = {};
  for (const method of ['select', 'sort', 'limit', 'lean']) result[method] = () => result;
  result.exec = async () => value;
  return result;
}

test('public serving skips missing media and admin responses report it', async () => {
  const { service: videos, imagesDir } = storage('serve-missing');
  await videos.onModuleInit();
  const presentImage = `${randomUUID()}.png`;
  writeFileSync(join(imagesDir, presentImage), 'img');
  const presentVideo = (await videos.saveVideo({ originalname: 'v.mp4', mimetype: 'video/mp4', size: 64, buffer: mp4(64) })).filename;
  const goneVideo = `${randomUUID()}.mp4`;
  const goneLogo = `${randomUUID()}.jpg`;
  const goneOnly = `${randomUUID()}.webm`;
  const base = {
    title: 'Campaign',
    companyName: 'Co',
    destinationUrl: 'https://example.com',
    ctaText: 'Go',
    description: '',
    status: PromoCampaignStatus.ACTIVE,
    startsAt: new Date(Date.now() - 1000),
    endsAt: null,
    devices: [PromoDevice.DESKTOP],
    placements: [PromoPlacement.HOME_FEATURED],
    targeting: { cities: [], propertyTypes: [], purposes: [] },
    priority: 50,
    displayOrder: 0,
    videoMaxSeconds: 0,
  };
  const partial = {
    ...base,
    _id: new Types.ObjectId(),
    logoUrl: `/api/v1/properties/images/${goneLogo}`,
    media: [
      { kind: PromoMediaKind.VIDEO, url: `/api/v1/promotions/media/${goneVideo}`, alt: '' },
      { kind: PromoMediaKind.VIDEO, url: `/api/v1/promotions/media/${presentVideo}`, posterUrl: `/api/v1/properties/images/${goneLogo}`, alt: '' },
      { kind: PromoMediaKind.IMAGE, url: `/api/v1/properties/images/${presentImage}`, alt: '' },
    ],
  };
  const empty = { ...base, _id: new Types.ObjectId(), logoUrl: '', media: [{ kind: PromoMediaKind.VIDEO, url: `/api/v1/promotions/media/${goneOnly}`, alt: '' }] };
  const campaigns = {
    find: () => chain([partial, empty]),
    findById: (id: Types.ObjectId) => chain([partial, empty].find((row) => String(row._id) === String(id)) ?? null),
  };
  const service = new PromotionsService(
    campaigns as never,
    { aggregate: () => chain([]) } as never,
    {} as never,
    { findOne: () => chain(null) } as never,
    { remove: async () => undefined } as never,
    videos,
    { get: () => 'test-secret' } as never,
  );

  const served = await service.serve({ placement: PromoPlacement.HOME_FEATURED, device: PromoDevice.DESKTOP });
  assert.equal(served.campaigns.length, 1, 'a campaign without any available media is not served');
  const [campaign] = served.campaigns;
  assert.equal(campaign.logoUrl, '', 'missing logo dropped');
  assert.deepEqual(campaign.media.map((item: { url: string }) => item.url), [`/api/v1/promotions/media/${presentVideo}`, `/api/v1/properties/images/${presentImage}`]);
  assert.equal('posterUrl' in campaign.media[0], false, 'missing poster dropped');

  const admin = await service.get(String(partial._id));
  assert.deepEqual(new Set(admin.missingMedia), new Set([`/api/v1/promotions/media/${goneVideo}`, `/api/v1/properties/images/${goneLogo}`]));
});
