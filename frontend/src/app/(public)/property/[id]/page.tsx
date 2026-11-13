import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PropertyDetailsClient from "./property-details-client";
import { formatPKR } from "@/lib/utils";
import type { MarketplaceProperty } from "@/types/marketplace";
import { buildMetadata, NOINDEX_FOLLOW } from "@/lib/seo/metadata";
import { getPublicProperty } from "@/lib/seo/public-data";
import { propertyPath, splitSlugId } from "@/lib/seo/slug";
import { truncateText } from "@/lib/seo/site";

interface PropertyDetailsPageProps {
  params: Promise<{ id: string }>;
}

/** "House for Sale in DHA Phase 6, Lahore" — derived only from the listing's own fields. */
function listingSummary(property: MarketplaceProperty) {
  const place = [property.location.area, property.location.city].filter(Boolean).join(", ");
  return `${property.propertyType} for ${property.purpose}${place ? ` in ${place}` : ""}`;
}

function metaTitle(property: MarketplaceProperty) {
  const city = property.location.city?.trim();
  const title = property.title.trim();
  const withCity = city && !title.toLowerCase().includes(city.toLowerCase()) ? `${title}, ${city}` : title;
  return `${withCity} | Ghar Safar`;
}

function metaDescription(property: MarketplaceProperty) {
  const facts = [
    `${property.areaSize} ${property.areaUnit}`,
    property.features?.bedrooms ? `${property.features.bedrooms} bed` : "",
    property.features?.bathrooms ? `${property.features.bathrooms} bath` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const price = `${formatPKR(property.price)}${property.purpose === "Rent" ? " per month" : ""}`;
  const lead = `${listingSummary(property)} — ${facts} — ${price}.`;
  const body = property.description?.trim() ? ` ${property.description.trim()}` : " View photos, details and contact the agent on Ghar Safar.";
  return truncateText(`${lead}${body}`, 160);
}

async function loadListing(param: string) {
  const parsed = splitSlugId(param);
  if (!parsed) return { kind: "invalid" as const };
  const result = await getPublicProperty(parsed.id);
  if (result.ok) return { kind: "found" as const, id: parsed.id, property: result.property };
  if (result.status === 404 || result.status === 400) return { kind: "missing" as const };
  // Backend unreachable: render the page and let the client load it.
  return { kind: "unavailable" as const, id: parsed.id };
}

export async function generateMetadata({ params }: PropertyDetailsPageProps): Promise<Metadata> {
  const { id: param } = await params;
  const listing = await loadListing(param);
  if (listing.kind === "invalid" || listing.kind === "missing") notFound();
  if (listing.kind === "unavailable") {
    return { title: "Property details | Ghar Safar", alternates: { canonical: `/property/${param}` } };
  }

  const { property } = listing;
  const live = property.status === "published" && (property.availabilityStatus ?? "available") === "available";
  const image = property.images?.[0];
  return buildMetadata({
    title: metaTitle(property),
    description: metaDescription(property),
    path: propertyPath(property),
    images: image ? [{ url: image, alt: `${property.title} — ${listingSummary(property)}` }] : undefined,
    // Sold / rented / unavailable listings stay reachable but leave the index.
    robots: live ? undefined : NOINDEX_FOLLOW,
  });
}

export default async function PropertyDetailsPage({ params }: PropertyDetailsPageProps) {
  const { id: param } = await params;
  const listing = await loadListing(param);
  if (listing.kind === "invalid" || listing.kind === "missing") notFound();

  if (listing.kind === "found") {
    const canonical = propertyPath(listing.property);
    let requested = param;
    try {
      requested = decodeURIComponent(param);
    } catch {
      // keep raw value
    }
    // Legacy /property/<id> and outdated slugs move permanently to the canonical URL.
    if (`/property/${requested}` !== canonical) permanentRedirect(canonical);
    return <PropertyDetailsClient propertyId={listing.id} initialProperty={listing.property} />;
  }

  return <PropertyDetailsClient propertyId={listing.id} />;
}
