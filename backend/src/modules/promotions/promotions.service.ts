import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac } from 'crypto';
import { Model, Types } from 'mongoose';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';
import {
  PromoAnalyticsQueryDto,
  PromoCampaignDto,
  PromoEventDto,
  PromoListQueryDto,
  PromoServeQueryDto,
  PromoSettingsDto,
} from './dto/promo-campaign.dto';
import { PromoMediaStorageService } from './promo-media-storage.service';
import {
  PROMO_LIMITS,
  PROMO_PLACEMENTS,
  PromoCampaignStatus,
  PromoEventType,
  PromoMediaKind,
  PromoPlacement,
} from './promotion.constants';
import { PromoCampaign, PromoCampaignDocument } from './schemas/promo-campaign.schema';
import { PromoDailyStat, PromoDailyStatDocument } from './schemas/promo-daily-stat.schema';
import { PromoEventDedup, PromoEventDedupDocument } from './schemas/promo-event-dedup.schema';
import { PromoSettings, PromoSettingsDocument } from './schemas/promo-settings.schema';

const BOT_USER_AGENT = /bot|crawler|spider|headless|preview|facebookexternalhit|slurp|lighthouse/i;
const MINUTE = 60_000;

export type EffectiveStatus = 'draft' | 'scheduled' | 'live' | 'expired' | 'paused' | 'archived';

type CampaignLean = PromoCampaign & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date };

const counterFields = {
  [PromoEventType.IMPRESSION]: 'impressions',
  [PromoEventType.CLICK]: 'clicks',
  [PromoEventType.VIDEO_VIEW]: 'videoViews',
  [PromoEventType.VIDEO_COMPLETE]: 'videoCompletions',
} as const;

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectModel(PromoCampaign.name) private readonly campaigns: Model<PromoCampaignDocument>,
    @InjectModel(PromoDailyStat.name) private readonly stats: Model<PromoDailyStatDocument>,
    @InjectModel(PromoEventDedup.name) private readonly dedup: Model<PromoEventDedupDocument>,
    @InjectModel(PromoSettings.name) private readonly settingsModel: Model<PromoSettingsDocument>,
    private readonly images: PropertyImageStorageService,
    private readonly videos: PromoMediaStorageService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  effectiveStatus(campaign: Pick<PromoCampaign, 'status' | 'startsAt' | 'endsAt'>, now = new Date()): EffectiveStatus {
    if (campaign.status !== PromoCampaignStatus.ACTIVE) return campaign.status as EffectiveStatus;
    if (new Date(campaign.startsAt) > now) return 'scheduled';
    if (campaign.endsAt && new Date(campaign.endsAt) <= now) return 'expired';
    return 'live';
  }

  private serializeAdmin(campaign: CampaignLean, totals?: Record<string, number>) {
    return {
      id: String(campaign._id),
      title: campaign.title,
      companyName: campaign.companyName,
      logoUrl: this.publicMediaUrl(campaign.logoUrl),
      media: this.publicMedia(campaign.media),
      destinationUrl: campaign.destinationUrl,
      ctaText: campaign.ctaText,
      description: campaign.description ?? '',
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt ?? null,
      status: campaign.status,
      effectiveStatus: this.effectiveStatus(campaign),
      devices: campaign.devices,
      placements: campaign.placements,
      targeting: {
        cities: campaign.targeting?.cities ?? [],
        propertyTypes: campaign.targeting?.propertyTypes ?? [],
        purposes: campaign.targeting?.purposes ?? [],
      },
      priority: campaign.priority,
      displayOrder: campaign.displayOrder,
      videoMaxSeconds: campaign.videoMaxSeconds ?? 0,
      package: campaign.package ?? null,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      totals: totals ?? { impressions: 0, uniqueImpressions: 0, clicks: 0, videoViews: 0, videoCompletions: 0 },
    };
  }

  /**
   * Resolves a submitted media URL to a file uploaded through the campaign media
   * uploader and returns its canonical URL. Uploads are identified by file name
   * and must exist in storage; the host/base-URL form the browser happened to
   * hold (absolute or relative) does not matter.
   */
  private async managedMediaUrl(url: string, expected: 'image' | 'video', label: string): Promise<string> {
    const reference = this.videos.resolveReference(url);
    if (!reference) throw new BadRequestException(`Upload the ${label} through the media uploader.`);
    if (reference.kind !== expected) {
      throw new BadRequestException(`The ${label} must be ${expected === 'image' ? 'a JPG, PNG or WebP image' : 'an MP4 or WebM video'}.`);
    }
    if (!(await this.videos.exists(reference))) {
      throw new BadRequestException(`The uploaded ${label} could not be found on the server. Please upload it again.`);
    }
    return reference.url;
  }

  /** Canonical form of a stored media URL for API responses (older stored forms are normalised). */
  private publicMediaUrl(url: string | undefined): string {
    if (!url) return '';
    return this.videos.resolveReference(url)?.url ?? url;
  }

  private publicMedia(media: PromoCampaign['media'] | undefined) {
    return (media ?? []).map((item) => ({
      kind: item.kind,
      url: this.publicMediaUrl(item.url),
      ...(item.posterUrl ? { posterUrl: this.publicMediaUrl(item.posterUrl) } : {}),
      alt: item.alt ?? '',
    }));
  }

  private async toDocument(dto: PromoCampaignDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Start date is invalid.');
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('End date must be after the start date.');
    const status = dto.status ?? PromoCampaignStatus.DRAFT;
    if (status === PromoCampaignStatus.ACTIVE) {
      if (!dto.logoUrl?.trim()) throw new BadRequestException('Upload the company logo before activating.');
      if (!dto.media.length) throw new BadRequestException('Add at least one image or video before activating.');
      if (!dto.placements.length) throw new BadRequestException('Choose at least one placement before activating.');
      if (!dto.devices.length) throw new BadRequestException('Choose at least one device before activating.');
    }
    // Only media uploaded through Ghar Safar may be referenced by campaigns.
    const logoUrl = dto.logoUrl?.trim() ? await this.managedMediaUrl(dto.logoUrl, 'image', 'company logo') : undefined;
    const media: Array<{ kind: PromoMediaKind; url: string; posterUrl?: string; alt: string }> = [];
    for (const item of dto.media) {
      const isVideo = item.kind === PromoMediaKind.VIDEO;
      media.push({
        kind: item.kind,
        url: await this.managedMediaUrl(item.url, isVideo ? 'video' : 'image', isVideo ? 'campaign video' : 'campaign image'),
        posterUrl: isVideo && item.posterUrl?.trim() ? await this.managedMediaUrl(item.posterUrl, 'image', 'video poster') : undefined,
        alt: item.alt?.trim() ?? '',
      });
    }
    const cities = [...new Set((dto.targeting?.cities ?? []).map((city) => city.trim().toLowerCase()).filter(Boolean))];
    return {
      title: dto.title.trim(),
      companyName: dto.companyName.trim(),
      logoUrl,
      media,
      destinationUrl: dto.destinationUrl.trim(),
      ctaText: dto.ctaText?.trim() || 'Learn more',
      description: dto.description?.trim() ?? '',
      startsAt,
      endsAt,
      status,
      devices: dto.devices,
      placements: dto.placements,
      targeting: { cities, propertyTypes: dto.targeting?.propertyTypes ?? [], purposes: dto.targeting?.purposes ?? [] },
      priority: dto.priority ?? 50,
      displayOrder: dto.displayOrder ?? 0,
      videoMaxSeconds: dto.videoMaxSeconds ?? 0,
      package: dto.package ?? null,
    };
  }

  private mediaUrls(campaign: Pick<PromoCampaign, 'logoUrl' | 'media'>): string[] {
    return [
      ...(campaign.logoUrl ? [campaign.logoUrl] : []),
      ...(campaign.media ?? []).flatMap((item) => [item.url, ...(item.posterUrl ? [item.posterUrl] : [])]),
    ];
  }

  /** Deletes uploaded files no longer referenced by any campaign. */
  private async cleanupUnreferenced(urls: string[]) {
    for (const url of [...new Set(urls)]) {
      const reference = this.videos.resolveReference(url);
      if (!reference) continue;
      const forms = [...new Set([url, reference.url])];
      const stillUsed = await this.campaigns
        .exists({ $or: [{ logoUrl: { $in: forms } }, { 'media.url': { $in: forms } }, { 'media.posterUrl': { $in: forms } }] })
        .exec();
      if (stillUsed) continue;
      if (reference.kind === 'image') {
        await this.images.remove(reference.filename).catch(() => this.logger.warn(`Could not remove promotion image ${reference.filename}`));
      } else {
        await this.videos.remove(reference.filename);
      }
    }
  }

  private objectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Campaign not found.');
    return new Types.ObjectId(id);
  }

  /** ObjectId paths declared with `type: Types.ObjectId` are Mixed; never store strings. */
  private adminObjectId(id: string) {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
  }

  // ---------------------------------------------------------------------------
  // Admin: campaigns
  // ---------------------------------------------------------------------------

  private async totalsFor(ids: Types.ObjectId[]) {
    if (!ids.length) return new Map<string, Record<string, number>>();
    const rows = await this.stats
      .aggregate<{ _id: Types.ObjectId; impressions: number; uniqueImpressions: number; clicks: number; videoViews: number; videoCompletions: number }>([
        { $match: { campaignId: { $in: ids } } },
        {
          $group: {
            _id: '$campaignId',
            impressions: { $sum: '$impressions' },
            uniqueImpressions: { $sum: '$uniqueImpressions' },
            clicks: { $sum: '$clicks' },
            videoViews: { $sum: '$videoViews' },
            videoCompletions: { $sum: '$videoCompletions' },
          },
        },
      ])
      .exec();
    return new Map(rows.map(({ _id, ...totals }) => [String(_id), totals]));
  }

  async list(query: PromoListQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.placement) filter.placements = query.placement;
    if (query.status && ['draft', 'active', 'paused', 'archived'].includes(query.status)) filter.status = query.status;
    if (query.status && ['live', 'scheduled', 'expired'].includes(query.status)) filter.status = PromoCampaignStatus.ACTIVE;
    if (query.search?.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ title: { $regex: escaped, $options: 'i' } }, { companyName: { $regex: escaped, $options: 'i' } }];
    }
    const rows = (await this.campaigns.find(filter).sort({ updatedAt: -1 }).limit(500).lean().exec()) as CampaignLean[];
    const totals = await this.totalsFor(rows.map((row) => row._id));
    const items = rows
      .map((row) => this.serializeAdmin(row, totals.get(String(row._id))))
      .filter((item) => !query.status || !['live', 'scheduled', 'expired'].includes(query.status) || item.effectiveStatus === query.status);
    return items;
  }

  async get(id: string) {
    const campaign = (await this.campaigns.findById(this.objectId(id)).lean().exec()) as CampaignLean | null;
    if (!campaign) throw new NotFoundException('Campaign not found.');
    const totals = await this.totalsFor([campaign._id]);
    return this.serializeAdmin(campaign, totals.get(String(campaign._id)));
  }

  async create(dto: PromoCampaignDto, adminId: string) {
    const created = await this.campaigns.create({ ...(await this.toDocument(dto)), createdBy: this.adminObjectId(adminId), updatedBy: this.adminObjectId(adminId) });
    return this.get(String(created._id));
  }

  async update(id: string, dto: PromoCampaignDto, adminId: string) {
    const existing = await this.campaigns.findById(this.objectId(id)).exec();
    if (!existing) throw new NotFoundException('Campaign not found.');
    const document = await this.toDocument(dto);
    const before = this.mediaUrls(existing);
    existing.set({ ...document, updatedBy: this.adminObjectId(adminId) });
    await existing.save();
    await this.cleanupUnreferenced(before.filter((url) => !this.mediaUrls(existing).includes(url)));
    return this.get(id);
  }

  async duplicate(id: string, adminId: string) {
    const source = (await this.campaigns.findById(this.objectId(id)).lean().exec()) as CampaignLean | null;
    if (!source) throw new NotFoundException('Campaign not found.');
    const { _id, createdAt, updatedAt, ...rest } = source as CampaignLean & { __v?: number };
    void _id;
    void createdAt;
    void updatedAt;
    delete (rest as { __v?: number }).__v;
    const copy = await this.campaigns.create({
      ...rest,
      title: `${source.title} (copy)`.slice(0, 120),
      status: PromoCampaignStatus.DRAFT,
      createdBy: this.adminObjectId(adminId),
      updatedBy: this.adminObjectId(adminId),
    });
    return this.get(String(copy._id));
  }

  async setStatus(id: string, status: PromoCampaignStatus, adminId: string) {
    const campaign = await this.campaigns.findById(this.objectId(id)).exec();
    if (!campaign) throw new NotFoundException('Campaign not found.');
    if (status === PromoCampaignStatus.ACTIVE) {
      if (!campaign.logoUrl) throw new BadRequestException('Upload the company logo before activating.');
      if (!campaign.media.length) throw new BadRequestException('Add at least one image or video before activating.');
      if (!campaign.placements.length) throw new BadRequestException('Choose at least one placement before activating.');
      if (!campaign.devices.length) throw new BadRequestException('Choose at least one device before activating.');
    }
    campaign.status = status;
    campaign.updatedBy = this.adminObjectId(adminId);
    await campaign.save();
    return this.get(id);
  }

  async remove(id: string) {
    const campaign = await this.campaigns.findByIdAndDelete(this.objectId(id)).exec();
    if (!campaign) throw new NotFoundException('Campaign not found.');
    await this.stats.deleteMany({ campaignId: campaign._id }).exec();
    await this.cleanupUnreferenced(this.mediaUrls(campaign));
    return { id, deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings() {
    const settings = await this.settingsModel.findOne({ key: 'default' }).lean().exec();
    return {
      listingsInterval: settings?.listingsInterval ?? 6,
      listingsMaxPerPage: settings?.listingsMaxPerPage ?? 2,
      enabledPlacements: (settings?.enabledPlacements ?? PROMO_PLACEMENTS).filter((placement) =>
        PROMO_PLACEMENTS.includes(placement as PromoPlacement),
      ),
    };
  }

  async updateSettings(dto: PromoSettingsDto) {
    await this.settingsModel
      .updateOne(
        { key: 'default' },
        { $set: { listingsInterval: dto.listingsInterval, listingsMaxPerPage: dto.listingsMaxPerPage, enabledPlacements: dto.enabledPlacements } },
        { upsert: true },
      )
      .exec();
    return this.getSettings();
  }

  // ---------------------------------------------------------------------------
  // Public serving
  // ---------------------------------------------------------------------------

  async serve(query: PromoServeQueryDto) {
    const settings = await this.getSettings();
    const placementSettings = {
      listingsInterval: settings.listingsInterval,
      listingsMaxPerPage: settings.listingsMaxPerPage,
    };
    if (!settings.enabledPlacements.includes(query.placement)) {
      return { placement: query.placement, enabled: false, campaigns: [], ...placementSettings };
    }
    const now = new Date();
    const filter: Record<string, unknown> = {
      status: PromoCampaignStatus.ACTIVE,
      placements: query.placement,
      startsAt: { $lte: now },
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
      'media.0': { $exists: true },
    };
    if (query.device) filter.devices = query.device;
    const rows = (await this.campaigns.find(filter).sort({ priority: -1, displayOrder: 1, updatedAt: -1 }).limit(40).lean().exec()) as CampaignLean[];

    const city = query.city?.trim().toLowerCase();
    const scored = rows
      .map((campaign) => {
        const targeting = campaign.targeting ?? { cities: [], propertyTypes: [], purposes: [] };
        let relevance = 0;
        const dimensions: Array<[string[], string | undefined]> = [
          [targeting.cities ?? [], city],
          [targeting.propertyTypes ?? [], query.propertyType],
          [targeting.purposes ?? [], query.purpose],
        ];
        for (const [targets, value] of dimensions) {
          if (!targets.length) continue;
          if (!value) continue; // context unknown: stay eligible
          if (!targets.includes(value)) return null; // explicit mismatch
          relevance += 1;
        }
        return { campaign, relevance };
      })
      .filter((entry): entry is { campaign: CampaignLean; relevance: number } => entry !== null)
      .sort((a, b) => b.relevance - a.relevance || b.campaign.priority - a.campaign.priority || a.campaign.displayOrder - b.campaign.displayOrder)
      .slice(0, PROMO_LIMITS.maxServedPerRequest);

    return {
      placement: query.placement,
      enabled: true,
      ...placementSettings,
      campaigns: scored.map(({ campaign }) => ({
        id: String(campaign._id),
        title: campaign.title,
        companyName: campaign.companyName,
        logoUrl: this.publicMediaUrl(campaign.logoUrl),
        description: campaign.description ?? '',
        ctaText: campaign.ctaText,
        destinationUrl: campaign.destinationUrl,
        media: this.publicMedia(campaign.media),
        videoMaxSeconds: campaign.videoMaxSeconds ?? 0,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Event tracking
  // ---------------------------------------------------------------------------

  private async claim(key: string, ttlMs: number): Promise<boolean> {
    try {
      await this.dedup.create({ key, expiresAt: new Date(Date.now() + ttlMs) });
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return false;
      throw error;
    }
  }

  async track(dto: PromoEventDto, userAgent = '') {
    if (BOT_USER_AGENT.test(userAgent)) return { tracked: false, reason: 'automated' };
    if (!Types.ObjectId.isValid(dto.campaignId)) throw new NotFoundException('Campaign not found.');
    const campaign = await this.campaigns
      .findOne({ _id: new Types.ObjectId(dto.campaignId), status: PromoCampaignStatus.ACTIVE, placements: dto.placement })
      .select('_id')
      .lean()
      .exec();
    if (!campaign) throw new NotFoundException('Campaign not found.');

    const secret = this.config.get<string>('jwt.secret');
    if (!secret) throw new ServiceUnavailableException('Analytics privacy key is unavailable.');
    const visitor = createHmac('sha256', secret).update(`promo:${dto.visitorId}`).digest('hex').slice(0, 32);
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const window = (minutes: number) => Math.floor(now / (minutes * MINUTE));
    const base = `${dto.campaignId}:${dto.placement}:${visitor}`;

    // Duplicate windows: repeated impressions/video events within 30 min and
    // repeated clicks within 1 min (double taps, re-renders) are not counted.
    const windows: Record<PromoEventType, [string, number]> = {
      [PromoEventType.IMPRESSION]: [`imp:${base}:${window(30)}`, 30 * MINUTE],
      [PromoEventType.CLICK]: [`clk:${base}:${window(1)}`, 2 * MINUTE],
      [PromoEventType.VIDEO_VIEW]: [`vv:${base}:${window(30)}`, 30 * MINUTE],
      [PromoEventType.VIDEO_COMPLETE]: [`vc:${base}:${window(30)}`, 30 * MINUTE],
    };
    const [key, ttl] = windows[dto.type];
    if (!(await this.claim(key, ttl))) return { tracked: false, duplicate: true };

    const increment: Record<string, number> = { [counterFields[dto.type]]: 1 };
    if (dto.type === PromoEventType.IMPRESSION && (await this.claim(`uimp:${dto.campaignId}:${visitor}:${day}`, 26 * 60 * MINUTE))) {
      increment.uniqueImpressions = 1;
    }
    await this.stats
      .updateOne(
        { campaignId: campaign._id, day, placement: dto.placement, device: dto.device },
        { $inc: increment },
        { upsert: true },
      )
      .exec();
    return { tracked: true };
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  async analytics(query: PromoAnalyticsQueryDto) {
    const days = query.days ?? 30;
    const since = new Date(Date.now() - (days - 1) * 24 * 60 * MINUTE).toISOString().slice(0, 10);
    const match: Record<string, unknown> = { day: { $gte: since } };
    if (query.campaignId) match.campaignId = this.objectId(query.campaignId);
    const sums = {
      impressions: { $sum: '$impressions' },
      uniqueImpressions: { $sum: '$uniqueImpressions' },
      clicks: { $sum: '$clicks' },
      videoViews: { $sum: '$videoViews' },
      videoCompletions: { $sum: '$videoCompletions' },
    };
    type Row = { _id: unknown; impressions: number; uniqueImpressions: number; clicks: number; videoViews: number; videoCompletions: number };
    const [result] = await this.stats
      .aggregate<{ totals: Row[]; daily: Row[]; placements: Row[]; devices: Row[]; campaigns: Row[] }>([
        { $match: match },
        {
          $facet: {
            totals: [{ $group: { _id: null, ...sums } }],
            daily: [{ $group: { _id: '$day', ...sums } }, { $sort: { _id: 1 } }],
            placements: [{ $group: { _id: '$placement', ...sums } }, { $sort: { impressions: -1 } }],
            devices: [{ $group: { _id: '$device', ...sums } }],
            campaigns: [{ $group: { _id: '$campaignId', ...sums } }, { $sort: { impressions: -1 } }, { $limit: 50 }],
          },
        },
      ])
      .exec();

    const withRates = (row: Partial<Row> = {}) => {
      const impressions = row.impressions ?? 0;
      const clicks = row.clicks ?? 0;
      const videoViews = row.videoViews ?? 0;
      const videoCompletions = row.videoCompletions ?? 0;
      return {
        impressions,
        uniqueImpressions: row.uniqueImpressions ?? 0,
        clicks,
        videoViews,
        videoCompletions,
        ctr: impressions ? Math.round((clicks / impressions) * 10000) / 100 : 0,
        completionRate: videoViews ? Math.round((videoCompletions / videoViews) * 10000) / 100 : 0,
      };
    };

    // Fill missing days so charts have a continuous axis.
    const dailyByDay = new Map((result?.daily ?? []).map((row) => [String(row._id), row]));
    const series = Array.from({ length: days }, (_, index) => {
      const day = new Date(Date.now() - (days - 1 - index) * 24 * 60 * MINUTE).toISOString().slice(0, 10);
      return { day, ...withRates(dailyByDay.get(day)) };
    });

    const campaignIds = (result?.campaigns ?? []).map((row) => row._id as Types.ObjectId);
    const titles = new Map(
      (await this.campaigns.find({ _id: { $in: campaignIds } }).select('title companyName').lean().exec()).map((campaign) => [
        String(campaign._id),
        { title: campaign.title, companyName: campaign.companyName },
      ]),
    );

    return {
      days,
      since,
      totals: withRates(result?.totals?.[0]),
      daily: series,
      placements: (result?.placements ?? []).map((row) => ({ placement: String(row._id), ...withRates(row) })),
      devices: (result?.devices ?? []).map((row) => ({ device: String(row._id), ...withRates(row) })),
      campaigns: (result?.campaigns ?? []).map((row) => ({
        id: String(row._id),
        ...(titles.get(String(row._id)) ?? { title: 'Deleted campaign', companyName: '' }),
        ...withRates(row),
      })),
    };
  }
}
