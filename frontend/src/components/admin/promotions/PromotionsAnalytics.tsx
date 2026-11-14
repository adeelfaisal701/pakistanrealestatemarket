"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Eye, MousePointerClick, Percent, PlayCircle, RefreshCw, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, DonutChart, LineChart } from "@/components/property-care/Charts";
import { getApiErrorMessage } from "@/lib/api-client";
import { PLACEMENT_LABELS, adminPromotions, type AdminCampaign, type PromoAnalytics } from "@/lib/promotions";
import { formatNumber, inputClass } from "./shared";

const SHORT_PLACEMENT: Record<string, string> = {
  home_featured: "Home",
  listings_inline: "Listings",
  property_detail_content: "Detail · desc",
  property_detail_similar: "Detail · similar",
  projects_section: "Projects",
  agencies_section: "Agencies",
};

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Eye; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Icon className="h-4 w-4 text-emerald-400" /> {label}
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function PromotionsAnalytics({ campaigns }: { campaigns: AdminCampaign[] }) {
  const [days, setDays] = useState(30);
  const [campaignId, setCampaignId] = useState("");
  const [data, setData] = useState<PromoAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminPromotions.analytics({ days, ...(campaignId ? { campaignId } : {}) }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [days, campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals;
  const shortDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" });

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center">
        <select className={`${inputClass} sm:max-w-xs`} value={campaignId} onChange={(event) => setCampaignId(event.target.value)} aria-label="Campaign">
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>{campaign.title} — {campaign.companyName}</option>
          ))}
        </select>
        <select className={`${inputClass} sm:max-w-[160px]`} value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Period">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()} className="sm:ml-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </section>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
        </div>
      ) : null}

      {totals ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Eye} label="Impressions" value={formatNumber(totals.impressions)} hint="≥50% visible for 1s" />
            <StatCard icon={Users} label="Unique impressions" value={formatNumber(totals.uniqueImpressions)} hint="Per visitor per day" />
            <StatCard icon={MousePointerClick} label="Clicks" value={formatNumber(totals.clicks)} />
            <StatCard icon={Percent} label="CTR" value={`${totals.ctr}%`} hint="Clicks ÷ impressions" />
            <StatCard icon={PlayCircle} label="Video views" value={formatNumber(totals.videoViews)} />
            <StatCard icon={CheckCircle2} label="Completion rate" value={`${totals.completionRate}%`} hint={`${formatNumber(totals.videoCompletions)} completed`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-white">Daily impressions</h3>
              <LineChart dark label="Daily impressions" data={data.daily.map((row) => ({ label: shortDay(row.day), value: row.impressions }))} />
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-white">Daily clicks</h3>
              <LineChart dark label="Daily clicks" data={data.daily.map((row) => ({ label: shortDay(row.day), value: row.clicks }))} />
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-white">Impressions by placement</h3>
              {data.placements.length ? (
                <BarChart
                  dark
                  label="Impressions by placement"
                  data={data.placements.map((row) => ({ label: SHORT_PLACEMENT[row.placement] ?? row.placement, value: row.impressions }))}
                />
              ) : (
                <p className="py-10 text-center text-xs text-slate-500">No placement data for this period.</p>
              )}
              <ul className="mt-4 space-y-1 text-xs text-slate-400">
                {data.placements.map((row) => (
                  <li key={row.placement} className="flex justify-between gap-3">
                    <span className="truncate">{PLACEMENT_LABELS[row.placement] ?? row.placement}</span>
                    <span className="shrink-0 tabular-nums">{formatNumber(row.clicks)} clicks · {row.ctr}% CTR</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-white">Impressions by device</h3>
              <DonutChart
                dark
                label="Impressions by device"
                data={data.devices.map((row) => ({ label: row.device === "mobile" ? `Mobile · ${row.ctr}% CTR` : `Tablet & desktop · ${row.ctr}% CTR`, value: row.impressions }))}
              />
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <h3 className="border-b border-slate-800 px-4 py-3 text-sm font-bold text-white sm:px-5">Performance by campaign</h3>
            {data.campaigns.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold sm:px-5">Campaign</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Impr.</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Unique</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Clicks</th>
                      <th className="px-3 py-2.5 text-right font-semibold">CTR</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Video views</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {data.campaigns.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-2.5 sm:px-5">
                          <p className="font-semibold text-white">{row.title}</p>
                          <p className="text-xs text-slate-500">{row.companyName}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(row.impressions)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(row.uniqueImpressions)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(row.clicks)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{row.ctr}%</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(row.videoViews)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums sm:px-5">{row.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-8 text-center text-xs text-slate-500">No campaign activity recorded in this period yet.</p>
            )}
          </section>
        </>
      ) : loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Loading analytics…</p>
      ) : null}
    </div>
  );
}
