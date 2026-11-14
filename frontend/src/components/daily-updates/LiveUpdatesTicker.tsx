"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Coins,
  DollarSign,
  Droplets,
  ExternalLink,
  Fuel,
  Info,
  Moon,
  Pause,
  Play,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  fetchTicker,
  formatPkDateTime,
  formatPkShortDate,
  safeExternalUrl,
  timeAgo,
  type IndicatorKey,
  type TickerItem,
  type TickerResponse,
} from "@/lib/daily-updates";
import styles from "./LiveUpdatesTicker.module.css";

const SPEED_PX_PER_SECOND = 40;
const REFRESH_MS = 5 * 60_000;

const ICONS: Record<Exclude<IndicatorKey, "weather_lahore">, { icon: LucideIcon; tone: string }> = {
  petrol: { icon: Fuel, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  diesel: { icon: Droplets, tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  gold_24k: { icon: Coins, tone: "bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-500" },
  silver: { icon: Coins, tone: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-200" },
  usd_pkr: { icon: DollarSign, tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
};

function weatherIcon(symbol = ""): LucideIcon {
  const night = symbol.endsWith("_night");
  if (symbol.includes("thunder")) return CloudLightning;
  if (symbol.includes("snow") || symbol.includes("sleet")) return CloudSnow;
  if (symbol.startsWith("light") && symbol.includes("rain")) return CloudDrizzle;
  if (symbol.includes("rain")) return CloudRain;
  if (symbol.startsWith("fog")) return CloudFog;
  if (symbol.startsWith("cloudy")) return Cloud;
  if (symbol.startsWith("partlycloudy") || symbol.startsWith("fair")) return night ? CloudMoon : CloudSun;
  if (symbol.startsWith("clearsky")) return night ? Moon : Sun;
  return CloudSun;
}

function iconFor(item: TickerItem): { icon: LucideIcon; tone: string } {
  if (item.key === "weather_lahore") {
    return { icon: weatherIcon(item.weather?.symbol), tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" };
  }
  return ICONS[item.key];
}

const twoDecimals = new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeNumber = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

function formatValue(item: TickerItem): { value: string; unit: string } {
  if (item.value === null) return { value: "", unit: "" };
  switch (item.key) {
    case "weather_lahore":
      return { value: `${Math.round(item.value)}°C`, unit: item.weather?.condition ?? "" };
    case "gold_24k":
    case "silver":
      return { value: `Rs ${wholeNumber.format(item.value)}`, unit: "/tola" };
    case "usd_pkr":
      return { value: `Rs ${twoDecimals.format(item.value)}`, unit: "" };
    default:
      return { value: `Rs ${twoDecimals.format(item.value)}`, unit: "/litre" };
  }
}

function formatChange(item: TickerItem): { text: string; up: boolean } | null {
  if (!item.change || item.change.amount === 0) return null;
  const amount = Math.abs(item.change.amount);
  const text = item.key === "gold_24k" || item.key === "silver" ? wholeNumber.format(amount) : twoDecimals.format(amount);
  return { text, up: item.change.amount > 0 };
}

/** Effective date for administered prices; "updated … ago" for live data. */
function timingLabel(item: TickerItem, now: number | null): string {
  if (item.key === "petrol" || item.key === "diesel") return item.effectiveAt ? `eff. ${formatPkShortDate(item.effectiveAt)}` : "";
  const reference = item.key === "weather_lahore" ? item.verifiedAt : item.effectiveAt;
  if (!reference) return "";
  return now ? timeAgo(reference, now) : formatPkShortDate(reference);
}

function TickerEntry({ item, now }: { item: TickerItem; now: number | null }) {
  const { icon: Icon, tone } = iconFor(item);
  const { value, unit } = formatValue(item);
  const change = formatChange(item);
  const fuel = item.key === "petrol" || item.key === "diesel";
  const timing = item.status === "unavailable" ? "" : timingLabel(item, now);
  const label = item.key === "weather_lahore" ? "Lahore" : item.label;
  const advisory = item.weather?.advisories[0];

  return (
    <span
      className="flex items-center gap-2 whitespace-nowrap px-3.5 sm:px-4"
      title={
        item.status === "unavailable"
          ? `${item.label}: currently unavailable`
          : `${item.label} — source: ${item.source?.name ?? "unknown"}${item.verifiedAt ? `, last checked ${formatPkDateTime(item.verifiedAt)}` : ""}`
      }
    >
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      {item.status === "unavailable" ? (
        <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">Unavailable</span>
      ) : (
        <>
          <span className="text-[13px] font-extrabold tabular-nums text-slate-900 dark:text-white">{value}</span>
          {unit && <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
          {change && (
            <span
              className={`inline-flex items-center text-[11px] font-bold tabular-nums ${
                fuel
                  ? change.up
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {change.up ? <ArrowUp aria-hidden="true" className="h-3 w-3" /> : <ArrowDown aria-hidden="true" className="h-3 w-3" />}
              <span className="sr-only">{change.up ? "up" : "down"}</span>
              {change.text}
            </span>
          )}
          {advisory && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle aria-hidden="true" className="h-3 w-3" /> {advisory}
            </span>
          )}
          {item.status === "stale" ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              May be outdated
            </span>
          ) : (
            timing && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{timing}</span>
          )}
        </>
      )}
      <span aria-hidden="true" className="ml-2 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 sm:ml-2.5" />
    </span>
  );
}

function StatusBadge({ status }: { status: TickerItem["status"] }) {
  const styles = {
    live: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    stale: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    unavailable: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  } as const;
  const labels = { live: "Current", stale: "May be outdated", unavailable: "Unavailable" } as const;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function DetailsPanel({ data, onClose, id }: { data: TickerResponse; onClose: () => void; id: string }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target) && !(target as HTMLElement).closest?.("[data-ticker-details-toggle]")) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  return (
    <div
      id={id}
      ref={panelRef}
      role="dialog"
      aria-label="Daily rates and sources"
      tabIndex={-1}
      className="absolute inset-x-2 top-full z-40 mt-1.5 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:right-4 sm:w-[30rem]"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Today&apos;s rates &amp; sources</p>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close rates details"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {data.items.map((item) => {
          const { icon: Icon, tone } = iconFor(item);
          const { value, unit } = formatValue(item);
          const sourceUrl = item.source ? safeExternalUrl(item.source.url) : null;
          const fuel = item.key === "petrol" || item.key === "diesel";
          return (
            <li key={item.key} className="flex gap-3 px-1 py-2.5">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}>
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.key === "weather_lahore" ? "Lahore weather" : item.label}</span>
                  <StatusBadge status={item.status} />
                </div>
                {item.status === "unavailable" ? (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Not available right now. We never show estimated or placeholder values.
                  </p>
                ) : (
                  <>
                    <p className="mt-0.5 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                      {value} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unit}</span>
                    </p>
                    {item.weather && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.weather.high !== null && item.weather.low !== null && `Next 24 h ${item.weather.low}°–${item.weather.high}°C · `}
                        {item.weather.humidity !== null && `Humidity ${item.weather.humidity}% · `}
                        {item.weather.windKmh !== null && `Wind ${item.weather.windKmh} km/h · `}
                        Rain {item.weather.precipitation24h} mm
                      </p>
                    )}
                    {item.weather?.advisories.map((advisory) => (
                      <p key={advisory} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <AlertTriangle aria-hidden="true" className="h-3 w-3" /> {advisory}
                      </p>
                    ))}
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {fuel ? "Effective " : "Source time "}
                      {formatPkDateTime(item.effectiveAt, !fuel)}
                      {" · Last checked "}
                      {formatPkDateTime(item.verifiedAt)}
                      {item.change && ` · ${item.change.amount > 0 ? "+" : ""}${item.change.amount} vs ${item.change.since}`}
                    </p>
                    {item.note && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{item.note}</p>}
                  </>
                )}
                {item.source && sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                  >
                    {item.key === "usd_pkr" ? "Rates By Exchange Rate API" : item.source.name}
                    <ExternalLink aria-hidden="true" className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
        Prices are collected automatically. Gold and silver are international spot equivalents; local bazaar rates differ.
        Weather advisories are derived from forecast data and are not official PMD warnings. Always confirm before making
        financial decisions.
      </p>
    </div>
  );
}

/**
 * Slim, auto-scrolling strip of daily rates. Fixed height in every state so
 * loading, refreshing or failing never shifts the page.
 */
export default function LiveUpdatesTicker({ className = "" }: { className?: string }) {
  const [data, setData] = useState<TickerResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [duration, setDuration] = useState(60);
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchTicker()
        .then((response) => {
          if (!active) return;
          setData(response);
          setFailed(false);
          setNow(Date.now());
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Pause (and stop compositing work) while the strip is scrolled out of view.
  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Repeat the item group until one half of the track is at least as wide as the
  // viewport, so translating by -50% loops seamlessly on any screen width.
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group || group.offsetWidth === 0) return;
    const nextCopies = Math.max(1, Math.ceil(viewport.offsetWidth / group.offsetWidth));
    setCopies(nextCopies);
    setDuration(Math.max(20, (group.offsetWidth * nextCopies) / SPEED_PX_PER_SECOND));
  }, []);

  useLayoutEffect(() => {
    measure();
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    return () => observer.disconnect();
  }, [measure, data]);

  const closeDetails = useCallback(() => setDetailsOpen(false), []);
  const paused = userPaused || offscreen || detailsOpen;

  let content: ReactNode;
  if (data) {
    const group = (key: string, duplicate: boolean, ref?: React.Ref<HTMLDivElement>) => (
      <div key={key} ref={ref} className={`${styles.group} ${duplicate ? styles.duplicate : ""}`} aria-hidden={duplicate || undefined}>
        {data.items.map((item) => (
          <TickerEntry key={item.key} item={item} now={now} />
        ))}
      </div>
    );
    const half = (prefix: string, firstIsOriginal: boolean) =>
      Array.from({ length: copies }, (_, index) =>
        group(`${prefix}${index}`, !(firstIsOriginal && index === 0), firstIsOriginal && index === 0 ? groupRef : undefined),
      );
    content = (
      <div className={styles.track} style={{ ["--ticker-duration" as string]: `${duration}s` }}>
        {half("a", true)}
        {half("b", false)}
      </div>
    );
  } else if (failed) {
    content = (
      <p className="flex h-full items-center px-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        Live rates are temporarily unavailable. Please check back shortly.
      </p>
    );
  } else {
    content = (
      <div className="flex h-full items-center gap-6 px-4" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="flex shrink-0 items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800" />
            <span className="h-2.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Daily rates: petrol, gold, diesel, Lahore weather, silver and US dollar"
      className={`relative z-20 border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${className}`}
    >
      <div className="mx-auto flex h-10 max-w-[1440px] items-stretch">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-200 pl-3 pr-2 dark:border-slate-800 sm:pl-5 sm:pr-3">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 ${paused ? "" : "motion-safe:animate-ping"}`} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="hidden text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200 sm:inline">
            Daily Rates
          </span>
          <button
            type="button"
            onClick={() => setUserPaused((value) => !value)}
            className="grid h-7 w-7 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={userPaused ? "Resume rates ticker" : "Pause rates ticker"}
            aria-pressed={userPaused}
          >
            {userPaused ? <Play aria-hidden="true" className="h-3.5 w-3.5" /> : <Pause aria-hidden="true" className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div
          ref={viewportRef}
          className={`${styles.viewport} ${paused ? styles.paused : ""}`}
          onPointerDown={(event) => {
            // Tap to pause/resume on touch screens (hover pauses with a mouse).
            if (event.pointerType === "touch") setUserPaused((value) => !value);
          }}
        >
          {content}
        </div>

        <button
          type="button"
          data-ticker-details-toggle
          onClick={() => setDetailsOpen((open) => !open)}
          disabled={!data}
          aria-expanded={detailsOpen}
          aria-controls={detailsOpen ? panelId : undefined}
          className="flex shrink-0 items-center gap-1 border-l border-slate-200 px-3 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-default disabled:text-slate-300 dark:border-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10 sm:px-4"
        >
          <Info aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Details</span>
          <span className="sr-only sm:hidden">Rates details and sources</span>
        </button>
      </div>
      {detailsOpen && data && <DetailsPanel data={data} onClose={closeDetails} id={panelId} />}
    </section>
  );
}
