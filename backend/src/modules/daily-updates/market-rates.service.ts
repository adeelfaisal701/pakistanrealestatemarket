import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ENDPOINTS,
  GRAMS_PER_TOLA,
  GRAMS_PER_TROY_OUNCE,
  HISTORY_RETENTION_MS,
  INDICATORS,
  IndicatorKey,
  SOURCES,
  TICKER_ORDER,
} from './daily-updates.constants';
import { MarketIndicator, MarketIndicatorDocument } from './schemas/market-indicator.schema';
import { MarketIndicatorHistory, MarketIndicatorHistoryDocument } from './schemas/market-indicator-history.schema';
import { describeError, fetchJson, fetchSource, SourceRateLimitedError } from './utils/http';
import { extractPdfText, PdfTextItem } from './utils/pdf-text';
import { hostMatches, pakistanDateKey } from './utils/text';

type Source = { name: string; url: string };
export type IndicatorStatus = 'live' | 'stale' | 'unavailable';

export interface GoldCalculation {
  usdPerTroyOunce: number;
  usdPkr: number;
  gramsPerTroyOunce: number;
  gramsPerTola: number;
}

export interface TickerItem {
  key: IndicatorKey;
  label: string;
  unit: string;
  value: number | null;
  status: IndicatorStatus;
  /** When the value took effect (price revision) or the source published it. */
  effectiveAt: string | null;
  /** When the source last confirmed the value. */
  verifiedAt: string | null;
  source: Source | null;
  note: string | null;
  change: { amount: number; since: 'previous revision' | 'previous day' } | null;
  weather?: WeatherSummary;
  calculation?: GoldCalculation;
}

export interface TickerResponse {
  generatedAt: string;
  items: TickerItem[];
}

export interface WeatherSummary {
  condition: string;
  symbol: string;
  temperature: number;
  high: number | null;
  low: number | null;
  humidity: number | null;
  windKmh: number | null;
  precipitation24h: number;
  /** Advisories derived from the forecast (not official PMD warnings). */
  advisories: string[];
  forecastUpdatedAt: string | null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function isoDate(monthName: string, day: string, year: string): string | null {
  const month = MONTHS.indexOf(monthName.toLowerCase());
  if (month < 0) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export interface OgraPublication {
  url: string;
  effectiveDate: string;
}

/** Newest "Price Publications Effective Dated …" entry on OGRA's daily price listing. */
export function parseOgraPublicationListing(html: string): OgraPublication | null {
  const pattern =
    /Price\s+Publications\s+Effective\s+Dated\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})[\s\S]{0,800}?href=["'](https:\/\/www\.ogra\.org\.pk\/download\/\d+(?:\?lang=en)?)["']/gi;
  let newest: OgraPublication | null = null;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const effectiveDate = isoDate(match[1], match[2], match[3]);
    if (effectiveDate && (!newest || effectiveDate > newest.effectiveDate)) newest = { url: match[4], effectiveDate };
  }
  return newest;
}

export interface FuelSheetResult {
  product: 'petrol' | 'diesel';
  effectiveDate: string;
  price: number;
  /** Number of the sheet's own formulas that were recomputed and matched. */
  formulasVerified: number;
}

const NUMERIC = /^-?\d{1,4}(?:,\d{3})*(?:\.\d+)?$/;
/**
 * A value cell: a number, optionally fused with the start of the explanation text
 * (some exports emit "9.98Margin of Petrol Pump dealers…" as one string).
 */
const VALUE_CELL = /^(-?\d{1,4}(?:,\d{3})*(?:\.\d+)?)(?:$|\s*[A-Za-z(])/;

function evaluateFormula(expression: string, values: Map<string, number>): number | null {
  const tokens = expression.replace(/\s+/g, '').match(/[A-Z]|[-+*/]/g);
  if (!tokens || tokens.join('') !== expression.replace(/\s+/g, '')) return null;
  // Left-to-right with * and / binding tighter than + and -.
  const terms: number[] = [];
  let sign = 1;
  let current: number | null = null;
  let pendingOp: '*' | '/' | null = null;
  for (const token of tokens) {
    if (/[A-Z]/.test(token)) {
      const value = values.get(token);
      if (value === undefined) return null;
      if (pendingOp === '*') current = (current ?? 0) * value;
      else if (pendingOp === '/') current = value === 0 ? null : (current ?? 0) / value;
      else current = value;
      if (current === null) return null;
      pendingOp = null;
    } else if (token === '*' || token === '/') {
      pendingOp = token;
    } else {
      if (current === null) return null;
      terms.push(sign * current);
      sign = token === '-' ? -1 : 1;
      current = null;
    }
  }
  if (current === null || pendingOp) return null;
  terms.push(sign * current);
  return terms.reduce((sum, term) => sum + term, 0);
}

/**
 * Reads one page of OGRA's daily price build-up sheet and verifies it: every
 * row formula printed on the sheet (e.g. "V={P+S+T+U}") is recomputed from the
 * extracted values, and the final price must equal the calculated price plus
 * the rounding adjustment. Returns null when anything is missing or inconsistent.
 */
export function parseOgraPriceSheetPage(items: PdfTextItem[]): FuelSheetResult | null {
  let title: { product: 'petrol' | 'diesel'; effectiveDate: string } | null = null;
  for (const item of items) {
    // Seen as "Petrol (MS) Price Effective November 14, 2026" and "PETROL (MS) Price Effective November 13,2026".
    const match = item.text.match(/^\s*(Petrol\s*\(MS\)|Diesel\s*\(HSD\))\s+Price\s+Effective\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
    const effectiveDate = match ? isoDate(match[2], match[3], match[4]) : null;
    if (match && effectiveDate) {
      title = { product: /^petrol/i.test(match[1]) ? 'petrol' : 'diesel', effectiveDate };
      break;
    }
  }
  if (!title) return null;

  // Every priced row has a unit cell (RS/LTR, USD/BBL, RS/USD, LTR/BBL). To its right on the
  // same baseline come the formula code cell(s) and then the value; the label is to its left
  // (possibly wrapped over two lines). Header layout and coordinate scale do not matter.
  const sameRow = (a: PdfTextItem, b: PdfTextItem) => Math.abs(a.y - b.y) <= Math.max(1.5, a.size * 0.25);
  const rows: Array<{ label: string; letter: string; formula: string | null; value: number }> = [];
  for (const unit of items.filter((item) => /^(RS|USD|LTR)\s*\/\s*(LTR|BBL|USD)$/i.test(item.text))) {
    const right = items.filter((item) => item.x > unit.x && sameRow(item, unit)).sort((a, b) => a.x - b.x);
    const valueIndex = right.findIndex((item) => VALUE_CELL.test(item.text));
    if (valueIndex < 1) continue; // no formula code before the value (e.g. rounding-account rows)
    const code = right.slice(0, valueIndex).map((item) => item.text).join('').replace(/\s+/g, '');
    const codeMatch = code.match(/^([A-Z])(?:=[{[(]?([A-Z+\-*/]+)[}\])]?)?$/);
    if (!codeMatch) continue;
    const lineGap = Math.max(6, unit.size * 1.2);
    const label = items
      .filter((item) => item.x < unit.x && Math.abs(item.y - unit.y) <= lineGap && !NUMERIC.test(item.text))
      .sort((a, b) => b.y - a.y)
      .map((item) => item.text)
      .join(' ');
    const valueText = (right[valueIndex].text.match(VALUE_CELL) as RegExpMatchArray)[1];
    rows.push({ label, letter: codeMatch[1], formula: codeMatch[2] ?? null, value: Number(valueText.replace(/,/g, '')) });
  }
  const values = new Map(rows.map((row) => [row.letter, row.value]));
  if (values.size !== rows.length || rows.length < 8) return null; // duplicate or too few rows: layout not understood

  let formulasVerified = 0;
  for (const row of rows) {
    if (!row.formula) continue;
    const computed = evaluateFormula(row.formula, values);
    if (computed === null) return null;
    const multiplicative = /[*/]/.test(row.formula);
    const tolerance = multiplicative ? Math.max(0.05, Math.abs(row.value) * 0.001) : 0.011 * row.formula.split(/[-+]/).length;
    if (Math.abs(computed - row.value) > tolerance) return null;
    formulasVerified += 1;
  }

  const product = title.product === 'petrol' ? 'Petrol' : 'Diesel';
  const final = rows.find((row) => new RegExp(`^Total ${product} Price\\b`, 'i').test(row.label));
  const calculated = rows.find((row) => new RegExp(`^Total (?:Total )?Calculated ${product} Price\\b`, 'i').test(row.label));
  const rounding = rows.find((row) => /^Rounding-off Adjustment\b/i.test(row.label));
  if (!final || !calculated || !rounding) return null;
  if (Math.abs(calculated.value + rounding.value - final.value) > 0.011) return null;
  if (formulasVerified < 4) return null;
  return { product: title.product, effectiveDate: title.effectiveDate, price: Math.round(final.value * 100) / 100, formulasVerified: formulasVerified + 1 };
}

/** Midnight Pakistan time (UTC+5, no DST) of a YYYY-MM-DD date. */
export function pakistanMidnight(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 5 * 60 * 60 * 1000);
}

/** PKR per tola from an international spot price in USD per troy ounce. */
export function pkrPerTola(usdPerTroyOunce: number, usdPkr: number): number {
  return Math.round((usdPerTroyOunce / GRAMS_PER_TROY_OUNCE) * GRAMS_PER_TOLA * usdPkr);
}

const CONDITION_WORDS: Record<string, string> = {
  clearsky: 'Clear', fair: 'Mostly clear', partlycloudy: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Fog',
  lightrain: 'Light rain', rain: 'Rain', heavyrain: 'Heavy rain', lightrainshowers: 'Light showers',
  rainshowers: 'Showers', heavyrainshowers: 'Heavy showers', lightrainandthunder: 'Light rain & thunder',
  rainandthunder: 'Rain & thunder', heavyrainandthunder: 'Heavy rain & thunder', rainshowersandthunder: 'Thundery showers',
  lightsleet: 'Light sleet', sleet: 'Sleet', lightsnow: 'Light snow', snow: 'Snow', heavysnow: 'Heavy snow',
};

export function describeSymbol(symbol: string): string {
  const base = symbol.replace(/_(day|night|polartwilight)$/, '');
  if (CONDITION_WORDS[base]) return CONDITION_WORDS[base];
  if (base.includes('thunder')) return 'Thunderstorms';
  if (base.includes('snow')) return 'Snow';
  if (base.includes('sleet')) return 'Sleet';
  if (base.includes('rain')) return 'Rain';
  return 'Weather';
}

interface MetTimeseriesEntry {
  time: string;
  data: {
    instant?: { details?: Record<string, number> };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
  };
}

export interface MetForecast {
  properties?: { meta?: { updated_at?: string }; timeseries?: MetTimeseriesEntry[] };
}

/** Current conditions + next-24h outlook from a MET Norway compact forecast. */
export function summarizeWeather(forecast: MetForecast, now = new Date()): WeatherSummary | null {
  const series = forecast.properties?.timeseries ?? [];
  const nowMs = now.getTime();
  const upcoming = series.filter((entry) => Date.parse(entry.time) >= nowMs - 60 * 60 * 1000);
  const current = upcoming[0];
  const temperature = current?.data.instant?.details?.air_temperature;
  if (!current || typeof temperature !== 'number' || !Number.isFinite(temperature)) return null;
  const symbol = current.data.next_1_hours?.summary?.symbol_code ?? current.data.next_6_hours?.summary?.symbol_code ?? '';
  const next24 = upcoming.filter((entry) => Date.parse(entry.time) < nowMs + 24 * 60 * 60 * 1000);
  const temps = next24.map((entry) => entry.data.instant?.details?.air_temperature).filter((value): value is number => typeof value === 'number');
  const winds = next24.map((entry) => entry.data.instant?.details?.wind_speed).filter((value): value is number => typeof value === 'number');
  const precipitation = next24.reduce((sum, entry) => sum + (entry.data.next_1_hours?.details?.precipitation_amount ?? 0), 0);
  const symbols12h = next24
    .filter((entry) => Date.parse(entry.time) < nowMs + 12 * 60 * 60 * 1000)
    .map((entry) => entry.data.next_1_hours?.summary?.symbol_code ?? '');
  const high = temps.length ? Math.max(...temps) : null;
  const low = temps.length ? Math.min(...temps) : null;
  const maxWindKmh = winds.length ? Math.round(Math.max(...winds) * 3.6) : null;
  const precipitation24h = Math.round(precipitation * 10) / 10;

  const advisories: string[] = [];
  if (high !== null && high >= 45) advisories.push(`Extreme heat forecast (up to ${Math.round(high)}°C)`);
  else if (high !== null && high >= 40) advisories.push(`Very hot (up to ${Math.round(high)}°C)`);
  if (low !== null && low <= 2) advisories.push(`Near-freezing night (${Math.round(low)}°C)`);
  if (precipitation24h >= 25) advisories.push(`Heavy rain forecast (${precipitation24h} mm in 24 h)`);
  else if (precipitation24h >= 10) advisories.push(`Rain forecast (${precipitation24h} mm in 24 h)`);
  if (symbols12h.some((code) => code.includes('thunder'))) advisories.push('Thunderstorms possible');
  if (symbols12h.some((code) => code.startsWith('fog'))) advisories.push('Fog expected');
  if (maxWindKmh !== null && maxWindKmh >= 50) advisories.push(`Strong winds (up to ${maxWindKmh} km/h)`);

  const humidity = current.data.instant?.details?.relative_humidity;
  const wind = current.data.instant?.details?.wind_speed;
  return {
    condition: symbol ? describeSymbol(symbol) : 'Weather',
    symbol,
    temperature: Math.round(temperature * 10) / 10,
    high: high === null ? null : Math.round(high),
    low: low === null ? null : Math.round(low),
    humidity: typeof humidity === 'number' ? Math.round(humidity) : null,
    windKmh: typeof wind === 'number' ? Math.round(wind * 3.6) : null,
    precipitation24h,
    advisories,
    forecastUpdatedAt: forecast.properties?.meta?.updated_at ?? null,
  };
}

export function indicatorStatus(
  key: IndicatorKey,
  doc: Pick<MarketIndicator, 'value' | 'effectiveAt' | 'verifiedAt'> & { details?: Record<string, unknown> } | undefined | null,
  now = Date.now(),
): IndicatorStatus {
  if (!doc || doc.value === null || doc.value === undefined) return 'unavailable';
  // A newer official publication exists that we could not verify: the shown value may be outdated.
  if (doc.details && doc.details.unverifiedPublication) return 'stale';
  const definition = INDICATORS[key];
  const basis = definition.staleBasis === 'source' ? doc.effectiveAt : doc.verifiedAt;
  if (!basis) return 'stale';
  return now - new Date(basis).getTime() > definition.staleAfterMs ? 'stale' : 'live';
}

/** A contact (site URL or email) that is not a local development address. */
export function usableContact(contact: string | undefined): string | null {
  if (!contact) return null;
  const value = contact.trim();
  if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value)) return value;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || hostMatches(url.hostname, ['localhost']) || /^(127\.|0\.0\.0\.0|\[?::1)/.test(url.hostname) || !url.hostname.includes('.')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

interface SuccessInput {
  key: IndicatorKey;
  value: number;
  effectiveAt: Date;
  source: Source;
  details?: Record<string, unknown>;
  /** History bucket; omitted for indicators without history (weather). */
  periodKey?: string;
}

const TICKER_CACHE_MS = 60_000;

@Injectable()
export class MarketRatesService {
  private readonly logger = new Logger(MarketRatesService.name);
  private tickerCache: { expires: number; value: Promise<TickerResponse> } | null = null;
  private readonly contact: string | null;

  constructor(
    @InjectModel(MarketIndicator.name) private readonly indicatorModel: Model<MarketIndicatorDocument>,
    @InjectModel(MarketIndicatorHistory.name) private readonly historyModel: Model<MarketIndicatorHistoryDocument>,
    config: ConfigService,
  ) {
    this.contact = usableContact(
      config.get<string>('dailyUpdates.contact') || config.get<string>('propertyLocationShare.frontendBaseUrl'),
    );
  }

  // ── Public read model ────────────────────────────────────────────────────

  getTicker(): Promise<TickerResponse> {
    const now = Date.now();
    if (this.tickerCache && this.tickerCache.expires > now) return this.tickerCache.value;
    const value = this.buildTicker().catch((error) => {
      this.tickerCache = null;
      throw error;
    });
    this.tickerCache = { expires: now + TICKER_CACHE_MS, value };
    return value;
  }

  private async buildTicker(): Promise<TickerResponse> {
    const now = new Date();
    const docs = await this.indicatorModel.find({ key: { $in: TICKER_ORDER } }).lean().exec();
    const byKey = new Map(docs.map((doc) => [doc.key, doc]));
    const today = `day:${pakistanDateKey(now)}`;
    const items = await Promise.all(
      TICKER_ORDER.map(async (key): Promise<TickerItem> => {
        const definition = INDICATORS[key];
        const doc = byKey.get(key);
        const details = (doc?.details ?? {}) as Record<string, unknown>;
        const status = indicatorStatus(key, doc ? { ...doc, details } : undefined, now.getTime());
        const value = status === 'unavailable' ? null : doc?.value ?? null;
        let change: TickerItem['change'] = null;
        if (value !== null && (key === IndicatorKey.PETROL || key === IndicatorKey.DIESEL)) {
          const previous = details.previousValue;
          if (typeof previous === 'number') change = { amount: round2(value - previous), since: 'previous revision' };
        } else if (value !== null && key !== IndicatorKey.WEATHER_LAHORE) {
          const previousDay = await this.historyModel
            .findOne({ key, periodKey: { $lt: today, $regex: /^day:/ } })
            .sort({ periodKey: -1 })
            .lean()
            .exec();
          if (previousDay) change = { amount: round2(value - previousDay.value), since: 'previous day' };
        }
        const item: TickerItem = {
          key,
          label: definition.label,
          unit: definition.unit,
          value,
          status,
          effectiveAt: doc?.effectiveAt ? new Date(doc.effectiveAt).toISOString() : null,
          verifiedAt: doc?.verifiedAt ? new Date(doc.verifiedAt).toISOString() : null,
          source: doc?.source ?? null,
          note: typeof details.note === 'string' ? details.note : null,
          change,
        };
        if (key === IndicatorKey.WEATHER_LAHORE && details.weather && value !== null) item.weather = details.weather as WeatherSummary;
        if (key === IndicatorKey.GOLD_24K && value !== null && typeof details.usdPerTroyOunce === 'number' && typeof details.usdPkr === 'number') {
          item.calculation = {
            usdPerTroyOunce: details.usdPerTroyOunce,
            usdPkr: details.usdPkr,
            gramsPerTroyOunce: GRAMS_PER_TROY_OUNCE,
            gramsPerTola: GRAMS_PER_TOLA,
          };
        }
        return item;
      }),
    );
    return { generatedAt: now.toISOString(), items };
  }

  // ── Scheduled refreshes ──────────────────────────────────────────────────

  async refreshExchangeRate(): Promise<void> {
    const key = IndicatorKey.USD_PKR;
    if (await this.inBackoff(key)) return;
    const existing = await this.indicatorModel.findOne({ key }).lean().exec();
    const nextUpdateAt = (existing?.details as Record<string, unknown> | undefined)?.nextUpdateAt;
    // The provider updates once a day and publishes when; do not ask again before that.
    if (existing?.value != null && typeof nextUpdateAt === 'string' && Date.parse(nextUpdateAt) > Date.now()) return;
    try {
      const body = await fetchJson<{
        result?: string;
        time_last_update_unix?: number;
        time_next_update_unix?: number;
        rates?: Record<string, number>;
      }>(ENDPOINTS.exchangeRate, { contact: this.contact ?? undefined });
      const rate = body.rates?.PKR;
      const updatedUnix = body.time_last_update_unix;
      if (body.result !== 'success' || typeof rate !== 'number' || typeof updatedUnix !== 'number') {
        throw new Error('Exchange-rate response did not contain a USD/PKR rate');
      }
      const effectiveAt = new Date(updatedUnix * 1000);
      await this.recordSuccess({
        key,
        value: round2(rate),
        effectiveAt,
        source: SOURCES.exchangeRate,
        details: {
          note: 'Mid-market reference rate for information only (not a bank or open-market buying/selling rate)',
          nextUpdateAt: typeof body.time_next_update_unix === 'number' ? new Date(body.time_next_update_unix * 1000).toISOString() : null,
        },
        periodKey: `day:${pakistanDateKey(effectiveAt)}`,
      });
    } catch (error) {
      await this.recordFailure(key, error);
      throw error;
    }
  }

  async refreshGold(): Promise<void> {
    const key = IndicatorKey.GOLD_24K;
    if (await this.inBackoff(key)) return;
    try {
      const fx = await this.indicatorModel.findOne({ key: IndicatorKey.USD_PKR }).lean().exec();
      if (!fx?.value || indicatorStatus(IndicatorKey.USD_PKR, { ...fx, details: (fx.details ?? {}) as Record<string, unknown> }) !== 'live') {
        throw new Error('A current USD/PKR rate is required for the PKR conversion');
      }
      const body = await fetchJson<{ price?: number; updatedAt?: string; symbol?: string }>(ENDPOINTS.gold, { contact: this.contact ?? undefined });
      const updatedAt = body.updatedAt ? new Date(body.updatedAt) : null;
      if (body.symbol !== 'XAU' || typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0 || !updatedAt || Number.isNaN(updatedAt.getTime())) {
        throw new Error('Gold price response was incomplete');
      }
      await this.recordSuccess({
        key,
        value: pkrPerTola(body.price, fx.value),
        effectiveAt: updatedAt,
        source: SOURCES.goldApi,
        details: {
          usdPerTroyOunce: body.price,
          usdPkr: fx.value,
          usdPkrAsOf: fx.effectiveAt,
          note: 'International gold spot price converted to PKR per tola. Not a Lahore Sarafa bazaar rate.',
        },
        periodKey: `day:${pakistanDateKey(updatedAt)}`,
      });
    } catch (error) {
      await this.recordFailure(key, error);
      throw error;
    }
  }

  async refreshWeather(): Promise<void> {
    const key = IndicatorKey.WEATHER_LAHORE;
    if (await this.inBackoff(key)) return;
    const existing = await this.indicatorModel.findOne({ key }).lean().exec();
    const details = (existing?.details ?? {}) as Record<string, unknown>;
    const now = new Date();
    const hasValue = existing?.value !== null && existing?.value !== undefined;
    // MET Norway terms: never re-request before the previous response's Expires time.
    if (hasValue && typeof details.expires === 'string' && Date.parse(details.expires) > now.getTime()) return;
    try {
      // MET Norway requires an identifying User-Agent with a real contact (site or email).
      if (!this.contact) throw new Error('Set DAILY_UPDATES_CONTACT (public site URL or email) before requesting MET Norway data');
      const headers: Record<string, string> = {};
      if (hasValue && typeof details.lastModified === 'string') headers['If-Modified-Since'] = details.lastModified;
      const response = await fetchSource(ENDPOINTS.weather, { accept: 'application/json', contact: this.contact, headers });
      const expires = response.headers.get('expires');
      if (response.status === 304) {
        await this.indicatorModel
          .updateOne(
            { key },
            {
              $set: {
                verifiedAt: now,
                lastAttemptAt: now,
                lastError: null,
                consecutiveFailures: 0,
                retryAfter: null,
                ...(expires ? { 'details.expires': new Date(expires).toISOString() } : {}),
              },
            },
          )
          .exec();
        this.tickerCache = null;
        return;
      }
      const forecast = JSON.parse(response.body.toString('utf8')) as MetForecast;
      const weather = summarizeWeather(forecast, now);
      if (!weather) throw new Error('Forecast did not contain current conditions');
      const forecastUpdated = weather.forecastUpdatedAt ? new Date(weather.forecastUpdatedAt) : now;
      await this.recordSuccess({
        key,
        value: weather.temperature,
        effectiveAt: Number.isNaN(forecastUpdated.getTime()) ? now : forecastUpdated,
        source: SOURCES.metNorway,
        details: {
          weather,
          note: 'Forecast data from MET Norway (CC BY 4.0). Advisories are derived from the forecast and are not official PMD warnings.',
          expires: expires ? new Date(expires).toISOString() : null,
          lastModified: response.headers.get('last-modified'),
        },
      });
    } catch (error) {
      await this.recordFailure(key, error);
      throw error;
    }
  }

  /**
   * Petrol and diesel from OGRA's daily price publication (a text-based PDF).
   * The newest publication is downloaded only when it differs from the one
   * already applied; its prices are used only when every formula on the sheet
   * re-computes, the dates match the listing and the change is plausible.
   */
  async refreshFuel(): Promise<void> {
    const keys = [IndicatorKey.PETROL, IndicatorKey.DIESEL] as const;
    if (await this.inBackoff(IndicatorKey.PETROL)) return;
    const now = new Date();
    let publication: OgraPublication | null = null;
    try {
      const listing = await fetchSource(ENDPOINTS.ograPublications, { accept: 'text/html', contact: this.contact ?? undefined, maxBytes: 4 * 1024 * 1024 });
      publication = parseOgraPublicationListing(listing.body.toString('utf8'));
      if (!publication) throw new Error('No price publication found on the OGRA listing page');

      const docs = await Promise.all(keys.map((key) => this.indicatorModel.findOne({ key }).lean().exec()));
      const applied = docs.every(
        (doc) => doc?.value != null && (doc.details as Record<string, unknown> | undefined)?.publicationUrl === publication!.url,
      );
      if (applied) {
        // Daily confirmation: the publication in force is unchanged.
        await this.indicatorModel
          .updateMany(
            { key: { $in: keys } },
            { $set: { verifiedAt: now, lastAttemptAt: now, lastError: null, consecutiveFailures: 0, retryAfter: null } },
          )
          .exec();
        this.tickerCache = null;
        return;
      }

      const pdf = await fetchSource(publication.url, { accept: 'application/pdf', contact: this.contact ?? undefined, maxBytes: 5 * 1024 * 1024 });
      if (pdf.body.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('The OGRA publication is not a PDF');
      const sheets = extractPdfText(pdf.body).map(parseOgraPriceSheetPage).filter((sheet): sheet is FuelSheetResult => sheet !== null);
      const results = keys.map((key) => sheets.find((sheet) => sheet.product === key));
      if (results.some((sheet) => !sheet)) throw new Error('Petrol and diesel prices could not be verified from the OGRA publication');
      for (const sheet of results as FuelSheetResult[]) {
        if (sheet.effectiveDate !== publication.effectiveDate) {
          throw new Error(`Publication date mismatch (${sheet.effectiveDate} vs listing ${publication.effectiveDate})`);
        }
      }

      for (const [index, key] of keys.entries()) {
        const sheet = results[index] as FuelSheetResult;
        const previous = docs[index];
        const previousValue = previous?.value ?? null;
        if (previousValue !== null && Math.abs(sheet.price - previousValue) / previousValue > 0.35) {
          throw new Error(`${INDICATORS[key].label} changed by more than 35%; not applied without review`);
        }
        const previousDetails = (previous?.details ?? {}) as Record<string, unknown>;
        const unchanged = previousValue !== null && previousValue === sheet.price && previous?.effectiveAt;
        // An unchanged price keeps the date it actually took effect; only a revision moves it.
        const effectiveAt = unchanged ? new Date(previous!.effectiveAt as Date) : pakistanMidnight(sheet.effectiveDate);
        await this.recordSuccess({
          key,
          value: sheet.price,
          effectiveAt,
          source: { name: SOURCES.ogra.name, url: publication.url },
          details: {
            publicationUrl: publication.url,
            publicationDate: publication.effectiveDate,
            formulasVerified: sheet.formulasVerified,
            previousValue: unchanged ? previousDetails.previousValue ?? null : previousValue,
            previousEffectiveAt: unchanged ? previousDetails.previousEffectiveAt ?? null : previous?.effectiveAt ?? null,
            note: 'OGRA daily price publication, excluding secondary freight. Every formula on the sheet was re-checked.',
          },
          periodKey: `rev:${pakistanDateKey(effectiveAt)}`,
        });
      }
    } catch (error) {
      for (const key of keys) await this.recordFailure(key, error);
      if (publication) {
        // A newer official publication exists but was not verified: flag current values as possibly outdated.
        await this.indicatorModel
          .updateMany(
            { key: { $in: keys }, 'details.publicationUrl': { $ne: publication.url } },
            { $set: { 'details.unverifiedPublication': { url: publication.url, effectiveDate: publication.effectiveDate, reason: describeError(error) } } },
          )
          .exec()
          .catch((writeError) => this.logger.error(`Could not flag unverified fuel publication: ${describeError(writeError)}`));
      }
      throw error;
    }
  }

  // ── Persistence helpers ──────────────────────────────────────────────────

  private async inBackoff(key: IndicatorKey): Promise<boolean> {
    const doc = await this.indicatorModel.findOne({ key }).select('retryAfter').lean().exec();
    return Boolean(doc?.retryAfter && new Date(doc.retryAfter).getTime() > Date.now());
  }

  async recordSuccess(input: SuccessInput): Promise<void> {
    const definition = INDICATORS[input.key];
    if (!Number.isFinite(input.value) || input.value < definition.min || input.value > definition.max) {
      throw new Error(`${definition.label} value ${input.value} is outside the plausible range`);
    }
    const now = new Date();
    await this.indicatorModel
      .updateOne(
        { key: input.key },
        {
          $set: {
            value: input.value,
            unit: definition.unit,
            effectiveAt: input.effectiveAt,
            verifiedAt: now,
            lastAttemptAt: now,
            lastError: null,
            consecutiveFailures: 0,
            retryAfter: null,
            source: input.source,
            details: input.details ?? {},
          },
        },
        { upsert: true },
      )
      .exec();
    if (input.periodKey) {
      await this.historyModel
        .updateOne(
          { key: input.key, periodKey: input.periodKey },
          {
            $set: {
              value: input.value,
              effectiveAt: input.effectiveAt,
              recordedAt: now,
              source: input.source,
              expiresAt: new Date(now.getTime() + HISTORY_RETENTION_MS),
            },
          },
          { upsert: true },
        )
        .exec();
    }
    this.tickerCache = null;
  }

  /** Records a failed refresh. The last verified value is kept untouched. */
  async recordFailure(key: IndicatorKey, error: unknown): Promise<void> {
    const now = new Date();
    this.logger.warn(`${INDICATORS[key].label} refresh failed: ${describeError(error)}`);
    await this.indicatorModel
      .updateOne(
        { key },
        {
          $set: {
            lastAttemptAt: now,
            lastError: describeError(error),
            retryAfter: error instanceof SourceRateLimitedError ? error.retryAfter : null,
          },
          $inc: { consecutiveFailures: 1 },
          $setOnInsert: { unit: INDICATORS[key].unit, value: null },
        },
        { upsert: true },
      )
      .exec()
      .catch((writeError) => this.logger.error(`Could not record ${key} failure: ${describeError(writeError)}`));
    this.tickerCache = null;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
