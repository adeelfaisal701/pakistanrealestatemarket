import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/seo/site";

/**
 * robots.txt
 * - Private areas are disallowed (they also send noindex).
 * - Sign-in pages are NOT disallowed: crawlers must be able to see their
 *   noindex directive for it to take effect.
 * - `/agent/` and `/agent$` are used instead of `/agent` because a bare prefix
 *   would also block the public `/agents/...` profiles.
 * - The admin hostname is never crawlable.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOSTNAME?.trim().toLowerCase();
  const requestHost = ((await headers()).get("x-forwarded-host") ?? (await headers()).get("host") ?? "")
    .split(",")[0]
    .trim()
    .replace(/:\d+$/, "")
    .toLowerCase();

  if (adminHost && requestHost === adminHost) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/agent/",
          "/agent$",
          "/buyer",
          "/technician",
          "/care",
          "/care-ops",
          "/property-care-preview",
          "/shared-location",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
