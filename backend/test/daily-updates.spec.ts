import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { afterEach, test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { AiUnavailableError, DailyUpdatesAiService } from '../src/modules/daily-updates/daily-updates-ai.service';
import {
  INDICATORS,
  IndicatorKey,
  NEWS_AI_EXCERPT_MAX,
  NEWS_FEEDS,
  NewsCategory,
  NewsFeed,
  TICKER_ORDER,
} from '../src/modules/daily-updates/daily-updates.constants';
import { NewsListQueryDto } from '../src/modules/daily-updates/dto/news-query.dto';
import { JobSchedulerService } from '../src/modules/daily-updates/job-scheduler.service';
import {
  indicatorStatus,
  MarketRatesService,
  parseOgraListing,
  pakistanMidnight,
  pkrPerTola,
  summarizeWeather,
} from '../src/modules/daily-updates/market-rates.service';
import {
  classifyArticle,
  extractOgImage,
  NewsService,
  prepareArticle,
  toPublicArticle,
} from '../src/modules/daily-updates/news.service';
import { SummaryStatus } from '../src/modules/daily-updates/schemas/news-article.schema';
import { fetchSource, SourceRateLimitedError } from '../src/modules/daily-updates/utils/http';
import { parseFeed, parseFeedDate } from '../src/modules/daily-updates/utils/rss';
import { canonicalArticleUrl, firstSentences, safeImageUrl } from '../src/modules/daily-updates/utils/text';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Stubs global fetch with a URL → response map (strings are 200 bodies). */
function stubFetch(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    const route = routes[url];
    if (!route) throw new TypeError(`unexpected fetch ${url}`);
    return route();
  }) as typeof fetch;
  return calls;
}

function chain<T>(value: T) {
  const result: Record<string, unknown> = {};
  for (const method of ['select', 'sort', 'skip', 'limit', 'lean']) result[method] = () => result;
  result.exec = async () => value;
  return result;
}

const config = (values: Record<string, unknown> = {}) => ({ get: (key: string) => values[key] }) as never;
const feed = (overrides: Partial<NewsFeed> = {}): NewsFeed => ({
  id: 'dawn-pakistan',
  publisher: 'Dawn',
  url: 'https://www.dawn.com/feeds/pakistan',
  defaultCategory: NewsCategory.PAKISTAN,
  domains: ['dawn.com'],
  ...overrides,
});
const NOW = new Date('2026-11-14T06:00:00Z');

// ── Parsing ────────────────────────────────────────────────────────────────

test('feed dates: two-digit years, numeric/colon offsets, GMT, ISO; unknown input is rejected', () => {
  assert.equal(parseFeedDate('Fri, 13 Nov 26 16:30:41 +0500')?.toISOString(), '2026-11-13T11:30:41.000Z');
  assert.equal(parseFeedDate('Fri, 13 Nov 2026 17:47:00 +05:00')?.toISOString(), '2026-11-13T12:47:00.000Z');
  assert.equal(parseFeedDate('Sat, 14 Nov 2026 07:40:21 GMT')?.toISOString(), '2026-11-14T07:40:21.000Z');
  assert.equal(parseFeedDate('2026-11-14T04:04:50Z')?.toISOString(), '2026-11-14T04:04:50.000Z');
  assert.equal(parseFeedDate('yesterday'), null);
  assert.equal(parseFeedDate('Fri, 13 Foo 2026 10:00:00 +0500'), null);
  assert.equal(parseFeedDate(undefined), null);
});

test('RSS parser handles CDATA, encoded HTML, image media, enclosures and skips video media', () => {
  const xml = `<rss><channel>
    <item>
      <title><![CDATA[Govt approves &amp; notifies new policy]]></title>
      <link>https://www.dawn.com/news/1/a?utm_source=rss#top</link>
      <description>&lt;p&gt;First sentence here. Second one.&lt;/p&gt;</description>
      <pubDate>Sat, 14 Nov 2026 09:03:40 +0500</pubDate>
      <category>Pakistan</category>
      <media:content url="https://i.dawn.com/video.mp4" medium="video"/>
      <media:content url="https://i.dawn.com/large/a.webp" type="image/webp" medium="image"/>
    </item>
    <item>
      <title>Second item title here</title>
      <link>https://www.dawn.com/news/2/b</link>
      <description><![CDATA[<img src="https://www.dawn.com/x.jpg"/>]]><![CDATA[Body text]]></description>
      <enclosure url="https://www.dawn.com/e.jpg" type="image/jpeg" length="1"/>
      <pubDate>Sat, 14 Nov 2026 09:03:40 +0500</pubDate>
    </item>
  </channel></rss>`;
  const [first, second] = parseFeed(xml);
  assert.equal(first.title, 'Govt approves & notifies new policy');
  assert.deepEqual(first.categories, ['Pakistan']);
  assert.deepEqual(first.imageCandidates, ['https://i.dawn.com/large/a.webp']);
  assert.ok(second.description.includes('Body text'));
  assert.deepEqual(second.imageCandidates, ['https://www.dawn.com/e.jpg', 'https://www.dawn.com/x.jpg']);

  const atom = parseFeed(`<feed><entry><title>Atom headline example</title><link rel="alternate" href="https://techcrunch.com/x"/><updated>2026-11-14T01:00:00Z</updated></entry></feed>`);
  assert.equal(atom[0].link, 'https://techcrunch.com/x');
  assert.equal(atom[0].publishedAt?.toISOString(), '2026-11-14T01:00:00.000Z');
});

test('sentences are not split inside decimals and leading bullets are removed', () => {
  assert.equal(
    firstSentences('• Primary surplus drops to 2.1pc of GDP from 2.6pc. Revenue fell. Third.', 280, 2),
    'Primary surplus drops to 2.1pc of GDP from 2.6pc. Revenue fell.',
  );
  assert.ok(firstSentences('x'.repeat(500), 100).length <= 100);
});

test('article/image URLs must be https on the publisher domain, without credentials, ports or tracking', () => {
  assert.equal(canonicalArticleUrl('http://www.dawn.com/news/1?utm_source=x&id=2#c', ['dawn.com']), 'https://www.dawn.com/news/1?id=2');
  for (const bad of [
    'javascript:alert(1)',
    'https://user:pass@dawn.com/x',
    'https://dawn.com:8443/x',
    'https://evil-dawn.com/x',
    'https://dawn.com.evil.com/x',
    'ftp://dawn.com/x',
  ]) {
    assert.equal(canonicalArticleUrl(bad, ['dawn.com']), null, bad);
  }
  assert.equal(safeImageUrl('https://i.dawn.com/a.webp', ['dawn.com']), 'https://i.dawn.com/a.webp');
  assert.equal(safeImageUrl('https://i.dawn.com/a.svg', ['dawn.com']), null);
  assert.equal(safeImageUrl('https://169.254.169.254/latest', ['dawn.com']), null);
  assert.equal(safeImageUrl('https://cdn.other.com/a.jpg', ['dawn.com']), null);
});

test('articles are validated: domain, date window, feed category filter; only a bounded excerpt is kept', () => {
  const longText = `<p>${'Sentence with facts. '.repeat(400)}</p>`;
  const item = {
    title: 'Fiscal surplus shrinks 40pc as revenues decline',
    link: 'https://www.dawn.com/news/2044374/fiscal-surplus',
    description: longText,
    content: longText,
    publishedAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    categories: ['Business'],
    imageCandidates: ['https://evil.com/a.jpg', 'https://i.dawn.com/large/b.jpg'],
  };
  const article = prepareArticle(feed({ defaultCategory: NewsCategory.BUSINESS }), item, NOW);
  assert.ok(article);
  assert.equal(article.imageUrl, 'https://i.dawn.com/large/b.jpg');
  assert.ok(article.sourceExcerpt && article.sourceExcerpt.length <= NEWS_AI_EXCERPT_MAX);
  assert.ok(article.snippet.length <= 280);
  assert.equal(article.summaryStatus, SummaryStatus.PENDING);
  assert.match(article.slug, /^fiscal-surplus-shrinks-40pc-as-revenues-decline-[0-9a-f]{8}$/);
  assert.equal(article.expiresAt.getTime() - article.publishedAt.getTime(), 45 * 24 * 60 * 60 * 1000);

  assert.equal(prepareArticle(feed(), { ...item, link: 'https://other.com/x' }, NOW), null);
  assert.equal(prepareArticle(feed(), { ...item, publishedAt: null }, NOW), null);
  assert.equal(prepareArticle(feed(), { ...item, publishedAt: new Date('2020-06-28T05:29:19Z') }, NOW), null);
  assert.equal(prepareArticle(feed(), { ...item, publishedAt: new Date(NOW.getTime() + 60 * 60 * 1000) }, NOW), null);
  assert.equal(prepareArticle(feed(), { ...item, title: 'Short' }, NOW), null);
  const brecorder = feed({ domains: ['dawn.com'], includeFeedCategories: ['Business & Finance', 'Pakistan'] });
  assert.equal(prepareArticle(brecorder, { ...item, categories: ['World'] }, NOW), null);
  assert.ok(prepareArticle(brecorder, { ...item, categories: ['Pakistan'] }, NOW));

  const short = prepareArticle(feed(), { ...item, description: 'Too short.', content: '' }, NOW);
  assert.equal(short?.summaryStatus, SummaryStatus.UNAVAILABLE);
  assert.equal(short?.sourceExcerpt, null);
});

test('category rules are conservative and deterministic', () => {
  const general = feed();
  assert.equal(classifyArticle(general, 'WASA launches smart water metering system in Lahore', ''), NewsCategory.LAHORE_DEVELOPMENT);
  assert.equal(classifyArticle(general, '27 Illegal Housing Societies Found on State Land', ''), NewsCategory.REAL_ESTATE);
  assert.equal(classifyArticle(general, 'FBR orders electronic monitoring of tea industry', ''), NewsCategory.GOVERNMENT);
  assert.equal(classifyArticle(general, 'Lahore weather turns pleasant after rain', ''), NewsCategory.PAKISTAN);
  assert.equal(classifyArticle(general, 'Security forces kill terrorists in operation', ''), NewsCategory.PAKISTAN);
  const tech = feed({ defaultCategory: NewsCategory.TECHNOLOGY, fixedCategory: true });
  assert.equal(classifyArticle(tech, 'Government approves property tech plan', ''), NewsCategory.TECHNOLOGY);
});

test('og:image is read regardless of attribute order', () => {
  assert.equal(extractOgImage('<meta property="og:image" content="https://i.tribune.com.pk/a.webp">'), 'https://i.tribune.com.pk/a.webp');
  assert.equal(extractOgImage('<meta content="https://x.com/b.jpg" name="twitter:image" />'), 'https://x.com/b.jpg');
  assert.equal(extractOgImage('<html></html>'), null);
});

test('OGRA listing: the newest notification (by date) and its download link are selected', () => {
  const html = `
    <p>Notification Petroleum Products Prices Effective Dated November 07, 2026</p></div>
    <a href="https://www.ogra.org.pk/download/18073" class="download-pdf"></a>
    <p>Notification Petroleum Products Prices Effective Dated November 14, 2026</p></div>
    <a href="https://www.ogra.org.pk/download/18256" class="download-pdf"></a>
    <p>Price Publication Effective July 11, 2026</p><a href="https://www.ogra.org.pk/download/14457"></a>`;
  assert.deepEqual(parseOgraListing(html), {
    title: 'Notification Petroleum Products Prices Effective Dated November 14, 2026',
    url: 'https://www.ogra.org.pk/download/18256',
    effectiveDate: '2026-11-14',
  });
  assert.equal(parseOgraListing('<html>nothing</html>'), null);
  assert.equal(pakistanMidnight('2026-11-14').toISOString(), '2026-11-13T19:00:00.000Z');
});

test('spot prices are converted to PKR per tola (11.6638 g)', () => {
  // 3887.60 USD/oz × 276.595 PKR/USD ÷ 31.1035 g × 11.6638 g
  assert.equal(pkrPerTola(3887.600098, 276.595456), 403235);
  assert.equal(pkrPerTola(48.650002, 276.595456), 5046);
});

test('weather summary: current conditions, 24h range and forecast-derived advisories', () => {
  const hour = (offset: number, temp: number, symbol: string, rain = 0, wind = 3) => ({
    time: new Date(NOW.getTime() + offset * 3600_000).toISOString(),
    data: {
      instant: { details: { air_temperature: temp, relative_humidity: 70, wind_speed: wind } },
      next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: rain } },
    },
  });
  const forecast = {
    properties: {
      meta: { updated_at: '2026-11-14T01:19:47Z' },
      timeseries: [hour(-3, 10, 'clearsky_day'), hour(0, 21.24, 'fog'), hour(2, 41, 'rainandthunder', 15, 16), hour(30, 50, 'clearsky_day')],
    },
  };
  const weather = summarizeWeather(forecast, NOW);
  assert.ok(weather);
  assert.equal(weather.temperature, 21.2);
  assert.equal(weather.condition, 'Fog');
  assert.equal(weather.high, 41);
  assert.equal(weather.low, 21);
  assert.deepEqual(weather.advisories, ['Very hot (up to 41°C)', 'Rain forecast (15 mm in 24 h)', 'Thunderstorms possible', 'Fog expected', 'Strong winds (up to 58 km/h)']);
  assert.equal(summarizeWeather({ properties: { timeseries: [] } }, NOW), null);
});

test('status: source-timestamp vs verified-at freshness; missing values are unavailable', () => {
  const now = NOW.getTime();
  const hoursAgo = (hours: number) => new Date(now - hours * 3600_000);
  assert.equal(indicatorStatus(IndicatorKey.USD_PKR, undefined, now), 'unavailable');
  assert.equal(indicatorStatus(IndicatorKey.USD_PKR, { value: null, effectiveAt: null, verifiedAt: null }, now), 'unavailable');
  assert.equal(indicatorStatus(IndicatorKey.USD_PKR, { value: 276, effectiveAt: hoursAgo(6), verifiedAt: hoursAgo(1) }, now), 'live');
  assert.equal(indicatorStatus(IndicatorKey.USD_PKR, { value: 276, effectiveAt: hoursAgo(40), verifiedAt: hoursAgo(1) }, now), 'stale');
  // Fuel stays live long after its revision date while OGRA keeps confirming it…
  assert.equal(indicatorStatus(IndicatorKey.PETROL, { value: 330, effectiveAt: hoursAgo(24 * 10), verifiedAt: hoursAgo(2) }, now), 'live');
  // …but becomes "may be outdated" when we could not confirm it for 48h.
  assert.equal(indicatorStatus(IndicatorKey.PETROL, { value: 330, effectiveAt: hoursAgo(24), verifiedAt: hoursAgo(49) }, now), 'stale');
  assert.equal(TICKER_ORDER.join(','), 'petrol,gold_24k,diesel,weather_lahore,silver,usd_pkr');
});

// ── HTTP safety ────────────────────────────────────────────────────────────

test('source fetch: 429 becomes a backoff (not retried), 5xx is retried, oversize and non-http are refused', async () => {
  let calls = 0;
  stubFetch({ 'https://src.test/limited': () => (calls++, new Response('', { status: 429, headers: { 'Retry-After': '120' } })) });
  await assert.rejects(fetchSource('https://src.test/limited', { retries: 2 }), (error: unknown) => {
    assert.ok(error instanceof SourceRateLimitedError);
    assert.ok(error.retryAfter.getTime() > Date.now() + 100_000);
    return true;
  });
  assert.equal(calls, 1);

  let flaky = 0;
  stubFetch({ 'https://src.test/flaky': () => (++flaky < 2 ? new Response('', { status: 502 }) : new Response('ok')) });
  const ok = await fetchSource('https://src.test/flaky', { retries: 2 });
  assert.equal(ok.body.toString(), 'ok');
  assert.equal(flaky, 2);

  stubFetch({ 'https://src.test/big': () => new Response('x'.repeat(2000)) });
  await assert.rejects(fetchSource('https://src.test/big', { maxBytes: 1000, retries: 0 }), /larger than/);
  await assert.rejects(fetchSource('file:///etc/passwd'), /Only HTTP/);
});

// ── Market rates service ───────────────────────────────────────────────────

function ratesHarness(options: { docs?: Record<string, Record<string, unknown>>; ai?: Partial<DailyUpdatesAiService> } = {}) {
  const docs = options.docs ?? {};
  type Write = { filter: Record<string, unknown>; update: Record<string, unknown> };
  const updates: Write[] = [];
  const many: Write[] = [];
  const history: Write[] = [];
  const indicatorModel = {
    find: () => chain(Object.values(docs)),
    findOne: (filter: { key: string }) => chain(docs[filter.key] ?? null),
    updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      updates.push({ filter, update });
      return chain({});
    },
    updateMany: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      many.push({ filter, update });
      return chain({});
    },
  };
  const historyModel = {
    findOne: () => chain(null),
    updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      history.push({ filter, update });
      return chain({});
    },
  };
  const ai = { available: true, ...options.ai } as DailyUpdatesAiService;
  const service = new MarketRatesService(indicatorModel as never, historyModel as never, ai, config());
  return { service, updates, many, history };
}

const OGRA_HTML = `<p>Notification Petroleum Products Prices Effective Dated November 14, 2026</p><a href="https://www.ogra.org.pk/download/18256"></a>`;
const ogra = (pdfBody = '%PDF-1.4 scanned') => ({
  'https://www.ogra.org.pk/notified-petroleum-prices': () => new Response(OGRA_HTML),
  'https://www.ogra.org.pk/download/18256': () => new Response(pdfBody, { headers: { 'content-type': 'application/pdf' } }),
});
const fuelDoc = (key: string, value: number, notificationUrl = 'https://www.ogra.org.pk/download/18073') => ({
  key,
  value,
  unit: 'PKR/litre',
  effectiveAt: new Date('2026-11-06T19:00:00Z'),
  verifiedAt: new Date('2026-11-10T00:00:00Z'),
  details: { notificationUrl },
});

test('fuel: an unchanged notification is only re-confirmed (no PDF download, no AI call)', async () => {
  let aiCalls = 0;
  const { service, many, updates } = ratesHarness({
    docs: {
      petrol: fuelDoc('petrol', 330, 'https://www.ogra.org.pk/download/18256'),
      diesel: fuelDoc('diesel', 360, 'https://www.ogra.org.pk/download/18256'),
    },
    ai: { extractFuelPrices: async () => (aiCalls++, null) },
  });
  const calls = stubFetch(ogra());
  await service.refreshFuel();
  assert.equal(aiCalls, 0);
  assert.deepEqual(calls, ['https://www.ogra.org.pk/notified-petroleum-prices']);
  assert.equal(many.length, 1);
  assert.ok((many[0].update.$set as Record<string, unknown>).verifiedAt instanceof Date);
  assert.equal(updates.length, 0);
});

test('fuel: a new notification is applied only when the AI reading matches its date, with revision history', async () => {
  const { service, updates, history } = ratesHarness({
    docs: { petrol: fuelDoc('petrol', 332), diesel: fuelDoc('diesel', 360) },
    ai: { extractFuelPrices: async () => ({ effectiveDate: '2026-11-14', petrol: 330, diesel: 360 }) },
  });
  stubFetch(ogra());
  await service.refreshFuel();
  const petrolWrite = updates.find((entry) => entry.filter.key === 'petrol' && (entry.update.$set as Record<string, unknown>).value === 330);
  assert.ok(petrolWrite);
  const set = petrolWrite.update.$set as Record<string, any>;
  assert.equal(set.effectiveAt.toISOString(), '2026-11-13T19:00:00.000Z');
  assert.equal(set.details.previousValue, 332);
  assert.equal(set.source.url, 'https://www.ogra.org.pk/download/18256');
  assert.deepEqual(history.map((entry) => `${entry.filter.key}:${entry.filter.periodKey}`), ['petrol:rev:2026-11-14', 'diesel:rev:2026-11-14']);
});

test('fuel: date mismatch, implausible jumps and missing AI keep the last verified prices', async () => {
  for (const ai of [
    { extractFuelPrices: async () => ({ effectiveDate: '2026-11-07', petrol: 330, diesel: 360 }) },
    { extractFuelPrices: async () => ({ effectiveDate: '2026-11-14', petrol: 33, diesel: 360 }) },
    { extractFuelPrices: async () => null },
    { available: false },
  ]) {
    const { service, updates, history } = ratesHarness({
      docs: { petrol: fuelDoc('petrol', 332), diesel: fuelDoc('diesel', 360) },
      ai: ai as Partial<DailyUpdatesAiService>,
    });
    stubFetch(ogra());
    await assert.rejects(service.refreshFuel());
    assert.equal(history.length, 0);
    // No write ever replaces `value`; failures only record the attempt.
    assert.ok(updates.every((entry) => !('value' in ((entry.update.$set as object) ?? {}))));
    assert.ok(updates.some((entry) => (entry.update.$inc as Record<string, number> | undefined)?.consecutiveFailures === 1));
  }
});

test('fuel: a non-PDF download is rejected before any AI call', async () => {
  let aiCalls = 0;
  const { service } = ratesHarness({
    docs: { petrol: fuelDoc('petrol', 332), diesel: fuelDoc('diesel', 360) },
    ai: { extractFuelPrices: async () => (aiCalls++, null) },
  });
  stubFetch(ogra('<html>error page</html>'));
  await assert.rejects(service.refreshFuel(), /not a PDF/);
  assert.equal(aiCalls, 0);
});

test('a rate-limited source records a backoff window and keeps the value', async () => {
  const { service, updates } = ratesHarness({ docs: { usd_pkr: { key: 'usd_pkr', value: 276, effectiveAt: NOW, verifiedAt: NOW } } });
  stubFetch({ 'https://open.er-api.com/v6/latest/USD': () => new Response('', { status: 429, headers: { 'Retry-After': '3600' } }) });
  await assert.rejects(service.refreshExchangeRate(), SourceRateLimitedError);
  const failure = updates.find((entry) => entry.update.$inc);
  assert.ok(failure);
  assert.ok((failure.update.$set as Record<string, unknown>).retryAfter instanceof Date);
  assert.ok(!('value' in (failure.update.$set as object)));
});

test('implausible source values are never stored', async () => {
  const { service, updates } = ratesHarness();
  await assert.rejects(
    service.recordSuccess({ key: IndicatorKey.GOLD_24K, value: 12, effectiveAt: NOW, source: { name: 's', url: 'https://s' } }),
    /plausible range/,
  );
  assert.equal(updates.length, 0);
  assert.ok(INDICATORS[IndicatorKey.GOLD_24K].min > 12);
});

test('metals are not converted without a current USD/PKR rate', async () => {
  const { service, history } = ratesHarness({ docs: {} });
  const calls = stubFetch({});
  await assert.rejects(service.refreshMetals(), /USD\/PKR/);
  assert.equal(calls.length, 0);
  assert.equal(history.length, 0);
});

test('ticker: fixed order, statuses, revision change, unavailable has no value, internal errors not exposed', async () => {
  const recent = new Date(Date.now() - 60_000);
  const { service } = ratesHarness({
    docs: {
      petrol: { key: 'petrol', value: 330, effectiveAt: new Date('2026-11-13T19:00:00Z'), verifiedAt: recent, lastError: 'secret detail', source: { name: 'OGRA', url: 'https://www.ogra.org.pk/download/18256' }, details: { previousValue: 332 } },
      usd_pkr: { key: 'usd_pkr', value: 276.6, effectiveAt: new Date(Date.now() - 50 * 3600_000), verifiedAt: recent, details: {} },
    },
  });
  const ticker = await service.getTicker();
  assert.deepEqual(ticker.items.map((item) => item.key), TICKER_ORDER);
  const petrol = ticker.items[0];
  assert.equal(petrol.status, 'live');
  assert.deepEqual(petrol.change, { amount: -2, since: 'previous revision' });
  assert.equal(ticker.items.find((item) => item.key === 'usd_pkr')?.status, 'stale');
  const gold = ticker.items.find((item) => item.key === 'gold_24k');
  assert.equal(gold?.status, 'unavailable');
  assert.equal(gold?.value, null);
  assert.ok(!JSON.stringify(ticker).includes('secret detail'));
});

// ── Scheduler ──────────────────────────────────────────────────────────────

test('scheduler: disabled by default; a claim held by another instance is refused', async () => {
  let duplicate = true;
  const lockModel = {
    findOneAndUpdate: () => ({
      lean: () => ({
        exec: async () => {
          if (duplicate) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
          return { _id: 'job' };
        },
      }),
    }),
  };
  const scheduler = new JobSchedulerService(lockModel as never, config(), {} as never, {} as never);
  assert.equal(scheduler.enabled, false);
  scheduler.onApplicationBootstrap();
  scheduler.onModuleDestroy();
  assert.equal(await scheduler.claim('job', NOW), false);
  duplicate = false;
  assert.equal(await scheduler.claim('job', NOW), true);
  assert.equal(new JobSchedulerService(lockModel as never, config({ 'dailyUpdates.jobsEnabled': true }), {} as never, {} as never).enabled, true);
});

// ── News service ───────────────────────────────────────────────────────────

test('news ingest de-duplicates by URL and by headline, and never stores full article text', async () => {
  const now = new Date();
  const recent = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toUTCString().replace('GMT', '+0000');
  const body = `<p>${'Long paragraph of article text. '.repeat(300)}</p>`;
  const xml = `<rss><channel>
    <item><title>Existing article already stored</title><link>https://www.dawn.com/news/1/a</link><description><![CDATA[${body}]]></description><pubDate>${recent(10)}</pubDate></item>
    <item><title>Same headline syndicated elsewhere</title><link>https://www.dawn.com/news/2/b</link><description><![CDATA[${body}]]></description><pubDate>${recent(20)}</pubDate></item>
    <item><title>Brand new story for the homepage</title><link>https://www.dawn.com/news/3/c</link><description><![CDATA[${body}]]></description><content:encoded><![CDATA[${body}]]></content:encoded><pubDate>${recent(30)}</pubDate></item>
    <item><title>Brand new story for the homepage</title><link>https://www.dawn.com/news/4/d</link><description>dup in same feed run</description><pubDate>${recent(31)}</pubDate></item>
  </channel></rss>`;
  const created: Array<Record<string, unknown>> = [];
  const articleModel = {
    find: (filter: Record<string, any>) => {
      if (filter.urlHash) {
        const stored = prepareArticle(NEWS_FEEDS[0], parseFeed(xml)[0], now)!;
        return chain(filter.urlHash.$in.includes(stored.urlHash) ? [{ urlHash: stored.urlHash }] : []);
      }
      return chain([{ titleKey: 'same headline syndicated elsewhere' }]);
    },
    create: async (doc: Record<string, unknown>) => created.push(doc),
  };
  const service = new NewsService(articleModel as never, { available: false } as never);
  stubFetch({ 'https://www.dawn.com/feeds/pakistan': () => new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } }) });
  const inserted = await service.ingestFeed(NEWS_FEEDS[0], now);
  assert.equal(inserted, 1);
  assert.equal(created[0].title, 'Brand new story for the homepage');
  assert.ok(String(created[0].sourceExcerpt).length <= NEWS_AI_EXCERPT_MAX);
  assert.ok(!Object.values(created[0]).some((value) => typeof value === 'string' && value.length > NEWS_AI_EXCERPT_MAX));
});

test('summaries: AI text is stored and the excerpt dropped; an empty AI answer falls back to the publisher snippet', async () => {
  const pendingDocs = [
    { _id: new Types.ObjectId(), title: 'A', publisher: 'Dawn', sourceExcerpt: 'Excerpt one with facts.', summaryAttempts: 0 },
    { _id: new Types.ObjectId(), title: 'B', publisher: 'Dawn', sourceExcerpt: 'Excerpt two.', summaryAttempts: 0 },
  ];
  const writes: Array<Record<string, any>> = [];
  const articleModel = {
    updateMany: () => chain({}),
    find: () => chain(pendingDocs),
    updateOne: (_filter: unknown, update: Record<string, any>) => (writes.push(update), chain({})),
  };
  let call = 0;
  const ai = { available: true, model: 'claude-opus-5-5', summarize: async () => (call++ === 0 ? 'A grounded two sentence summary of the story.' : '') };
  await new NewsService(articleModel as never, ai as never).summarizePending();
  assert.equal(writes[0].$set.summaryStatus, SummaryStatus.DONE);
  assert.equal(writes[0].$set.sourceExcerpt, null);
  assert.equal(writes[1].$set.summaryStatus, SummaryStatus.UNAVAILABLE);
  assert.equal(writes[1].$set.sourceExcerpt, null);
});

test('without an API key summaries are skipped (articles still publish with the publisher snippet)', async () => {
  let finds = 0;
  const articleModel = { updateMany: () => chain({}), find: () => (finds++, chain([])) };
  await new NewsService(articleModel as never, { available: false } as never).summarizePending();
  assert.equal(finds, 0);
  const article = toPublicArticle({
    _id: new Types.ObjectId(),
    slug: 's',
    title: 'T',
    url: 'https://www.dawn.com/x',
    publisher: 'Dawn',
    category: NewsCategory.BUSINESS,
    publishedAt: NOW,
    summary: '',
    summaryStatus: SummaryStatus.PENDING,
    snippet: 'Publisher snippet.',
    imageUrl: 'https://i.dawn.com/a.jpg',
  });
  assert.equal(article.summary, 'Publisher snippet.');
  assert.equal(article.summarySource, 'publisher');
  assert.equal(article.thumbnailUrl, `/api/v1/news/thumbnails/${article.id}`);
  assert.equal(article.categoryLabel, 'Business & Economy');
});

test('news lookups reject malformed slugs and thumbnail ids without touching the database', async () => {
  const service = new NewsService({} as never, { available: false } as never);
  await assert.rejects(service.bySlug('../../etc'), NotFoundException);
  await assert.rejects(service.thumbnail('not-an-id'), NotFoundException);
});

test('news list query validation', async () => {
  const errors = async (input: Record<string, unknown>) => validate(plainToInstance(NewsListQueryDto, input));
  assert.equal((await errors({ category: 'business', q: 'gold', page: '2', limit: '12' })).length, 0);
  assert.ok((await errors({ category: 'sports' })).length > 0);
  assert.ok((await errors({ limit: '100' })).length > 0);
  assert.ok((await errors({ q: 'x'.repeat(81) })).length > 0);
});

// ── AI service ─────────────────────────────────────────────────────────────

test('AI is disabled without ANTHROPIC_API_KEY; fuel readings must agree across both passes', async () => {
  const previous = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const disabled = new DailyUpdatesAiService(config());
    assert.equal(disabled.available, false);
    assert.equal(disabled.model, 'claude-opus-5-5');
    await assert.rejects(disabled.summarize({ title: 't', publisher: 'p', excerpt: 'e' }), AiUnavailableError);

    process.env.ANTHROPIC_API_KEY = 'test-key-not-used';
    const service = new DailyUpdatesAiService(config({ 'dailyUpdates.aiModel': 'claude-haiku-5-5' }));
    assert.equal(service.model, 'claude-haiku-5-5');
    const answers = [
      { legible: true, effective_date: '2026-11-14', motor_spirit_pkr_per_litre: 330, high_speed_diesel_pkr_per_litre: 360 },
      { legible: true, effective_date: '2026-11-14', motor_spirit_pkr_per_litre: 330, high_speed_diesel_pkr_per_litre: 364 },
    ];
    let index = 0;
    (service as unknown as { requestJson: () => Promise<string> }).requestJson = async () => JSON.stringify(answers[index++ % 2]);
    assert.equal(await service.extractFuelPrices(Buffer.from('%PDF')), null);
    answers[1] = answers[0];
    index = 0;
    assert.deepEqual(await service.extractFuelPrices(Buffer.from('%PDF')), { effectiveDate: '2026-11-14', petrol: 330, diesel: 360 });
    answers[0] = { ...answers[0], legible: false };
    index = 0;
    assert.equal(await service.extractFuelPrices(Buffer.from('%PDF')), null);
  } finally {
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previous;
  }
});
