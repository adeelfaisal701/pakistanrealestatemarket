import type { PropertyPurpose, PropertyType } from "@/types";

/**
 * Indexable property-search landing pages are limited to the meaningful
 * filters (city, purpose, property type). Every other filter (price, area,
 * keyword, sort, …) canonicalises to that subset so filter permutations never
 * create duplicate indexable URLs.
 */

const TYPE_PLURALS: Record<PropertyType, string> = {
  House: "Houses",
  Flat: "Apartments",
  "Upper Portion": "Upper Portions",
  "Lower Portion": "Lower Portions",
  Plot: "Plots",
  Commercial: "Commercial Properties",
};

export const LISTING_PROPERTY_TYPES = Object.keys(TYPE_PLURALS) as PropertyType[];
export const LISTING_PURPOSES: PropertyPurpose[] = ["Sale", "Rent"];

export interface ListingSearch {
  city?: string;
  purpose?: PropertyPurpose;
  propertyType?: PropertyType;
}

type ParamValue = string | string[] | undefined;

function first(value: ParamValue): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function titleCaseCity(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

/** Picks the indexable subset of a property search query (invalid values are dropped). */
export function canonicalListingSearch(params: Record<string, ParamValue>): ListingSearch {
  const search: ListingSearch = {};
  const city = first(params.city);
  if (/^[\p{L} .'-]{2,40}$/u.test(city)) search.city = titleCaseCity(city);
  const purpose = first(params.purpose);
  if ((LISTING_PURPOSES as string[]).includes(purpose)) search.purpose = purpose as PropertyPurpose;
  const propertyType = first(params.propertyType);
  if ((LISTING_PROPERTY_TYPES as string[]).includes(propertyType)) search.propertyType = propertyType as PropertyType;
  return search;
}

export function isEmptyListingSearch(search: ListingSearch): boolean {
  return !search.city && !search.purpose && !search.propertyType;
}

/** Stable URL for a listing search (fixed parameter order). */
export function listingSearchPath(search: ListingSearch): string {
  const query = new URLSearchParams();
  if (search.city) query.set("city", search.city);
  if (search.purpose) query.set("purpose", search.purpose);
  if (search.propertyType) query.set("propertyType", search.propertyType);
  const qs = query.toString();
  return qs ? `/properties?${qs}` : "/properties";
}

/** Human heading, e.g. "Houses for Sale in Lahore" or "Properties for Sale & Rent in Pakistan". */
export function describeListingSearch(search: ListingSearch): string {
  const subject = search.propertyType ? TYPE_PLURALS[search.propertyType] : "Properties";
  const purpose =
    search.purpose === "Sale" ? "for Sale" : search.purpose === "Rent" ? "for Rent" : "for Sale & Rent";
  const place = search.city ? `in ${search.city}` : "in Pakistan";
  return `${subject} ${purpose} ${place}`;
}

export function describeListingSearchSummary(search: ListingSearch): string {
  const what = describeListingSearch(search);
  return `Browse verified ${what.charAt(0).toLowerCase()}${what.slice(1)} on Ghar Safar — real photos, prices, area details and direct WhatsApp contact with trusted agents.`;
}
