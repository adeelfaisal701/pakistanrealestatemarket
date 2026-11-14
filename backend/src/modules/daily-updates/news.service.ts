import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import sharp = require('sharp');
import { escapeRegExp } from '../../common/utils/escape-regexp';
import {
  NEWS_CATEGORY_LABELS,
  NEWS_FEEDS,
  NEWS_IMAGE_LOOKUPS_PER_RUN,
  NEWS_ITEMS_PER_FEED,
  NEWS_MAX_AGE_MS,
  NEWS_RETENTION_MS,
  NEWS_SNIPPET_MAX,
  NewsCategory,
  NewsFeed,
} from './daily-updates.constants';
import { NewsArticle, NewsArticleDocument } from './schemas/news-article.schema';
import { describeError, fetchSource } from './utils/http';
import { FeedItem, parseFeed } from './utils/rss';
import {
  canonicalArticleUrl,
  decodeEntities,
  firstSentences,
  htmlToText,
  safeImageUrl,
  sha256,
  slugify,
  stripFeedBoilerplate,
  titleKey,
} from './utils/text';

export interface PreparedArticle {
  urlHash: string;
  url: string;
  slug: string;
  title: string;
  titleKey: string;
  publisher: string;
  feedId: string;
  category: NewsCategory;
  publishedAt: Date;
  snippet: string;
  imageUrl: string | null;
  imageLookupDone: boolean;
  expiresAt: Date;
}

export interface PublicNewsArticle {
  id: string;
  slug: string;
  title: string;
  url: string;
  publisher: string;
  category: NewsCategory;
  categoryLabel: string;
  publishedAt: string;
  /** The publisher's own short feed description (at most two sentences). */
  excerpt: string;
  thumbnailUrl: string | null;
}

const LAHORE_DEVELOPMENT_TITLE =
  /\b(LDA|RUDA|TEPA|WASA|LWMC|metro|orange line|underpass(?:es)?|flyovers?|interchanges?|expressways?|ring road|roads?|bridges?|infrastructure|development|uplift|projects?|construction|beautification|parks?|sewerage|smart city|master plan|housing)\b/i;
const REAL_ESTATE_TITLE =
  /\b(real estate|propert(?:y|ies)|housing societ(?:y|ies)|housing schemes?|housing projects?|housing finance|plots?|DHA|apartments?|realtors?|builders?|construction (?:industry|sector)|land records?|mortgages?|rent(?:al)? market|property tax|capital gains tax)\b/i;
const GOVERNMENT_ACTOR = /\b(govt|government|cabinet|ministry|minister|pm|prime minister|cm|chief minister|federal|provincial|ECC|NEPRA|OGRA|SBP|FBR|PTA|authority|senate|national assembly|punjab assembly)\b/i;
const GOVERNMENT_ACTION =
  /\b(announc(?:e|es|ed)|approv(?:e|es|ed)|notif(?:y|ies|ied|ication)|launch(?:es|ed)?|unveil(?:s|ed)?|extend(?:s|ed)?|impos(?:e|es|ed)|bans?|lift(?:s|ed)?|issu(?:e|es|ed)|order(?:s|ed)?|direct(?:s|ed)?|decid(?:e|es|ed)|cut(?:s)?|rais(?:e|es|ed)|increas(?:e|es|ed)|reduc(?:e|es|ed)|slash(?:es|ed)?|pass(?:es|ed)?)\b/i;

/** Category from the feed and conservative headline rules (deterministic and testable). */
export function classifyArticle(feed: NewsFeed, title: string, snippet: string): NewsCategory {
  if (feed.fixedCategory) return feed.defaultCategory;
  const mentionsLahore = /\blahore\b/i.test(title) || /\blahore\b/i.test(snippet.slice(0, 200));
  if (mentionsLahore && LAHORE_DEVELOPMENT_TITLE.test(title)) return NewsCategory.LAHORE_DEVELOPMENT;
  if (REAL_ESTATE_TITLE.test(title)) return NewsCategory.REAL_ESTATE;
  if (GOVERNMENT_ACTOR.test(title) && GOVERNMENT_ACTION.test(title)) return NewsCategory.GOVERNMENT;
  return feed.defaultCategory;
}

function feedText(raw: string): string {
  if (!raw) return '';
  // Some feeds entity-encode their HTML (&lt;p&gt;…); decode before stripping tags.
  const html = /&lt;\/?[a-z]/i.test(raw) ? decodeEntities(raw) : raw;
  return stripFeedBoilerplate(htmlToText(html));
}

/**
 * Validates one feed item and turns it into a storable article, or returns
 * null (missing/invalid URL, missing/implausible date, off-domain link, etc.).
 * Only the headline, link, metadata and a short excerpt are kept.
 */
export function prepareArticle(feed: NewsFeed, item: FeedItem, now = new Date()): PreparedArticle | null {
  const title = item.title.trim();
  if (title.length < 10 || title.length > 300) return null;
  const url = canonicalArticleUrl(item.link, feed.domains);
  if (!url) return null;
  if (!item.publishedAt) return null;
  const age = now.getTime() - item.publishedAt.getTime();
  if (age > (feed.maxAgeMs ?? NEWS_MAX_AGE_MS) || age < -15 * 60 * 1000) return null;
  const publishedAt = age < 0 ? now : item.publishedAt;
  if (feed.includeFeedCategories?.length) {
    const allowed = feed.includeFeedCategories.map((category) => category.toLowerCase());
    if (!item.categories.some((category) => allowed.includes(category.toLowerCase()))) return null;
  }

  // Prefer the feed's own description; full-text content is only used to find its first sentences.
  const descriptionText = feedText(item.description);
  const snippet = firstSentences(descriptionText.length >= 40 ? descriptionText : feedText(item.content), NEWS_SNIPPET_MAX, 2);
  const imageUrl = item.imageCandidates.map((candidate) => safeImageUrl(candidate, feed.domains)).find(Boolean) ?? null;
  const urlHash = sha256(url);

  return {
    urlHash,
    url,
    slug: `${slugify(title, 70)}-${urlHash.slice(0, 8)}`,
    title,
    titleKey: titleKey(title),
    publisher: feed.publisher,
    feedId: feed.id,
    category: classifyArticle(feed, title, snippet),
    publishedAt,
    snippet,
    imageUrl,
    imageLookupDone: Boolean(imageUrl),
    expiresAt: new Date(publishedAt.getTime() + NEWS_RETENTION_MS),
  };
}

/** og:image / twitter:image of an article page. */
export function extractOgImage(html: string): string | null {
  const head = html.slice(0, 200_000);
  for (const name of ['og:image', 'og:image:url', 'twitter:image']) {
    const escaped = name.replace(/:/g, '\\:');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = head.match(pattern);
      if (match) return decodeEntities(match[1]);
    }
  }
  return null;
}

function decodeBody(body: Buffer, contentType: string | null): string {
  const charset = contentType?.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  if (charset && charset !== 'utf-8' && charset !== 'utf8') {
    try {
      return new TextDecoder(charset).decode(body);
    } catch {
      // Unknown charset: fall back to UTF-8.
    }
  }
  return body.toString('utf8');
}

/** Feeds explicitly enabled by configuration (unknown ids are ignored). */
export function enabledFeeds(ids: string[] | undefined): NewsFeed[] {
  const wanted = new Set((ids ?? []).map((id) => id.trim()).filter(Boolean));
  return NEWS_FEEDS.filter((feed) => wanted.has(feed.id));
}

const FEEDS_BY_ID = new Map(NEWS_FEEDS.map((feed) => [feed.id, feed]));
const LIST_CACHE_MS = 60_000;
const THUMBNAIL_CACHE_LIMIT = 200;
const THUMBNAIL_FAILURE_MS = 10 * 60_000;

type ThumbnailEntry = { body: Buffer | null; expires: number };

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly listCache = new Map<string, { expires: number; value: Promise<unknown> }>();
  private readonly thumbnails = new Map<string, ThumbnailEntry>();
  private readonly thumbnailsInFlight = new Map<string, Promise<Buffer | null>>();
  readonly feeds: NewsFeed[];

  constructor(
    @InjectModel(NewsArticle.name) private readonly articleModel: Model<NewsArticleDocument>,
    config: ConfigService,
  ) {
    this.feeds = enabledFeeds(config.get<string[]>('dailyUpdates.newsFeeds'));
  }

  // ── Ingestion ────────────────────────────────────────────────────────────

  async ingestAll(): Promise<void> {
    if (!this.feeds.length) return; // No publisher has been approved for collection.
    let inserted = 0;
    let failedFeeds = 0;
    for (const feed of this.feeds) {
      try {
        inserted += await this.ingestFeed(feed);
      } catch (error) {
        failedFeeds += 1;
        this.logger.warn(`Feed ${feed.id} failed: ${describeError(error)}`);
      }
    }
    await this.lookupMissingImages();
    if (inserted) this.listCache.clear();
    this.logger.log(`News ingest: ${inserted} new article(s), ${failedFeeds} feed failure(s).`);
    if (failedFeeds === this.feeds.length) throw new Error('All enabled news feeds failed');
  }

  async ingestFeed(feed: NewsFeed, now = new Date()): Promise<number> {
    const response = await fetchSource(feed.url, {
      accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8',
      maxBytes: 3 * 1024 * 1024,
      timeoutMs: 20_000,
    });
    const items = parseFeed(decodeBody(response.body, response.headers.get('content-type')))
      .slice(0, NEWS_ITEMS_PER_FEED)
      .map((item) => prepareArticle(feed, item, now))
      .filter((article): article is PreparedArticle => article !== null);
    if (!items.length) return 0;

    const [existingUrls, existingTitles] = await Promise.all([
      this.articleModel.find({ urlHash: { $in: items.map((item) => item.urlHash) } }).select('urlHash').lean().exec(),
      this.articleModel
        .find({
          titleKey: { $in: items.map((item) => item.titleKey) },
          publishedAt: { $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        })
        .select('titleKey')
        .lean()
        .exec(),
    ]);
    const seenUrls = new Set(existingUrls.map((doc) => doc.urlHash));
    const seenTitles = new Set(existingTitles.map((doc) => doc.titleKey));
    let inserted = 0;
    for (const item of items) {
      if (seenUrls.has(item.urlHash) || seenTitles.has(item.titleKey)) continue;
      seenUrls.add(item.urlHash);
      seenTitles.add(item.titleKey);
      try {
        await this.articleModel.create(item);
        inserted += 1;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
    return inserted;
  }

  /** Fetches og:image for a few recent articles whose feed had no image. */
  private async lookupMissingImages(): Promise<void> {
    const enabledIds = this.feeds.map((feed) => feed.id);
    const candidates = await this.articleModel
      .find({
        feedId: { $in: enabledIds },
        imageUrl: null,
        imageLookupDone: false,
        publishedAt: { $gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      })
      .sort({ publishedAt: -1 })
      .limit(NEWS_IMAGE_LOOKUPS_PER_RUN)
      .select('url feedId')
      .lean()
      .exec();
    for (const article of candidates) {
      let imageUrl: string | null = null;
      const feed = FEEDS_BY_ID.get(article.feedId);
      try {
        if (feed) {
          const page = await fetchSource(article.url, { accept: 'text/html', maxBytes: 1024 * 1024, retries: 0, timeoutMs: 10_000 });
          imageUrl = safeImageUrl(extractOgImage(page.body.toString('utf8')), feed.domains);
        }
      } catch (error) {
        this.logger.debug(`og:image lookup failed for ${article.url}: ${describeError(error)}`);
      }
      await this.articleModel.updateOne({ _id: article._id }, { $set: { imageUrl, imageLookupDone: true } }).exec();
    }
  }

  // ── Public read model ────────────────────────────────────────────────────

  /** Only articles from currently enabled feeds are ever served. */
  private visibleFilter(): FilterQuery<NewsArticleDocument> {
    return { feedId: { $in: this.feeds.map((feed) => feed.id) } };
  }

  async list(query: { category?: NewsCategory; q?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const search = query.q?.trim().replace(/\s+/g, ' ') ?? '';
    return this.cached(`list:${query.category ?? ''}:${search.toLowerCase()}:${page}:${limit}`, async () => {
      const filter: FilterQuery<NewsArticleDocument> = this.visibleFilter();
      if (query.category) filter.category = query.category;
      if (search) {
        const pattern = new RegExp(escapeRegExp(search), 'i');
        filter.$or = [{ title: pattern }, { snippet: pattern }, { publisher: pattern }];
      }
      const [docs, total] = this.feeds.length
        ? await Promise.all([
            this.articleModel.find(filter).sort({ publishedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            this.articleModel.countDocuments(filter).exec(),
          ])
        : [[], 0];
      return {
        data: docs.map(toPublicArticle),
        meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      };
    });
  }

  latest(query: { category?: NewsCategory; limit?: number }) {
    const limit = query.limit ?? 4;
    return this.cached(`latest:${query.category ?? ''}:${limit}`, async () => {
      if (!this.feeds.length) return [];
      const filter: FilterQuery<NewsArticleDocument> = this.visibleFilter();
      if (query.category) filter.category = query.category;
      const docs = await this.articleModel.find(filter).sort({ publishedAt: -1, _id: -1 }).limit(limit).lean().exec();
      return docs.map(toPublicArticle);
    });
  }

  /** Up to `limit` recent stories with images, from different categories. */
  featured(limit = 3) {
    return this.cached(`featured:${limit}`, async () => {
      if (!this.feeds.length) return [];
      const docs = await this.articleModel
        .find({ ...this.visibleFilter(), imageUrl: { $ne: null }, publishedAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } })
        .sort({ publishedAt: -1 })
        .limit(40)
        .lean()
        .exec();
      const picked: typeof docs = [];
      const categories = new Set<string>();
      for (const doc of docs) {
        if (categories.has(doc.category)) continue;
        categories.add(doc.category);
        picked.push(doc);
        if (picked.length >= limit) break;
      }
      return picked.map(toPublicArticle);
    });
  }

  async bySlug(slug: string) {
    if (!/^[a-z0-9-]{3,100}$/.test(slug) || !this.feeds.length) throw new NotFoundException('Article not found');
    return this.cached(`slug:${slug}`, async () => {
      const article = await this.articleModel.findOne({ ...this.visibleFilter(), slug }).lean().exec();
      if (!article) throw new NotFoundException('Article not found');
      const related = await this.articleModel
        .find({ ...this.visibleFilter(), category: article.category, _id: { $ne: article._id } })
        .sort({ publishedAt: -1 })
        .limit(4)
        .lean()
        .exec();
      return { article: toPublicArticle(article), related: related.map(toPublicArticle) };
    });
  }

  /** Re-encoded (WebP, ≤640px) publisher thumbnail, fetched only from the publisher's own domains. */
  async thumbnail(id: string): Promise<Buffer> {
    if (!Types.ObjectId.isValid(id) || !this.feeds.length) throw new NotFoundException('Image not found');
    const cached = this.thumbnails.get(id);
    if (cached && cached.expires > Date.now()) {
      if (!cached.body) throw new NotFoundException('Image not found');
      this.thumbnails.delete(id);
      this.thumbnails.set(id, cached);
      return cached.body;
    }
    let pending = this.thumbnailsInFlight.get(id);
    if (!pending) {
      pending = this.loadThumbnail(id).finally(() => this.thumbnailsInFlight.delete(id));
      this.thumbnailsInFlight.set(id, pending);
    }
    const body = await pending;
    if (!body) throw new NotFoundException('Image not found');
    return body;
  }

  private async loadThumbnail(id: string): Promise<Buffer | null> {
    let body: Buffer | null = null;
    let ttl = THUMBNAIL_FAILURE_MS;
    try {
      const article = await this.articleModel.findOne({ ...this.visibleFilter(), _id: new Types.ObjectId(id) }).select('imageUrl feedId').lean().exec();
      const feed = article ? FEEDS_BY_ID.get(article.feedId) : undefined;
      const imageUrl = feed ? safeImageUrl(article?.imageUrl, feed.domains) : null;
      if (imageUrl) {
        const image = await fetchSource(imageUrl, { accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8', maxBytes: 8 * 1024 * 1024, retries: 1, timeoutMs: 10_000 });
        if (!/^image\//i.test(image.headers.get('content-type') ?? '')) throw new Error('Not an image');
        body = await sharp(image.body, { limitInputPixels: 40_000_000, failOn: 'error' })
          .rotate()
          .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 72 })
          .toBuffer();
        ttl = 24 * 60 * 60 * 1000;
      }
    } catch (error) {
      this.logger.debug(`Thumbnail ${id} unavailable: ${describeError(error)}`);
      body = null;
    }
    this.thumbnails.set(id, { body, expires: Date.now() + ttl });
    while (this.thumbnails.size > THUMBNAIL_CACHE_LIMIT) {
      const oldest = this.thumbnails.keys().next().value;
      if (oldest === undefined) break;
      this.thumbnails.delete(oldest);
    }
    return body;
  }

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.listCache.get(key);
    if (hit && hit.expires > now) return hit.value as Promise<T>;
    const value = load().catch((error) => {
      this.listCache.delete(key);
      throw error;
    });
    this.listCache.set(key, { expires: now + LIST_CACHE_MS, value });
    if (this.listCache.size > 300) {
      const oldest = this.listCache.keys().next().value;
      if (oldest !== undefined) this.listCache.delete(oldest);
    }
    return value;
  }
}

export function toPublicArticle(doc: {
  _id: Types.ObjectId | string;
  slug: string;
  title: string;
  url: string;
  publisher: string;
  category: NewsCategory;
  publishedAt: Date;
  snippet?: string;
  imageUrl?: string | null;
}): PublicNewsArticle {
  const id = doc._id.toString();
  return {
    id,
    slug: doc.slug,
    title: doc.title,
    url: doc.url,
    publisher: doc.publisher,
    category: doc.category,
    categoryLabel: NEWS_CATEGORY_LABELS[doc.category] ?? doc.category,
    publishedAt: new Date(doc.publishedAt).toISOString(),
    excerpt: doc.snippet ?? '',
    thumbnailUrl: doc.imageUrl ? `/api/v1/news/thumbnails/${id}` : null,
  };
}
