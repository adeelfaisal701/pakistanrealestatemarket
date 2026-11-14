/** Market indicators shown in the homepage ticker, in display order. */
export enum IndicatorKey {
  PETROL = 'petrol',
  GOLD_24K = 'gold_24k',
  DIESEL = 'diesel',
  WEATHER_LAHORE = 'weather_lahore',
  USD_PKR = 'usd_pkr',
}

export const TICKER_ORDER: IndicatorKey[] = [
  IndicatorKey.PETROL,
  IndicatorKey.GOLD_24K,
  IndicatorKey.DIESEL,
  IndicatorKey.WEATHER_LAHORE,
  IndicatorKey.USD_PKR,
];

export interface IndicatorDefinition {
  label: string;
  unit: string;
  /**
   * `source`: stale when the source's own timestamp is older than `staleAfterMs`
   * (live market data). `verified`: stale when we have not been able to confirm
   * the value with the source for `staleAfterMs` (administered prices that stay
   * valid until revised, and forecasts).
   */
  staleBasis: 'source' | 'verified';
  staleAfterMs: number;
  /** Plausibility bounds; values outside are rejected as invalid source data. */
  min: number;
  max: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const INDICATORS: Record<IndicatorKey, IndicatorDefinition> = {
  [IndicatorKey.PETROL]: { label: 'Petrol', unit: 'PKR/litre', staleBasis: 'verified', staleAfterMs: 48 * HOUR, min: 50, max: 2000 },
  [IndicatorKey.DIESEL]: { label: 'Diesel (HSD)', unit: 'PKR/litre', staleBasis: 'verified', staleAfterMs: 48 * HOUR, min: 50, max: 2000 },
  [IndicatorKey.GOLD_24K]: { label: 'Gold (Intl Spot Equiv.)', unit: 'PKR/tola', staleBasis: 'source', staleAfterMs: 12 * HOUR, min: 10_000, max: 10_000_000 },
  [IndicatorKey.USD_PKR]: { label: 'USD/PKR', unit: 'PKR', staleBasis: 'source', staleAfterMs: 36 * HOUR, min: 50, max: 2000 },
  // MET Norway allows one identical request per 3 h outside the Nordic region.
  [IndicatorKey.WEATHER_LAHORE]: { label: 'Lahore', unit: '°C', staleBasis: 'verified', staleAfterMs: 7 * HOUR, min: -20, max: 60 },
};

/** Grams per troy ounce and per tola (the tola used by Pakistani bullion markets). */
export const GRAMS_PER_TROY_OUNCE = 31.1034768;
export const GRAMS_PER_TOLA = 11.6638038;

/** Coordinates are limited to 4 decimals (MET Norway rejects more). */
export const LAHORE = { latitude: 31.5204, longitude: 74.3587 };

export const SOURCES = {
  exchangeRate: { name: 'Rates By Exchange Rate API', url: 'https://www.exchangerate-api.com' },
  goldApi: { name: 'Gold API — international spot', url: 'https://gold-api.com' },
  metNorway: { name: 'Data from MET Norway', url: 'https://api.met.no' },
  ogra: { name: 'OGRA daily price publication', url: 'https://www.ogra.org.pk/price-publications' },
} as const;

export const ENDPOINTS = {
  exchangeRate: 'https://open.er-api.com/v6/latest/USD',
  gold: 'https://api.gold-api.com/price/XAU',
  weather: `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${LAHORE.latitude}&lon=${LAHORE.longitude}`,
  ograPublications: 'https://www.ogra.org.pk/price-publications',
} as const;

/** Scheduled jobs and how often each runs (based on how often the source changes). */
export enum DailyUpdatesJob {
  EXCHANGE_RATE = 'daily-updates:exchange-rate',
  GOLD = 'daily-updates:gold',
  WEATHER = 'daily-updates:weather',
  FUEL = 'daily-updates:fuel',
  NEWS_INGEST = 'daily-updates:news-ingest',
}

export const JOB_INTERVALS: Record<DailyUpdatesJob, number> = {
  // Updated once a day; the response's own next-update time is also honoured.
  [DailyUpdatesJob.EXCHANGE_RATE]: 6 * HOUR,
  [DailyUpdatesJob.GOLD]: 2 * HOUR,
  // MET Norway: identical requests no more than every 3rd hour outside the Nordic region.
  [DailyUpdatesJob.WEATHER]: 3 * HOUR,
  // OGRA publishes one sheet per working day; the PDF is downloaded only when new.
  [DailyUpdatesJob.FUEL]: 3 * HOUR,
  [DailyUpdatesJob.NEWS_INGEST]: 30 * MINUTE,
};

/** Maximum time a job may hold its lock before another instance may take over. */
export const JOB_LEASE_MS = 10 * MINUTE;

export enum NewsCategory {
  PAKISTAN = 'pakistan',
  REAL_ESTATE = 'real_estate',
  LAHORE_DEVELOPMENT = 'lahore_development',
  BUSINESS = 'business',
  GOVERNMENT = 'government',
  TECHNOLOGY = 'technology',
}

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  [NewsCategory.PAKISTAN]: 'Pakistan Breaking News',
  [NewsCategory.REAL_ESTATE]: 'Real Estate & Property',
  [NewsCategory.LAHORE_DEVELOPMENT]: 'Lahore Development',
  [NewsCategory.BUSINESS]: 'Business & Economy',
  [NewsCategory.GOVERNMENT]: 'Government Announcements',
  [NewsCategory.TECHNOLOGY]: 'Technology & AI',
};

export interface NewsFeed {
  id: string;
  publisher: string;
  url: string;
  defaultCategory: NewsCategory;
  /** Registrable domains article links and images must belong to. */
  domains: string[];
  /** What the publisher's published terms say about this use (checked 2026-11-14). */
  terms: { url: string; status: 'prohibited-without-permission' | 'unclear' };
  /** Only accept items carrying one of these RSS <category> values (case-insensitive). */
  includeFeedCategories?: string[];
  /** Feeds whose items keep their category (keyword reclassification is skipped). */
  fixedCategory?: boolean;
  /** Overrides NEWS_MAX_AGE_MS for low-volume feeds. */
  maxAgeMs?: number;
}

/**
 * Known feeds. NONE is collected by default: a feed is ingested only when its
 * id is listed in NEWS_FEEDS_ENABLED, which must only be done after the
 * publisher has granted (written) permission for commercial display of
 * headlines, excerpts, thumbnails and links.
 */
export const NEWS_FEEDS: NewsFeed[] = [
  { id: 'dawn-pakistan', publisher: 'Dawn', url: 'https://www.dawn.com/feeds/pakistan', defaultCategory: NewsCategory.PAKISTAN, domains: ['dawn.com'], terms: { url: 'https://www.dawn.com/terms/', status: 'prohibited-without-permission' } },
  { id: 'dawn-business', publisher: 'Dawn', url: 'https://www.dawn.com/feeds/business', defaultCategory: NewsCategory.BUSINESS, domains: ['dawn.com'], terms: { url: 'https://www.dawn.com/terms/', status: 'prohibited-without-permission' } },
  { id: 'geo-latest', publisher: 'Geo News', url: 'https://www.geo.tv/rss/1/1', defaultCategory: NewsCategory.PAKISTAN, domains: ['geo.tv'], terms: { url: 'https://www.geo.tv/terms-and-conditions', status: 'unclear' } },
  { id: 'tribune-pakistan', publisher: 'The Express Tribune', url: 'https://tribune.com.pk/feed/pakistan', defaultCategory: NewsCategory.PAKISTAN, domains: ['tribune.com.pk'], terms: { url: 'https://tribune.com.pk/copyrights', status: 'prohibited-without-permission' } },
  { id: 'tribune-lahore', publisher: 'The Express Tribune', url: 'https://tribune.com.pk/feed/lahore', defaultCategory: NewsCategory.PAKISTAN, domains: ['tribune.com.pk'], terms: { url: 'https://tribune.com.pk/copyrights', status: 'prohibited-without-permission' } },
  { id: 'tribune-business', publisher: 'The Express Tribune', url: 'https://tribune.com.pk/feed/business', defaultCategory: NewsCategory.BUSINESS, domains: ['tribune.com.pk'], terms: { url: 'https://tribune.com.pk/copyrights', status: 'prohibited-without-permission' } },
  { id: 'tribune-technology', publisher: 'The Express Tribune', url: 'https://tribune.com.pk/feed/technology', defaultCategory: NewsCategory.TECHNOLOGY, domains: ['tribune.com.pk'], fixedCategory: true, terms: { url: 'https://tribune.com.pk/copyrights', status: 'prohibited-without-permission' } },
  { id: 'propakistani-real-estate', publisher: 'ProPakistani', url: 'https://propakistani.pk/category/real-estate/feed/', defaultCategory: NewsCategory.REAL_ESTATE, domains: ['propakistani.pk'], fixedCategory: true, maxAgeMs: 10 * 24 * HOUR, terms: { url: 'https://propakistani.pk/terms-and-conditions/', status: 'prohibited-without-permission' } },
  { id: 'brecorder-latest', publisher: 'Business Recorder', url: 'https://www.brecorder.com/feeds/latest-news', defaultCategory: NewsCategory.BUSINESS, domains: ['brecorder.com'], includeFeedCategories: ['Business & Finance', 'Pakistan'], terms: { url: 'https://www.brecorder.com/', status: 'unclear' } },
  { id: 'app-national', publisher: 'Associated Press of Pakistan', url: 'https://www.app.com.pk/national/feed/', defaultCategory: NewsCategory.PAKISTAN, domains: ['app.com.pk'], terms: { url: 'https://www.app.com.pk/', status: 'unclear' } },
  { id: 'techcrunch-ai', publisher: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', defaultCategory: NewsCategory.TECHNOLOGY, domains: ['techcrunch.com'], fixedCategory: true, terms: { url: 'https://techcrunch.com/rss-terms-of-use/', status: 'unclear' } },
];

/** Articles older than this when first seen are not imported. */
export const NEWS_MAX_AGE_MS = 4 * 24 * HOUR;
/** Articles are removed automatically after this. */
export const NEWS_RETENTION_MS = 45 * 24 * HOUR;
/** Indicator history rows are removed automatically after this. */
export const HISTORY_RETENTION_MS = 2 * 365 * 24 * HOUR;
export const NEWS_ITEMS_PER_FEED = 15;
export const NEWS_IMAGE_LOOKUPS_PER_RUN = 8;
/** The publisher's own feed description, cut to at most two sentences / this many characters. */
export const NEWS_SNIPPET_MAX = 280;

export const USER_AGENT_PRODUCT = 'GharSafar-DailyUpdates/1.0';
