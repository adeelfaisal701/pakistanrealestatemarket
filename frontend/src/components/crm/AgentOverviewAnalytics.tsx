"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Eye,
  MessageCircle,
  Phone,
  RefreshCw,
  Users,
  type LucideIcon,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { PANEL } from "@/lib/agent-ui";

type AnalyticsDays = 7 | 30;

interface DailyAnalytics {
  date: string;
  propertyViews: number;
  whatsappClicks: number;
}

interface AgentAnalytics {
  source: "database" | "development-sample";
  days: AnalyticsDays;
  daily: DailyAnalytics[];
  sampleMetrics?: {
    adViews: number;
    peopleReached: number;
    callsReceived: number;
  };
  propertyDetailViews: number;
  whatsappClicks: number;
  unavailable: {
    adImpressions: string;
    uniqueReach: string;
    incomingCalls: string;
  };
}

const METRICS: {
  title: string;
  icon: LucideIcon;
  iconStyle: string;
  value: (data: AgentAnalytics | null, loading: boolean, error: string) => string;
  detail: string;
}[] = [
  {
    title: "Total Ad Views",
    icon: Eye,
    iconStyle: "bg-emerald-500/15 text-emerald-400",
    value: (data) =>
      data?.source === "development-sample" && data.sampleMetrics
        ? data.sampleMetrics.adViews.toLocaleString("en-US")
        : "Unavailable",
    detail: "Ad impressions are not recorded by the live application.",
  },
  {
    title: "People Reached",
    icon: Users,
    iconStyle: "bg-blue-500/15 text-blue-300",
    value: (data) =>
      data?.source === "development-sample" && data.sampleMetrics
        ? data.sampleMetrics.peopleReached.toLocaleString("en-US")
        : "Unavailable",
    detail: "Unique viewers are not identified by the current analytics.",
  },
  {
    title: "Calls Received",
    icon: Phone,
    iconStyle: "bg-violet-500/15 text-violet-300",
    value: (data) =>
      data?.source === "development-sample" && data.sampleMetrics
        ? data.sampleMetrics.callsReceived.toLocaleString("en-US")
        : "Unavailable",
    detail: "Incoming calls require a call-tracking integration.",
  },
  {
    title: "WhatsApp Clicks",
    icon: MessageCircle,
    iconStyle: "bg-orange-500/15 text-orange-300",
    value: (data, loading, error) =>
      loading ? "…" : error || !data ? "—" : data.whatsappClicks.toLocaleString("en-US"),
    detail: "Tracked link clicks only; not confirmed chats or conversations.",
  },
];

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ViewsLineChart({
  daily,
  sample,
}: {
  daily: DailyAnalytics[];
  sample: boolean;
}) {
  const maxViews = Math.max(1, ...daily.map((day) => day.propertyViews));
  const points = daily
    .map((day, index) => {
      const x = daily.length < 2 ? 500 : (index / (daily.length - 1)) * 1000;
      const y = 190 - (day.propertyViews / maxViews) * 160;
      return `${x},${y}`;
    })
    .join(" ");
  const labels = daily.filter(
    (_, index) =>
      index === 0 || index === daily.length - 1 || index === Math.floor((daily.length - 1) / 2)
  );

  return (
    <div className="mt-5">
      <div className="h-52 w-full">
        <svg
          viewBox="0 0 1000 220"
          preserveAspectRatio="none"
          role="img"
          aria-label="Property detail views recorded per day"
          className="h-full w-full overflow-visible"
        >
          {[30, 110, 190].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="1000"
              y2={y}
              stroke="#27405f"
              strokeDasharray="4 8"
            />
          ))}
          {daily.length > 0 && (
            <>
              <polyline
                points={points}
                fill="none"
                stroke="#34d399"
                strokeWidth="5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {daily.map((day, index) => {
                const x = daily.length < 2 ? 500 : (index / (daily.length - 1)) * 1000;
                const y = 190 - (day.propertyViews / maxViews) * 160;
                return (
                  <circle
                    key={day.date}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#34d399"
                    stroke="#0a1220"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{`${formatDay(day.date)}: ${day.propertyViews} property views`}</title>
                  </circle>
                );
              })}
            </>
          )}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-slate-400" aria-hidden="true">
        {labels.map((day) => (
          <span key={day.date}>{formatDay(day.date)}</span>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">
        {sample
          ? "Generated sample series for local UI testing. These are not real user interactions or ad impressions."
          : "Property detail-page views recorded since event tracking was enabled. These are not ad impressions, and older lifetime views have no historical dates."}
      </p>
    </div>
  );
}

export function AgentOverviewAnalytics() {
  const [days, setDays] = useState<AnalyticsDays>(7);
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<AgentAnalytics>>(
        `/properties/agent/analytics?days=${days}`
      );
      setAnalytics(response.data.data);
    } catch (requestError) {
      setAnalytics(null);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const periodLabel = `${days} days`;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>Unable to load advertising analytics: {error}</p>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-300/30 px-3 font-semibold hover:bg-red-500/10 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {analytics?.source === "development-sample" && (
        <p
          role="status"
          className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200"
        >
          Development sample analytics — these values are generated for local UI testing and are
          not real user activity.
        </p>
      )}

      <section aria-label="Advertising metrics">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {METRICS.map(({ title, icon: Icon, iconStyle, value, detail }) => (
            <article key={title} className={`${PANEL} min-w-0 p-3 sm:p-6`}>
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${iconStyle}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="min-w-0 text-xs font-medium text-slate-300 sm:text-sm">{title}</h2>
              </div>
              <p className="mt-5 break-words text-lg font-bold tracking-tight text-white sm:text-3xl">
                {value(analytics, loading, error)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {analytics?.source === "development-sample"
                  ? `Generated sample for UI testing; not real activity. ${detail}`
                  : detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${PANEL} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Detailed Analytics</h2>
              <p className="text-sm text-slate-400">Tracked listing interactions · {periodLabel}</p>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            Date range
            <select
              aria-label="Analytics date range"
              value={days}
              onChange={(event) => setDays(Number(event.target.value) as AnalyticsDays)}
              className="h-10 rounded-lg border border-[#27405f] bg-[#0b1524] px-3 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-[#27405f] bg-[#0b1524]/60 p-4 sm:p-5">
            <h3 className="font-semibold text-white">Views Over Time</h3>
            {loading ? (
              <p className="py-16 text-center text-sm text-slate-400">Loading view history…</p>
            ) : error ? (
              <p className="py-16 text-center text-sm text-slate-400">
                View history is unavailable until the analytics API responds.
              </p>
            ) : analytics ? (
              <>
                {analytics.source === "development-sample" && (
                  <p className="mt-2 text-xs text-amber-200">
                    Generated sample data for local testing.
                  </p>
                )}
                <ViewsLineChart
                  daily={analytics.daily}
                  sample={analytics.source === "development-sample"}
                />
              </>
            ) : null}
          </section>

          <section className="rounded-xl border border-[#27405f] bg-[#0b1524]/60 p-4 sm:p-5">
            <h3 className="font-semibold text-white">Audience Reach</h3>
            {analytics?.source === "development-sample" && analytics.sampleMetrics ? (
              <div className="mt-4 rounded-lg border border-[#27405f] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <Users className="h-4 w-4 text-blue-300" aria-hidden="true" />
                    Sample people reached
                  </span>
                  <strong className="text-xl text-white">
                    {analytics.sampleMetrics.peopleReached.toLocaleString("en-US")}
                  </strong>
                </div>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700"
                  role="img"
                  aria-label="Illustrative sample audience reach"
                >
                  <div className="h-full w-2/3 rounded-full bg-blue-400" />
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-200">
                  Illustrative sample only. The live backend does not identify unique viewers.
                </p>
              </div>
            ) : (
              <div className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[#27405f] px-4 text-center">
                <Users className="h-8 w-8 text-slate-500" aria-hidden="true" />
                <p className="mt-3 font-medium text-slate-200">Unique reach unavailable</p>
                <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
                  The backend does not identify unique viewers. Total property views are not used
                  as a substitute for people reached.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#27405f] bg-[#0b1524]/60 p-4 sm:p-5">
            <h3 className="font-semibold text-white">Engagement Analytics</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#27405f] p-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <MessageCircle className="h-4 w-4 text-orange-300" aria-hidden="true" />
                  WhatsApp link clicks
                </div>
                <p className="mt-3 text-2xl font-bold text-white">
                  {loading ? "…" : error || !analytics ? "—" : analytics.whatsappClicks.toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Clicks are counted when a listing contact link is selected, not when a chat starts.
                </p>
              </div>
              <div className="rounded-lg border border-[#27405f] p-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Phone className="h-4 w-4 text-violet-300" aria-hidden="true" />
                  Calls received
                </div>
                <p className="mt-3 text-2xl font-bold text-white">
                  {analytics?.source === "development-sample" && analytics.sampleMetrics
                    ? analytics.sampleMetrics.callsReceived.toLocaleString("en-US")
                    : "Unavailable"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {analytics?.source === "development-sample"
                    ? "Generated sample only; no real calls are tracked."
                    : "No call-tracking integration confirms incoming calls."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#27405f] bg-[#0b1524]/60 p-4 sm:p-5">
            <h3 className="font-semibold text-white">Performance Summary</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {loading
                ? "Loading the selected-period summary…"
                : error || !analytics
                  ? "Performance summary is unavailable because analytics could not be loaded."
                  : analytics.source === "development-sample"
                    ? `Sample only: ${analytics.propertyDetailViews.toLocaleString("en-US")} property detail views and ${analytics.whatsappClicks.toLocaleString("en-US")} WhatsApp link clicks for UI testing in the last ${periodLabel}. These are not real user interactions.`
                    : `${analytics.propertyDetailViews.toLocaleString("en-US")} property detail views and ${analytics.whatsappClicks.toLocaleString("en-US")} WhatsApp link clicks were recorded in the last ${periodLabel}. Ad impressions, unique reach, and confirmed calls are not available.`}
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
