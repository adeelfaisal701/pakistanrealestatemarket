/**
 * Site-wide SEO constants. The canonical origin always comes from
 * NEXT_PUBLIC_SITE_URL (validated as an HTTPS origin in production by
 * next.config.ts), so canonical URLs never point at the admin host or a
 * preview domain.
 */
export const SITE_NAME = "Ghar Safar";
export const SITE_TAGLINE = "Har Khwab Ki Manzil, Apna Ghar.";
export const MAINTENANCE_BRAND = "Ghar Safar Property Care";
export const DEFAULT_LOCALE = "en_PK";
export const LOGO_PATH = "/images/ghar-safar-logo.png";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the development default; production config rejects invalid values.
    }
  }
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/** Absolute URL on the canonical origin for a site path (or an already-absolute URL). */
export function absoluteUrl(pathOrUrl = "/"): string {
  return new URL(pathOrUrl, SITE_URL).toString();
}

/** Trims text to a meta-description friendly length on a word boundary. */
export function truncateText(text: string, maxLength = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
