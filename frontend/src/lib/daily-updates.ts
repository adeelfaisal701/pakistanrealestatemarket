import apiClient, { type ApiEnvelope } from "@/lib/api-client";

/** Daily market updates and news (public, read-only). */

export type IndicatorKey = "petrol" | "gold_24k" | "diesel" | "weather_lahore" | "silver" | "usd_pkr";
export type IndicatorStatus = "live" | "stale" | "unavailable";

export interface WeatherSummary {
  condition: string;
  symbol: string;
  temperature: number;
  high: number | null;
  low: number | null;
  humidity: number | null;
  windKmh: number | null;
  precipitation24h: number;
  advisories: string[];
  forecastUpdatedAt: string | null;
}

export interface TickerItem {
  key: IndicatorKey;
  label: string;
  unit: string;
  value: number | null;
  status: IndicatorStatus;
  effectiveAt: string | null;
  verifiedAt: string | null;
  source: { name: string; url: string } | null;
  note: string | null;
  change: { amount: number; since: "previous revision" | "previous day" } | null;
  weather?: WeatherSummary;
}

export interface TickerResponse {
  generatedAt: string;
  items: TickerItem[];
}

export type NewsCategory =
  | "pakistan"
  | "real_estate"
  | "lahore_development"
  | "business"
  | "government"
  | "technology";

export const NEWS_CATEGORIES: Array<{ value: NewsCategory; label: string; short: string }> = [
  { value: "pakistan", label: "Pakistan Breaking News", short: "Pakistan" },
  { value: "real_estate", label: "Real Estate & Property", short: "Real Estate" },
  { value: "lahore_development", label: "Lahore Development", short: "Lahore" },
  { value: "business", label: "Business & Economy", short: "Business" },
  { value: "government", label: "Government Announcements", short: "Government" },
  { value: "technology", label: "Technology & AI", short: "Tech & AI" },
];

export function isNewsCategory(value: unknown): value is NewsCategory {
  return NEWS_CATEGORIES.some((category) => category.value === value);
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  url: string;
  publisher: string;
  category: NewsCategory;
  categoryLabel: string;
  publishedAt: string;
  summary: string;
  summarySource: "ai" | "publisher";
  thumbnailUrl: string | null;
}

export interface NewsListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

let tickerRequest: { expires: number; promise: Promise<TickerResponse> } | null = null;

/** Shared by every mounted homepage layout, so the ticker is requested once per minute. */
export function fetchTicker(): Promise<TickerResponse> {
  const now = Date.now();
  if (tickerRequest && tickerRequest.expires > now) return tickerRequest.promise;
  const promise = apiClient
    .get<ApiEnvelope<TickerResponse>>("/daily-updates/ticker")
    .then((response) => response.data.data)
    .catch((error: unknown) => {
      tickerRequest = null;
      throw error;
    });
  tickerRequest = { expires: now + 60_000, promise };
  return promise;
}

const latestRequests = new Map<string, { expires: number; promise: Promise<NewsArticle[]> }>();

export function fetchLatestNews(category: NewsCategory | "" = "", limit = 4): Promise<NewsArticle[]> {
  const key = `${category}:${limit}`;
  const now = Date.now();
  const cached = latestRequests.get(key);
  if (cached && cached.expires > now) return cached.promise;
  const promise = apiClient
    .get<ApiEnvelope<NewsArticle[]>>("/news/latest", { params: { limit, ...(category ? { category } : {}) } })
    .then((response) => response.data.data)
    .catch((error: unknown) => {
      latestRequests.delete(key);
      throw error;
    });
  latestRequests.set(key, { expires: now + 60_000, promise });
  return promise;
}

export async function fetchNewsPage(params: {
  category?: NewsCategory | "";
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: NewsArticle[]; meta: NewsListMeta }> {
  const query: Record<string, string | number> = { page: params.page ?? 1, limit: params.limit ?? 12 };
  if (params.category) query.category = params.category;
  if (params.q?.trim()) query.q = params.q.trim().slice(0, 80);
  const response = await apiClient.get<ApiEnvelope<NewsArticle[]> & { meta?: NewsListMeta }>("/news", { params: query });
  const items = response.data.data;
  return {
    items,
    meta: response.data.meta ?? { page: 1, limit: items.length, total: items.length, totalPages: 1 },
  };
}

/** Only http(s) publisher links are rendered. */
export function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const PK_TIME_ZONE = "Asia/Karachi";

export function formatPkDateTime(iso: string | null, withTime = true): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: PK_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatPkShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PK", { timeZone: PK_TIME_ZONE, day: "numeric", month: "short" }).format(date);
}

/** "5 min ago", "3 h ago", "2 d ago" — client-side only (depends on the current time). */
export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
