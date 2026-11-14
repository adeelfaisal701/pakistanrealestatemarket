import { USER_AGENT_PRODUCT } from '../daily-updates.constants';

export class SourceRateLimitedError extends Error {
  constructor(
    readonly url: string,
    readonly retryAfter: Date,
  ) {
    super(`Source rate limited the request; retry after ${retryAfter.toISOString()}`);
  }
}

export class SourceHttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`Source responded with HTTP ${status}`);
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  /** Attempts after the first one, for network errors and 5xx responses. */
  retries?: number;
  maxBytes?: number;
  accept?: string;
  headers?: Record<string, string>;
  /** Contact URL/email appended to the User-Agent (required by MET Norway). */
  contact?: string;
}

export interface FetchedResource {
  status: number;
  headers: Headers;
  body: Buffer;
  finalUrl: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function userAgent(contact?: string) {
  return contact ? `${USER_AGENT_PRODUCT} (+${contact})` : USER_AGENT_PRODUCT;
}

function parseRetryAfter(value: string | null, now = Date.now()): Date {
  const seconds = Number(value);
  if (value && Number.isFinite(seconds) && seconds >= 0) return new Date(now + Math.min(seconds, 86_400) * 1000);
  const date = value ? Date.parse(value) : NaN;
  if (Number.isFinite(date) && date > now) return new Date(Math.min(date, now + 86_400_000));
  return new Date(now + 15 * 60 * 1000);
}

async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Response is larger than ${maxBytes} bytes`);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`Response is larger than ${maxBytes} bytes`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * GETs a public source with a timeout, a size cap, bounded retries with
 * exponential backoff (network errors / 5xx only) and explicit handling of
 * rate limiting (429/503 + Retry-After), which is never retried in-process.
 * Only http(s) URLs are allowed. 304 responses are returned to the caller.
 */
export async function fetchSource(url: string, options: FetchOptions = {}): Promise<FetchedResource> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP(S) sources are allowed');
  }
  const retries = options.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(Math.min(8000, 750 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250));
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': userAgent(options.contact),
          Accept: options.accept ?? '*/*',
          ...options.headers,
        },
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
      if (response.status === 429 || (response.status === 503 && response.headers.get('retry-after'))) {
        await response.body?.cancel().catch(() => undefined);
        throw new SourceRateLimitedError(url, parseRetryAfter(response.headers.get('retry-after')));
      }
      if (response.status >= 500) {
        await response.body?.cancel().catch(() => undefined);
        lastError = new SourceHttpError(url, response.status);
        continue;
      }
      if (response.status === 304) {
        await response.body?.cancel().catch(() => undefined);
        return { status: 304, headers: response.headers, body: Buffer.alloc(0), finalUrl: response.url || url };
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new SourceHttpError(url, response.status);
      }
      const body = await readLimited(response, options.maxBytes ?? 2 * 1024 * 1024);
      return { status: response.status, headers: response.headers, body, finalUrl: response.url || url };
    } catch (error) {
      if (error instanceof SourceRateLimitedError || error instanceof SourceHttpError) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Source request failed');
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const result = await fetchSource(url, { accept: 'application/json', ...options });
  return JSON.parse(result.body.toString('utf8')) as T;
}

/** Short, log-safe description of an error (never includes response bodies). */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return 'Unknown error';
}
