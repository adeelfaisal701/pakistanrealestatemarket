import type { Metadata } from "next";
import PropertiesCatalogPage from "./properties-client";
import { buildMetadata, NOINDEX_FOLLOW } from "@/lib/seo/metadata";
import {
  canonicalListingSearch,
  describeListingSearch,
  describeListingSearchSummary,
  isEmptyListingSearch,
  listingSearchPath,
} from "@/lib/seo/listing-search";
import { countListings } from "@/lib/seo/public-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const search = canonicalListingSearch(await searchParams);
  const heading = describeListingSearch(search);

  // Filtered landing pages with no live listings are kept out of the index.
  let robots: Metadata["robots"];
  if (!isEmptyListingSearch(search)) {
    const query: Record<string, string> = {};
    if (search.city) query.city = search.city;
    if (search.purpose) query.purpose = search.purpose;
    if (search.propertyType) query.propertyType = search.propertyType;
    const total = await countListings(query);
    if (total === 0) robots = NOINDEX_FOLLOW;
  }

  return buildMetadata({
    title: `${heading} | Ghar Safar`,
    description: describeListingSearchSummary(search),
    path: listingSearchPath(search),
    robots,
  });
}

export default async function PropertiesPage({ searchParams }: { searchParams: SearchParams }) {
  const heading = describeListingSearch(canonicalListingSearch(await searchParams));
  return <PropertiesCatalogPage initialHeading={heading} />;
}
