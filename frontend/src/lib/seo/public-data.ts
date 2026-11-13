import { cache } from "react";
import type { PublicAgency, PublicAgent, PublicAgencyProfile } from "@/lib/public-directory";
import type { DevelopmentProject } from "@/types/development-project";
import type { PaginationMeta } from "@/types";
import { normalizePublicProperty, type MarketplaceProperty, type PublicPropertyRecord } from "@/types/marketplace";
import { publicApiGet } from "./server-api";
import { slugify } from "./slug";

/** One public listing (published, or previously published and now sold/rented). */
export const getPublicProperty = cache(async (id: string) => {
  const result = await publicApiGet<PublicPropertyRecord>(`/properties/${encodeURIComponent(id)}`);
  return result.ok ? { ok: true as const, property: normalizePublicProperty(result.data) } : result;
});

export const getPublicAgent = cache(async (id: string) =>
  publicApiGet<PublicAgent>(`/users/public/agents/${encodeURIComponent(id)}`),
);

export const getPublicAgents = cache(async (revalidate?: number) => {
  const result = await publicApiGet<PublicAgent[]>("/users/public/agents", { revalidate });
  return result.ok ? result.data : null;
});

export const getFeaturedAgencies = cache(async () => {
  const result = await publicApiGet<PublicAgency[]>("/users/public/featured-agencies");
  return result.ok ? result.data : undefined;
});

export const getPublicAgencyProfile = cache(async (name: string) =>
  publicApiGet<PublicAgencyProfile>(`/agencies/public?name=${encodeURIComponent(name)}`),
);

export const getPublishedProject = cache(async (slug: string) =>
  publicApiGet<DevelopmentProject>(`/projects/${encodeURIComponent(slug)}`),
);

/** Unique public agency names (agencies exist through their public agents). */
export function agencyNamesFrom(agents: PublicAgent[]): string[] {
  const byKey = new Map<string, string>();
  for (const agent of agents) {
    const name = agent.agencyName?.trim().replace(/\s+/g, " ");
    if (name && !byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), name);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/** Resolves an `/agencies/<slug>` slug back to the agency name, or null. */
export const resolveAgencyName = cache(async (slug: string): Promise<string | null | undefined> => {
  const agents = await getPublicAgents();
  if (!agents) return undefined; // API unavailable — caller decides.
  return agencyNamesFrom(agents).find((name) => slugify(name) === slug) ?? null;
});

/** Count of live listings for a search (used to keep empty search pages out of the index). */
export async function countListings(query: Record<string, string>): Promise<number | null> {
  const params = new URLSearchParams({ ...query, limit: "1", page: "1" });
  const result = await publicApiGet<unknown[], PaginationMeta>(`/properties?${params.toString()}`, { revalidate: 900 });
  return result.ok ? result.meta?.total ?? result.data.length : null;
}

/** All live listings for the sitemap (bounded). */
export async function getAllLiveProperties(maxPages = 50): Promise<MarketplaceProperty[]> {
  const properties: MarketplaceProperty[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await publicApiGet<PublicPropertyRecord[], PaginationMeta>(
      `/properties?limit=100&page=${page}&sortBy=newest`,
      { revalidate: 3600, timeoutMs: 10000 },
    );
    if (!result.ok) break;
    properties.push(...result.data.map(normalizePublicProperty));
    const totalPages = result.meta?.totalPages ?? 1;
    if (page >= totalPages || result.data.length === 0) break;
  }
  return properties;
}

export async function getPublishedProjects(revalidate = 3600): Promise<DevelopmentProject[]> {
  const result = await publicApiGet<DevelopmentProject[]>("/projects", { revalidate });
  return result.ok ? result.data : [];
}
