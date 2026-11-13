import type { Metadata } from "next";
import { DEFAULT_LOCALE, SITE_NAME, absoluteUrl } from "./site";

export interface SeoImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

/** Keeps a page out of search results while still letting crawlers follow its links. */
export const NOINDEX_FOLLOW: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
};

/** Private areas (dashboards, account pages): not indexed, links not followed. */
export const NOINDEX_NOFOLLOW: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

/** Generated branded share cards (see app/opengraph-image.tsx and app/maintenance/opengraph-image.tsx). */
export const DEFAULT_SHARE_IMAGE: SeoImage = {
  url: "/opengraph-image",
  alt: "Ghar Safar — Property for sale and rent in Lahore, Pakistan",
  width: 1200,
  height: 630,
};
export const MAINTENANCE_SHARE_IMAGE: SeoImage = {
  url: "/maintenance/opengraph-image",
  alt: "Ghar Safar Property Care — home maintenance services in Lahore",
  width: 1200,
  height: 630,
};

/**
 * Builds consistent page metadata: unique title and description, a canonical
 * URL on NEXT_PUBLIC_SITE_URL, and matching Open Graph / Twitter tags.
 * Pages without their own imagery use the branded share card (a page-level
 * `openGraph` object would otherwise drop the inherited file-based image).
 */
export function buildMetadata({
  title,
  description,
  path,
  images,
  robots,
  keywords,
  fallbackImage = DEFAULT_SHARE_IMAGE,
}: {
  title: string;
  description: string;
  path: string;
  images?: SeoImage[];
  robots?: Metadata["robots"];
  keywords?: string[];
  fallbackImage?: SeoImage;
}): Metadata {
  const ogImages = (images?.length ? images : [fallbackImage]).map((image) => ({
    ...image,
    url: absoluteUrl(image.url),
  }));
  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      title,
      description,
      url: absoluteUrl(path),
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((image) => image.url),
    },
    ...(robots ? { robots } : {}),
  };
}
