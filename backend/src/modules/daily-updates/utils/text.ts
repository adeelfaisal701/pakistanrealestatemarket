import { createHash } from 'crypto';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', bull: '•', middot: '·',
  copy: '©', reg: '®', trade: '™', deg: '°', rupee: '₹', pound: '£', euro: '€', shy: '',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
      try {
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()];
    return named ?? match;
  });
}

/** Converts an HTML fragment to plain text (tags, scripts, styles and figures removed). */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|figure|iframe|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|h\d)>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Removes feed boilerplate such as "The post X appeared first on Y." */
export function stripFeedBoilerplate(text: string): string {
  return text
    .replace(/The post .{0,300}? (?:appeared|first appeared) first on .{0,120}?\.?\s*$/i, '')
    .replace(/This post .{0,300}? first appeared on .{0,200}?$/i, '')
    .replace(/\s*(?:…|\.\.\.)?\s*Read More\s*$/i, '…')
    .replace(/^Associated Press Of Pakistan\s+/i, '')
    .trim();
}

/** Up to `maxSentences` sentences, never longer than `maxChars` (ellipsis on cut). */
export function firstSentences(text: string, maxChars: number, maxSentences = 2): string {
  const clean = text.replace(/\s+/g, ' ').replace(/^[•·\-–—*\s]+/, '').trim();
  if (!clean) return '';
  // A sentence ends at . ! ? (plus closing quotes) followed by whitespace or the end,
  // so decimals ("2.1pc") and abbreviations inside words do not split it.
  const sentences = clean.match(/.+?[.!?]+["”’)]*(?=\s|$)\s*/g) ?? [clean];
  let output = '';
  for (const sentence of sentences.slice(0, maxSentences)) {
    if ((output + sentence).trim().length > maxChars) break;
    output += sentence;
  }
  output = output.trim();
  if (output) return output;
  return truncate(clean, maxChars);
}

export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}

/** Lower-case alphanumeric headline key used to detect the same story twice. */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 14)
    .join(' ');
}

export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, maxLength).replace(/-+$/g, '') || 'news';
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|cmpid|ocid)$/i;

/**
 * Canonical https(s) article URL on one of the feed's own domains, or null.
 * Credentials, non-standard ports, fragments and tracking parameters are removed/rejected.
 */
export function canonicalArticleUrl(raw: string, domains: string[]): string | null {
  let url: URL;
  try {
    url = new URL(decodeEntities(raw.trim()));
  } catch {
    return null;
  }
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (!hostMatches(url.hostname, domains)) return null;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

export function hostMatches(hostname: string, domains: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** https image URL on one of the publisher's domains (http upgraded), or null. */
export function safeImageUrl(raw: string | undefined | null, domains: string[]): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(decodeEntities(raw.trim()));
  } catch {
    return null;
  }
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (!hostMatches(url.hostname, domains)) return null;
  if (/\.(svg|gif)(\?|$)/i.test(url.pathname)) return null;
  return url.toString();
}

/** Calendar date (YYYY-MM-DD) in Pakistan time. */
export function pakistanDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
