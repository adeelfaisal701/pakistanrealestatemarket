"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Building2,
  Crown,
  Eye,
  ExternalLink,
  LineChart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Share2,
  Settings,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { DarkCanvas, PageHeader, RangeSelect } from "@/components/crm/AgentDashboardWidgets";
import type { AdRange } from "@/lib/agent-dashboard-options";
import { PANEL } from "@/lib/agent-ui";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { LeadsTable } from "@/components/crm/AgentDashboardWidgets";
import { useAgentIdentity } from "@/hooks/use-agent-identity";

const DAYS: Record<AdRange, number> = { today: 1, "7d": 7, "30d": 30 };

interface DailyAnalytics {
  date: string;
  propertyViews: number;
  peopleReached: number;
  callClicks: number;
  whatsappClicks: number;
}

interface PropertyAnalytics {
  propertyId: string;
  propertyTitle: string;
  propertyViews: number;
  peopleReached: number;
  callClicks: number;
  whatsappClicks: number;
}

interface AnalyticsResponse {
  source: "database";
  days: number;
  definition: string;
  totals: {
    propertyViews: number;
    peopleReached: number;
    callClicks: number;
    whatsappClicks: number;
  };
  daily: DailyAnalytics[];
  properties: PropertyAnalytics[];
}

interface RecentListing {
  _id: string;
  title: string;
  price: number;
  location: { area: string; city: string };
  areaSize: number;
  areaUnit: string;
  purpose: string;
  propertyType: string;
  images?: string[];
  status: string;
  createdAt: string;
}

const STAT_CARDS = [
  { key: "propertyViews", label: "Total Ad Views", Icon: Eye, color: "bg-emerald-500" },
  { key: "peopleReached", label: "People Reached", Icon: User, color: "bg-blue-500" },
  { key: "callClicks", label: "Call Clicks", Icon: Phone, color: "bg-violet-600" },
  { key: "whatsappClicks", label: "WhatsApp Clicks", Icon: MessageCircle, color: "bg-orange-500" },
] as const;

export function LiveAgentAnalytics() {
  const [range, setRange] = useState<AdRange>("7d");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
  const [recentListingsLoading, setRecentListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [openListingActions, setOpenListingActions] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const identity = useAgentIdentity();

  useEffect(() => setAvatarFailed(false), [identity.avatarUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const analyticsResponse = await apiClient.get<ApiEnvelope<AnalyticsResponse>>(
        `/properties/agent/analytics?days=${DAYS[range]}`,
      );
      setAnalytics(analyticsResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRecentListings = useCallback(async () => {
    setRecentListingsLoading(true);
    setListingsError("");
    try {
      const response = await apiClient.get<ApiEnvelope<RecentListing[]>>(
        "/properties/agent/my-listings",
      );
      setRecentListings(
        [...response.data.data]
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
      );
    } catch (requestError) {
      setListingsError(getApiErrorMessage(requestError));
    } finally {
      setRecentListingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentListings();
  }, [loadRecentListings]);

  const shareListing = async (listing: RecentListing) => {
    const url = `${window.location.origin}/property/${encodeURIComponent(listing._id)}`;
    setShareError("");
    setShareNotice("");
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
        return;
      }
      if (!navigator.clipboard?.writeText) {
        throw new Error("Sharing is not supported by this browser.");
      }
      await navigator.clipboard.writeText(url);
      setShareNotice("Listing link copied.");
    } catch (shareRequestError) {
      if (shareRequestError instanceof DOMException && shareRequestError.name === "AbortError") {
        return;
      }
      setShareError(
        shareRequestError instanceof Error
          ? shareRequestError.message
          : "Could not share this listing.",
      );
    }
  };

  const formatPrice = (price: number) =>
    `PKR ${new Intl.NumberFormat("en-PK").format(price)}`;
  const bucketCount = Math.min(7, analytics?.daily.length ?? 0);
  const chartBuckets = Array.from({ length: bucketCount }, (_, index) => {
    const daily = analytics?.daily ?? [];
    const start = Math.floor((index * daily.length) / bucketCount);
    const end = Math.floor(((index + 1) * daily.length) / bucketCount);
    const entries = daily.slice(start, end);
    return {
      date: entries[entries.length - 1]?.date ?? "",
      value: entries.reduce(
        (total, day) => total + day.propertyViews + day.callClicks + day.whatsappClicks,
        0,
      ),
    };
  });
  const chartMax = Math.max(1, ...chartBuckets.map((bucket) => bucket.value));
  const chartPoints = chartBuckets.map((bucket, index) => {
    const x = chartBuckets.length < 2 ? 500 : (index / (chartBuckets.length - 1)) * 1000;
    const y = 190 - (bucket.value / chartMax) * 150;
    return { x, y, ...bucket };
  });
  const chartLine = chartPoints.map(({ x, y }) => `${x},${y}`).join(" ");
  const chartArea = chartPoints.length
    ? `M ${chartPoints[0].x},220 L ${chartLine} L ${chartPoints[chartPoints.length - 1].x},220 Z`
    : "";
  const topProperty = analytics?.properties.reduce<PropertyAnalytics | null>(
    (best, property) =>
      !best ||
      property.propertyViews > best.propertyViews ||
      (property.propertyViews === best.propertyViews &&
        property.peopleReached > best.peopleReached)
        ? property
        : best,
    null,
  );
  const topPropertyListing = topProperty
    ? recentListings.find((listing) => listing._id === topProperty.propertyId)
    : undefined;

  return (
    <DarkCanvas mobileTheme="light">
      <div className="space-y-6 max-md:-mx-3 max-md:-mt-4 max-md:flex max-md:flex-col max-md:gap-2 max-md:space-y-0 max-md:bg-white max-md:px-4 max-md:pb-8 max-md:pt-3">
        <div className="max-md:hidden">
          <PageHeader
            title={`Welcome Back${identity.name !== "Account" ? `, ${identity.name}` : ""}`}
            subtitle="Performance from your published advertisements."
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#EAF7F2] text-sm font-bold text-[#008F68]">
                {identity.avatarUrl && !avatarFailed ? (
                  <img
                    src={identity.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  identity.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A"
                )}
              </span>
              <span className="hidden text-xs font-medium capitalize text-slate-400 max-md:block">
                {identity.role}
              </span>
            </div>
            <RangeSelect value={range} onChange={setRange} />
          </PageHeader>
        </div>

        <section className="order-1 space-y-3 md:hidden" aria-label="Agent welcome">
          <div className="relative isolate h-[80px] overflow-hidden rounded-[22px] border border-[#D9ECE3] bg-[#00633F] shadow-[0_12px_30px_rgba(0,87,55,0.16)]">
            <img
              src="/images/agent%20crm.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#004B31]/95 via-[#005637]/88 to-[#005637]/15" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#004B31]/55 to-transparent" />
            <span
              aria-hidden="true"
              className="absolute -bottom-5 -right-4 h-14 w-32 rounded-tl-[100%] border-l-2 border-t-2 border-[#B8E9D1] shadow-[-7px_-7px_18px_rgba(184,233,209,0.16)]"
            />
            <div className="relative z-10 flex h-full items-center gap-3 px-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#B8E9D1]">
                <TrendingUp className="h-7 w-7" />
              </span>
              <span className="h-12 w-px shrink-0 bg-white/65" />
              <div className="flex min-w-0 flex-col justify-center">
              <p className="text-xs font-medium text-[#E4F4EB]">Welcome back,</p>
              <h1 className="mt-0.5 flex min-w-0 items-center gap-1.5 text-base font-bold leading-tight text-white">
                <span className="truncate">{identity.name === "Account" ? "Agent" : identity.name}</span>
                {identity.role === "agent" && identity.isVerified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 fill-[#00C98B] text-[#004B31]" />
                )}
              </h1>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                {identity.role === "agent" && identity.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#E4F4EB]">
                    <BadgeCheck className="h-3 w-3 text-[#00D6A0]" />
                    Top Performing Agent
                  </span>
                ) : (
                  <span className="text-[10px] text-[#E4F4EB]">
                    {identity.role === "agent" ? "Agent verification pending" : identity.role}
                  </span>
                )}
              </div>
              </div>
            </div>
          </div>
          <div className="flex justify-start">
            <RangeSelect value={range} onChange={setRange} />
          </div>
        </section>

        {error && (
          <p role="alert" className="order-2 rounded-xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200 max-md:border-red-200 max-md:bg-red-50 max-md:text-red-800">
            Could not load live ad analytics: {error}
          </p>
        )}

        <section className="order-3" aria-label="Performance overview">
          <h2 className="sr-only">Performance Overview</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 max-md:grid-cols-4 max-md:gap-2">
          {STAT_CARDS.map(({ key, label, Icon, color }) => (
            <div key={key} className={cn(
              PANEL,
              "flex min-w-0 items-center gap-4 p-5 max-md:min-h-[94px] max-md:flex-col max-md:justify-center max-md:gap-1 max-md:rounded-[18px] max-md:border-[#DDEBE7] max-md:p-2 max-md:text-center max-md:shadow-[0_8px_24px_rgba(16,54,45,0.06)]",
              key === "propertyViews" && "max-md:bg-[#EAF8F1]",
              key === "peopleReached" && "max-md:bg-[#EEF4FF]",
              key === "callClicks" && "max-md:bg-[#FFF6EB]",
              key === "whatsappClicks" && "max-md:bg-[#EAF8F1]",
            )}>
              <div className={cn(
                "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full",
                color,
                key === "propertyViews" && "max-md:bg-transparent max-md:text-[#006B45]",
                key === "peopleReached" && "max-md:bg-transparent max-md:text-[#244B82]",
                key === "callClicks" && "max-md:bg-transparent max-md:text-[#9A5B18]",
                key === "whatsappClicks" && "max-md:bg-transparent max-md:text-[#009B56]",
                "max-md:h-7 max-md:w-7 max-md:rounded-lg",
              )}>
                <Icon className={cn(
                  "h-6 w-6 text-white max-md:h-7 max-md:w-7",
                  key === "propertyViews" && "max-md:text-[#006B45]",
                  key === "peopleReached" && "max-md:text-[#244B82]",
                  key === "callClicks" && "max-md:text-[#9A5B18]",
                  key === "whatsappClicks" && "max-md:text-[#009B56]",
                )} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-300 max-md:whitespace-normal max-md:text-[10px] max-md:leading-tight max-md:text-[#243247]">{label.replace("Total ", "")}</p>
                <p className="text-3xl font-bold leading-tight text-white max-md:text-[21px] max-md:text-[#101D32]">
                  {loading ? "…" : analytics?.totals[key] ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 max-md:hidden">
                  {key === "callClicks" ? "Call initiated" : "Recorded events"}
                </p>
              </div>
            </div>
          ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 max-md:order-4 max-md:gap-4">
          <section id="ad-performance" className={cn(PANEL, "p-5 max-md:rounded-[22px] max-md:border-[#E3ECE9] max-md:bg-white max-md:p-3 max-md:shadow-[0_8px_24px_rgba(16,54,45,0.06)]")}>
            <div className="mb-4 flex items-center justify-between gap-3 max-md:mb-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <BarChart3 className="h-5 w-5 shrink-0 text-emerald-400 max-md:text-[#069755]" />
                <h2 className="truncate text-lg font-semibold text-white max-md:text-[#101D32]">
                  <span className="hidden md:inline">Ad Performance by Day</span>
                  <span className="md:hidden">Ad Performance</span>
                </h2>
              </div>
              <Link
                href="/agent/ads"
                className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-semibold text-[#08783D] transition-colors hover:text-[#005F35] md:hidden"
              >
                View Details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {analytics?.daily.length ? (
              <>
                <div className="hidden space-y-3 md:block">
                {analytics.daily.map((day) => {
                  const max = Math.max(
                    1,
                    ...analytics.daily.map((item) =>
                      item.propertyViews + item.callClicks + item.whatsappClicks,
                    ),
                  );
                  const sum = day.propertyViews + day.callClicks + day.whatsappClicks;
                  return (
                    <div key={day.date} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-xs">
                      <span className="text-slate-400 max-md:text-[#64748B]">{day.date.slice(5)}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800 max-md:bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, (sum / max) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right text-slate-200 max-md:text-[#101D32]">{sum}</span>
                    </div>
                  );
                })}
                </div>
                <div className="md:hidden">
                  <div
                    className="relative"
                    role="img"
                    aria-label={`Daily tracked ad activity. Maximum ${chartMax} views and contact actions per displayed day.`}
                  >
                    {chartPoints.length > 0 && (
                      <span className="absolute right-0 top-0 z-10 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#17643B] shadow-md">
                        {chartPoints[chartPoints.length - 1].value} Views
                      </span>
                    )}
                    <svg
                      viewBox="0 0 1000 220"
                      preserveAspectRatio="none"
                      className="h-[82px] w-full overflow-visible"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="agent-chart-fill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#2BA96B" stopOpacity=".25" />
                          <stop offset="100%" stopColor="#2BA96B" stopOpacity=".04" />
                        </linearGradient>
                      </defs>
                      {[40, 100, 160, 220].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="1000"
                          y2={y}
                          stroke="#E8EFEC"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                      {chartPoints.length > 0 && (
                        <>
                          <path d={chartArea} fill="url(#agent-chart-fill)" />
                          <polyline
                            points={chartLine}
                            fill="none"
                            stroke="#079447"
                            strokeWidth="4"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                          {chartPoints.map((point, index) => (
                            <circle
                              key={point.date}
                              cx={point.x}
                              cy={point.y}
                              r={index === chartPoints.length - 1 ? 9 : 6}
                              fill={index === chartPoints.length - 1 ? "#08743D" : "#076C38"}
                              stroke="white"
                              strokeWidth="3"
                              vectorEffect="non-scaling-stroke"
                            >
                              <title>{`${point.date}: ${point.value} tracked views and contact actions`}</title>
                            </circle>
                          ))}
                        </>
                      )}
                    </svg>
                    <div className="mt-1 grid grid-cols-7 text-center text-[11px] font-medium text-[#44546A]">
                      {chartBuckets.map((bucket) => (
                        <span key={bucket.date}>
                          {new Date(`${bucket.date}T00:00:00Z`).toLocaleDateString("en-US", {
                            weekday: "short",
                            timeZone: "UTC",
                          })}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 max-md:text-[#64748B]">
                {loading ? "Loading analytics…" : "No analytics data yet."}
              </p>
            )}
            {analytics && (
              <p className="mt-4 text-xs text-slate-400 max-md:hidden">
                Reach counts distinct privacy-preserving visitors who viewed a published ad during this reporting period.
              </p>
            )}
          </section>

          <section className={cn(PANEL, "p-5 max-md:hidden")}>
            <h2 className="mb-4 text-lg font-semibold text-white max-md:text-[#071B2B]">Ad Performance by Property</h2>
            {!analytics?.properties.length ? (
              <p className="text-sm text-slate-400 max-md:text-[#64748B]">
                {loading ? "Loading analytics…" : "No analytics data yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {analytics.properties.map((property) => (
                  <li key={property.propertyId} className="rounded-xl border border-[#1a2a3f] bg-[#0b1524] p-3 max-md:border-[#E2E8F0] max-md:bg-[#F7F9FC]">
                    <p className="truncate font-medium text-slate-100 max-md:text-[#101D32]">{property.propertyTitle}</p>
                    <p className="mt-1 text-xs text-slate-400 max-md:text-[#64748B]">
                      Views {property.propertyViews} · Reach {property.peopleReached} · Calls {property.callClicks} · WhatsApp {property.whatsappClicks}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section
          className={cn(
            PANEL,
            "order-5 min-w-0 p-5 max-md:rounded-[22px] max-md:border-[#E3ECE9] max-md:bg-white max-md:p-3.5 max-md:shadow-[0_8px_24px_rgba(16,54,45,0.06)]",
          )}
          aria-labelledby="top-property-heading"
        >
          <div className="mb-4 flex items-center gap-2 max-md:mb-3">
            <Crown className="h-5 w-5 shrink-0 text-[#E7A321]" />
            <h2 id="top-property-heading" className="text-lg font-semibold text-white max-md:text-sm max-md:text-[#101D32]">
              Top Performing Property
            </h2>
          </div>
          {!topProperty ? (
            <p className="rounded-xl border border-[#263b5b] bg-[#0b1524] p-4 text-sm text-slate-400 max-md:border-[#E5ECE9] max-md:bg-[#F8FBF9] max-md:text-[#64748B]">
              {loading ? "Loading property performance…" : "No property performance data yet."}
            </p>
          ) : (
            <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="relative h-48 min-w-0 overflow-hidden rounded-xl bg-[#14243d] max-md:h-40 max-sm:h-36">
                {topPropertyListing?.images?.[0] ? (
                  <img
                    src={topPropertyListing.images[0]}
                    alt={topProperty.propertyTitle}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-emerald-300">
                    <Building2 className="h-10 w-10" />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-[#08783D] px-2.5 py-1 text-[10px] font-semibold text-white">
                  Most Viewed
                </span>
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <h3 className="line-clamp-2 text-xl font-bold leading-tight text-white max-md:text-base max-md:text-[#101D32]">
                  {topProperty.propertyTitle}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 max-md:mt-2 max-md:gap-x-3">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm text-slate-300 max-md:text-xs max-md:text-[#526178]">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-400 max-md:h-3.5 max-md:w-3.5 max-md:text-[#08783D]" />
                    <span className="truncate">
                      {topPropertyListing
                        ? `${topPropertyListing.location.area}, ${topPropertyListing.location.city}`
                        : "Location unavailable"}
                    </span>
                  </p>
                  <p className="text-base font-bold text-emerald-400 max-md:text-sm max-md:text-[#08783D]">
                    {topPropertyListing
                      ? formatPrice(topPropertyListing.price)
                      : "Price unavailable"}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2 max-md:mt-4 max-sm:grid-cols-2">
                  {[
                    ["Views", topProperty.propertyViews],
                    ["Reach", topProperty.peopleReached],
                    ["Calls", topProperty.callClicks],
                    ["WhatsApp", topProperty.whatsappClicks],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-xl border border-[#263b5b] bg-[#0b1524] px-3 py-2 max-md:border-[#E3ECE9] max-md:bg-[#F8FBF9] max-sm:px-2">
                      <p className="truncate text-xs text-slate-400 max-md:text-[10px] max-md:text-[#64748B]">{label}</p>
                      <p className="mt-0.5 text-base font-semibold text-white max-md:text-sm max-md:text-[#101D32]">{value.toLocaleString("en-US")}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href={topPropertyListing ? `/property/${encodeURIComponent(topPropertyListing._id)}` : "/agent/listings"}
                  className="mt-4 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-xl border border-emerald-500/50 px-4 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 max-md:border-[#18844B] max-md:text-[#17643B] max-md:hover:bg-[#EFF8F2]"
                >
                  View Property <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="order-8 rounded-[22px] border border-[#E3ECE9] bg-white p-3.5 shadow-[0_8px_24px_rgba(16,54,45,0.06)] md:hidden" aria-labelledby="recent-listings-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="recent-listings-heading" className="text-sm font-bold text-[#101D32]">
              Recent Listings
            </h2>
            <Link href="/agent/listings" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#08783D]">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {listingsError ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              Could not load recent listings: {listingsError}
            </p>
          ) : recentListingsLoading ? (
            <div role="status" className="space-y-2 rounded-xl border border-[#E3ECE9] bg-[#F8FBF9] p-3">
              <span className="sr-only">Loading recent listings…</span>
              <span className="block h-3 w-2/3 animate-pulse rounded bg-slate-200" />
              <span className="block h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          ) : recentListings.length === 0 ? (
            <p className="rounded-xl border border-[#E3ECE9] bg-[#F8FBF9] p-3 text-xs text-[#64748B]">
              No property listings are available yet.{" "}
              <Link href="/agent/add-property" className="font-semibold text-[#08783D]">Add a listing</Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {recentListings.slice(0, 3).map((listing) => {
                const status = listing.status.replaceAll("_", " ");
                return (
                  <li
                    key={listing._id}
                    className="relative flex min-w-0 items-center gap-2.5 rounded-xl border border-[#E3ECE9] bg-[#F8FBF9] p-2"
                  >
                    {listing.images?.[0] ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#EAF8F1] text-[#08783D]">
                        <Building2 className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xs font-bold text-[#101D32]">{listing.title}</h3>
                      <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[10px] text-[#64748B]">
                        <MapPin className="h-3 w-3 shrink-0 text-[#08783D]" />
                        <span className="truncate">{listing.location.area}, {listing.location.city}</span>
                      </p>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5">
                        <span className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                          status === "published"
                            ? "bg-emerald-100 text-emerald-800"
                            : status.includes("pending")
                              ? "bg-amber-100 text-amber-800"
                              : status === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-600",
                        )}>
                          {status}
                        </span>
                        <span className="truncate text-[10px] font-semibold text-[#08783D]">
                          {formatPrice(listing.price)}
                        </span>
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        aria-label={`More actions for ${listing.title}`}
                        aria-expanded={openListingActions === listing._id}
                        onClick={() =>
                          setOpenListingActions((current) =>
                            current === listing._id ? null : listing._id,
                          )
                        }
                        className="flex h-10 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#101D32]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openListingActions === listing._id && (
                        <div className="absolute bottom-full right-0 z-20 mb-1 w-32 overflow-hidden rounded-xl border border-[#E3ECE9] bg-white p-1 shadow-xl">
                          <Link
                            href={`/property/${encodeURIComponent(listing._id)}`}
                            onClick={() => setOpenListingActions(null)}
                            className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[11px] font-medium text-[#1C2A3D] hover:bg-slate-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </Link>
                          <Link
                            href={`/agent/listings/${encodeURIComponent(listing._id)}/edit`}
                            onClick={() => setOpenListingActions(null)}
                            className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[11px] font-medium text-[#1C2A3D] hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Manage
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenListingActions(null);
                              void shareListing(listing);
                            }}
                            className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[11px] font-medium text-[#1C2A3D] hover:bg-slate-50"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Share
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {shareError && <p role="alert" className="mt-2 text-xs text-rose-300">{shareError}</p>}
          {shareNotice && <p role="status" className="mt-2 text-xs text-[#08783D]">{shareNotice}</p>}
        </section>

        <section className="order-6 rounded-[22px] border border-[#E3ECE9] bg-white p-2 shadow-[0_8px_24px_rgba(16,54,45,0.06)] md:hidden" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="mb-1 flex items-center gap-1.5 text-sm font-bold text-[#101D32]">
            <Zap className="h-4 w-4 text-[#08783D]" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <Link href="/agent/add-property" className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[16px] border border-[#D8E7E1] bg-[#F2F9F5] px-1 text-center text-[9px] font-semibold leading-tight text-[#17643B] transition-colors hover:border-[#87B99C]">
              <span className="flex h-5 w-5 items-center justify-center text-[#08783D]">
                <Plus className="h-5 w-5" />
              </span>
              Post New Listing
            </Link>
            <Link href="/agent/leads" className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[16px] border border-[#D8E7E1] bg-[#F2F9F5] px-1 text-center text-[9px] font-semibold leading-tight text-[#17643B] transition-colors hover:border-[#87B99C]">
              <span className="flex h-5 w-5 items-center justify-center text-[#08783D]">
                <Search className="h-5 w-5" />
              </span>
              Search Leads
            </Link>
            <Link href="/agent/ads" className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[16px] border border-[#D8E7E1] bg-[#F2F9F5] px-1 text-center text-[9px] font-semibold leading-tight text-[#17643B] transition-colors hover:border-[#87B99C]">
              <span className="flex h-5 w-5 items-center justify-center text-[#08783D]">
                <LineChart className="h-5 w-5" />
              </span>
              View Reports
            </Link>
            <Link href="/agent/ads" className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[16px] border border-[#D8E7E1] bg-[#F2F9F5] px-1 text-center text-[9px] font-semibold leading-tight text-[#17643B] transition-colors hover:border-[#87B99C]">
              <span className="flex h-5 w-5 items-center justify-center text-[#08783D]">
                <Settings className="h-5 w-5" />
              </span>
              Manage Ads
            </Link>
          </div>
        </section>
        <div className="order-7">
          <LeadsTable />
        </div>
      </div>
    </DarkCanvas>
  );
}
