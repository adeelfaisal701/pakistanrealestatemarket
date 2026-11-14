import { cache } from "react";
import type { NewsArticle, NewsCategory, NewsListMeta } from "@/lib/daily-updates";
import { publicApiGet } from "./server-api";

/** Server-side reads of the public news endpoints (never throw; null = unavailable). */

export async function getNewsList(params: { category?: NewsCategory | ""; q?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 12) });
  if (params.category) query.set("category", params.category);
  if (params.q?.trim()) query.set("q", params.q.trim().slice(0, 80));
  const result = await publicApiGet<NewsArticle[], NewsListMeta>(`/news?${query.toString()}`, { revalidate: 120 });
  return result.ok ? { items: result.data, meta: result.meta ?? null } : null;
}

export async function getFeaturedNews() {
  const result = await publicApiGet<NewsArticle[]>("/news/featured", { revalidate: 300 });
  return result.ok ? result.data : null;
}

export const getNewsArticle = cache(async (slug: string) =>
  publicApiGet<{ article: NewsArticle; related: NewsArticle[] }>(`/news/${encodeURIComponent(slug)}`, { revalidate: 300 }),
);
