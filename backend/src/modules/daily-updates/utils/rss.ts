import { decodeEntities } from './text';

export interface FeedItem {
  title: string;
  link: string;
  /** Raw HTML/text of the description (publisher-provided). */
  description: string;
  /** Raw HTML of content:encoded, when present. */
  content: string;
  publishedAt: Date | null;
  categories: string[];
  imageCandidates: string[];
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const ZONES: Record<string, number> = { UT: 0, UTC: 0, GMT: 0, Z: 0, PKT: 300, EST: -300, EDT: -240, CST: -360, CDT: -300, PST: -480, PDT: -420 };

/**
 * Parses RFC 822/2822 dates (including two-digit years, as published by some
 * feeds, and "+05:00" offsets) and ISO-8601 dates. Returns null when unsure.
 */
export function parseFeedDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const value = raw.trim();
  const rfc = value.match(
    /^(?:[A-Za-z]{3},?\s+)?(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([+-]\d{2}:?\d{2}|[A-Za-z]{1,4})?$/,
  );
  if (rfc) {
    const [, day, monthName, yearRaw, hour, minute, second, zoneRaw] = rfc;
    const month = MONTHS[monthName.toLowerCase()];
    if (month === undefined) return null;
    let year = Number(yearRaw);
    if (yearRaw.length === 2) year += year < 70 ? 2000 : 1900;
    let offsetMinutes = 0;
    if (zoneRaw) {
      const numeric = zoneRaw.match(/^([+-])(\d{2}):?(\d{2})$/);
      if (numeric) {
        offsetMinutes = (numeric[1] === '-' ? -1 : 1) * (Number(numeric[2]) * 60 + Number(numeric[3]));
      } else if (ZONES[zoneRaw.toUpperCase()] !== undefined) {
        offsetMinutes = ZONES[zoneRaw.toUpperCase()];
      } else {
        return null;
      }
    }
    const utc = Date.UTC(year, month, Number(day), Number(hour), Number(minute), Number(second ?? 0)) - offsetMinutes * 60_000;
    const date = new Date(utc);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function unwrapCdata(value: string): string {
  // A field may contain several CDATA sections (e.g. an image followed by text).
  if (!value.includes('<![CDATA[')) return value;
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function tagContents(block: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&');
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block))) values.push(match[1]);
  return values;
}

function firstTag(block: string, ...tags: string[]): string {
  for (const tag of tags) {
    const [value] = tagContents(block, tag);
    if (value !== undefined) return unwrapCdata(value).trim();
  }
  return '';
}

function attributeValues(block: string, tag: string, attribute: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&');
  const pattern = new RegExp(`<${escaped}\\b([^>]*)>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block))) {
    const attr = match[1].match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'i'));
    if (attr) values.push(attr[1]);
  }
  return values;
}

function imageCandidates(block: string, description: string, content: string): string[] {
  const candidates: string[] = [];
  for (const tag of block.match(/<media:content\b[^>]*>/gi) ?? []) {
    // Skip videos/audio: only image media (or untyped media) are thumbnails.
    if (/\bmedium\s*=\s*["'](?!image)/i.test(tag) || /\btype\s*=\s*["'](?!image)/i.test(tag)) continue;
    const url = tag.match(/\burl\s*=\s*["']([^"']+)["']/i);
    if (url) candidates.push(url[1]);
  }
  candidates.push(...attributeValues(block, 'media:thumbnail', 'url'));
  const enclosures = block.match(/<enclosure\b[^>]*>/gi) ?? [];
  for (const enclosure of enclosures) {
    if (!/type\s*=\s*["']image\//i.test(enclosure)) continue;
    const url = enclosure.match(/\burl\s*=\s*["']([^"']+)["']/i);
    if (url) candidates.push(url[1]);
  }
  for (const html of [decodeEntities(description), content]) {
    const img = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
    if (img) candidates.push(img[1]);
  }
  return [...new Set(candidates.map((candidate) => decodeEntities(candidate.trim())).filter(Boolean))];
}

/** Minimal, dependency-free RSS 2.0 / Atom reader for headline feeds. */
export function parseFeed(xml: string): FeedItem[] {
  const isAtom = !/<item[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const blocks = tagContents(xml, isAtom ? 'entry' : 'item');
  return blocks.map((block) => {
    const description = firstTag(block, 'description', 'summary');
    const content = firstTag(block, 'content:encoded', 'content');
    let link = firstTag(block, 'link');
    if (isAtom || !link) {
      const hrefs = block.match(/<link\b[^>]*>/gi) ?? [];
      const alternate = hrefs.find((tag) => !/rel\s*=/i.test(tag) || /rel\s*=\s*["']alternate["']/i.test(tag));
      const href = alternate?.match(/href\s*=\s*["']([^"']+)["']/i);
      if (href) link = href[1];
    }
    return {
      title: decodeEntities(firstTag(block, 'title')).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      link: decodeEntities(link).trim(),
      description,
      content,
      publishedAt: parseFeedDate(firstTag(block, 'pubDate', 'dc:date', 'published', 'updated')),
      categories: tagContents(block, 'category').map((value) => decodeEntities(unwrapCdata(value)).trim()).filter(Boolean),
      imageCandidates: imageCandidates(block, description, content),
    };
  });
}
