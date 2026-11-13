import type { MetadataRoute } from "next";
import { PROPERTY_CARE_SERVICES } from "@/lib/property-care-services";
import { absoluteUrl } from "@/lib/seo/site";
import { agencyPath, agentPath, propertyPath } from "@/lib/seo/slug";
import { canonicalListingSearch, listingSearchPath, type ListingSearch } from "@/lib/seo/listing-search";
import {
  agencyNamesFrom,
  getAllLiveProperties,
  getPublicAgents,
  getPublishedProjects,
} from "@/lib/seo/public-data";

/** Regenerated at most hourly. Built only from real, public records. */
export const revalidate = 3600;

const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/properties", priority: 0.9, changeFrequency: "hourly" },
  { path: "/agencies", priority: 0.7, changeFrequency: "weekly" },
  { path: "/agents", priority: 0.7, changeFrequency: "weekly" },
  { path: "/projects", priority: 0.7, changeFrequency: "weekly" },
  { path: "/maintenance", priority: 0.8, changeFrequency: "weekly" },
];

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, agents, projects] = await Promise.all([
    getAllLiveProperties(),
    getPublicAgents(3600),
    getPublishedProjects(),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  for (const service of PROPERTY_CARE_SERVICES) {
    entries.push({
      url: absoluteUrl(`/maintenance/services/${service.slug}`),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Search landing pages — only combinations that currently have listings.
  const searches = new Map<string, ListingSearch>();
  for (const property of properties) {
    const city = canonicalListingSearch({ city: property.location.city }).city;
    const { purpose, propertyType } = property;
    const combos: ListingSearch[] = [{ purpose }, { propertyType }];
    if (city) {
      combos.push({ city }, { city, purpose }, { city, purpose, propertyType });
    }
    for (const combo of combos) searches.set(listingSearchPath(combo), combo);
  }
  for (const path of searches.keys()) {
    entries.push({ url: absoluteUrl(path), changeFrequency: "daily", priority: 0.8 });
  }

  for (const property of properties) {
    entries.push({
      url: absoluteUrl(propertyPath(property)),
      lastModified: toDate(property.updatedAt ?? property.createdAt),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const agent of agents ?? []) {
    entries.push({ url: absoluteUrl(agentPath(agent)), changeFrequency: "weekly", priority: 0.5 });
  }

  for (const name of agencyNamesFrom(agents ?? [])) {
    const path = agencyPath(name);
    if (!path.includes("?")) {
      entries.push({ url: absoluteUrl(path), changeFrequency: "weekly", priority: 0.6 });
    }
  }

  for (const project of projects) {
    entries.push({
      url: absoluteUrl(`/projects/${encodeURIComponent(project.slug)}`),
      lastModified: toDate(project.updatedAt),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
