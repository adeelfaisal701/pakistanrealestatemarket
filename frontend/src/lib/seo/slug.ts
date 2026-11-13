/**
 * SEO-friendly URL helpers (safe on server and client).
 *
 * Property and agent URLs keep the record id as a suffix
 * (`/property/5-marla-house-for-sale-dha-lahore-<id>`), so URLs stay unique and
 * stable without a database slug field; legacy `/property/<id>` and
 * `/agents/<id>` URLs permanently redirect to the slugged form.
 */

const STOP_WORDS = new Set(["a", "an", "the", "in", "at", "of", "and"]);
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function slugify(input: string, maxLength = 80): string {
  const words = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
  let slug = "";
  for (const word of words) {
    const next = slug ? `${slug}-${word}` : word;
    if (next.length > maxLength) break;
    slug = next;
  }
  return slug;
}

export function isObjectId(value: string): boolean {
  return OBJECT_ID.test(value);
}

/** Splits `some-readable-slug-<24 hex id>` (or a bare id) into its parts. */
export function splitSlugId(param: string): { id: string; slug: string } | null {
  let decoded = param;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    return null;
  }
  const match = decoded.match(/^(?:(.*)-)?([a-f0-9]{24})$/i);
  if (!match) return null;
  return { slug: (match[1] ?? "").toLowerCase(), id: match[2].toLowerCase() };
}

interface PropertyLike {
  id: string;
  title?: string;
  propertyType?: string;
  purpose?: string;
  location?: { area?: string; city?: string };
}

export function propertySlug(property: PropertyLike): string {
  return (
    slugify(property.title ?? "") ||
    slugify(
      [property.propertyType, "for", property.purpose, property.location?.area, property.location?.city]
        .filter(Boolean)
        .join(" "),
    ) ||
    "property"
  );
}

export function propertyPath(property: PropertyLike): string {
  return `/property/${propertySlug(property)}-${property.id}`;
}

export function agentPath(agent: { id: string; name?: string }): string {
  return `/agents/${slugify(agent.name ?? "") || "agent"}-${agent.id}`;
}

/** Agencies are identified by name; non-Latin names fall back to the query URL. */
export function agencyPath(name: string): string {
  const slug = slugify(name);
  return slug ? `/agencies/${slug}` : `/agencies?name=${encodeURIComponent(name)}`;
}
