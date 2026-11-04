"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Eye, MessageCircle, Phone, User } from "lucide-react";
import { DarkCanvas, PageHeader, RangeSelect } from "@/components/crm/AgentDashboardWidgets";
import type { AdRange } from "@/lib/agent-dashboard-options";
import { PANEL } from "@/lib/agent-ui";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/crm/TimeAgo";
import { LeadsTable } from "@/components/crm/AgentDashboardWidgets";

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

interface AgentActivity {
  id: string;
  title: string;
  description: string;
  href: string;
  occurredAt: string;
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
  const [activity, setActivity] = useState<AgentActivity[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [analyticsResponse, propertyActivity, leadActivity] = await Promise.all([
        apiClient.get<ApiEnvelope<AnalyticsResponse>>(
          `/properties/agent/analytics?days=${DAYS[range]}`,
        ),
        apiClient.get<ApiEnvelope<AgentActivity[]>>("/properties/agent/activity"),
        apiClient.get<ApiEnvelope<AgentActivity[]>>("/crm/activity"),
      ]);
      setAnalytics(analyticsResponse.data.data);
      setActivity(
        [...propertyActivity.data.data, ...leadActivity.data.data]
          .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
          .slice(0, 10),
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DarkCanvas>
      <div className="space-y-6">
        <PageHeader title="Welcome Back" subtitle="Performance from your published advertisements.">
          <RangeSelect value={range} onChange={setRange} />
        </PageHeader>

        {error && (
          <p role="alert" className="rounded-xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            Could not load live ad analytics: {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map(({ key, label, Icon, color }) => (
            <div key={key} className={cn(PANEL, "flex items-center gap-4 p-5")}>
              <div className={cn("flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full", color)}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-300">{label}</p>
                <p className="text-3xl font-bold leading-tight text-white">
                  {loading ? "…" : analytics?.totals[key] ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {key === "callClicks" ? "Call initiated" : "Recorded events"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className={cn(PANEL, "p-5")}>
            <div className="mb-4 flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Ad Performance by Day</h2>
            </div>
            {analytics?.daily.length ? (
              <div className="space-y-3">
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
                      <span className="text-slate-400">{day.date.slice(5)}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, (sum / max) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right text-slate-200">{sum}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                {loading ? "Loading analytics…" : "No analytics data yet."}
              </p>
            )}
            {analytics && (
              <p className="mt-4 text-xs text-slate-500">
                Reach counts distinct privacy-preserving visitors who viewed a published ad during this reporting period.
              </p>
            )}
          </section>

          <section className={cn(PANEL, "p-5")}>
            <h2 className="mb-4 text-lg font-semibold text-white">Ad Performance by Property</h2>
            {!analytics?.properties.length ? (
              <p className="text-sm text-slate-400">
                {loading ? "Loading analytics…" : "No analytics data yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {analytics.properties.map((property) => (
                  <li key={property.propertyId} className="rounded-xl border border-[#1a2a3f] bg-[#0b1524] p-3">
                    <p className="truncate font-medium text-slate-100">{property.propertyTitle}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Views {property.propertyViews} · Reach {property.peopleReached} · Calls {property.callClicks} · WhatsApp {property.whatsappClicks}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={cn(PANEL, "p-5")}>
            <h2 className="mb-4 text-lg font-semibold text-white">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">
                {loading ? "Loading recent activity…" : "No recent listing, ad, lead, or contact activity yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id}>
                    <a href={item.href} className="block rounded-lg text-sm transition-colors hover:text-emerald-300">
                      <span className="block font-medium text-slate-100">{item.title}</span>
                      <span className="mt-0.5 block truncate text-slate-400">{item.description}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        <TimeAgo iso={item.occurredAt} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <LeadsTable />
      </div>
    </DarkCanvas>
  );
}
