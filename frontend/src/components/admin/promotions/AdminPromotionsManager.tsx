"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Copy,
  Eye,
  MonitorPlay,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-client";
import SponsoredCarousel from "@/components/promotions/SponsoredCarousel";
import { PLACEMENT_LABELS, adminPromotions, type AdminCampaign, type PromoPlacement, type PromoStatus } from "@/lib/promotions";
import { CampaignEditor } from "./CampaignEditor";
import { ScaledPreview } from "./ScaledPreview";
import { PromotionsAnalytics } from "./PromotionsAnalytics";
import { PromotionsSettings } from "./PromotionsSettings";
import { StatusChip, formatDate, formatNumber, inputClass } from "./shared";

type Tab = "campaigns" | "analytics" | "settings";

const STATUS_FILTERS = [
  ["all", "All statuses"],
  ["live", "Live now"],
  ["scheduled", "Scheduled"],
  ["expired", "Expired"],
  ["draft", "Draft"],
  ["paused", "Paused"],
  ["archived", "Archived"],
] as const;

function ctr(campaign: AdminCampaign) {
  return campaign.totals.impressions ? Math.round((campaign.totals.clicks / campaign.totals.impressions) * 10000) / 100 : 0;
}

function PreviewDialog({ campaign, onClose }: { campaign: AdminCampaign; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${campaign.title}`} onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-slate-100 p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">Preview — {campaign.title}</p>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-600 hover:bg-slate-200" aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
        </div>
        {campaign.media.length ? (
          <div className="space-y-6">
            <ScaledPreview width={1216}>
              <SponsoredCarousel campaigns={[campaign]} placement="home_featured" layout="feature" preview />
            </ScaledPreview>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">In-feed (listings, projects, agencies)</p>
              <ScaledPreview width={1216}>
                <SponsoredCarousel campaigns={[campaign]} placement="listings_inline" layout="inline" preview />
              </ScaledPreview>
            </div>
            <div className="max-w-[358px]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mobile</p>
              <SponsoredCarousel campaigns={[campaign]} placement="home_featured" layout="feature" preview />
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">This campaign has no media yet.</p>
        )}
      </div>
    </div>
  );
}

export function AdminPromotionsManager() {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [placement, setPlacement] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");
  const [editing, setEditing] = useState<AdminCampaign | "new" | null>(null);
  const [previewing, setPreviewing] = useState<AdminCampaign | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCampaigns(
        await adminPromotions.list({
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(status !== "all" ? { status } : {}),
          ...(placement ? { placement } : {}),
        }),
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [search, status, placement]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const run = async (campaign: AdminCampaign, action: () => Promise<unknown>, message: string) => {
    setActingId(campaign.id);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const setCampaignStatus = (campaign: AdminCampaign, next: PromoStatus, message: string) =>
    run(campaign, () => adminPromotions.setStatus(campaign.id, next), message);

  const remove = (campaign: AdminCampaign) => {
    if (
      !window.confirm(
        `Delete “${campaign.title}” permanently?\n\nIts analytics are deleted too and uploaded media no longer used by other campaigns are removed. Archive it instead to keep the history.`,
      )
    ) {
      return;
    }
    void run(campaign, () => adminPromotions.remove(campaign.id), "Campaign deleted.");
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{editing === "new" ? "New sponsored campaign" : `Edit “${editing.title}”`}</h2>
          <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
            <X className="mr-1.5 h-4 w-4" /> Close
          </Button>
        </div>
        <CampaignEditor
          campaign={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setNotice(`“${saved.title}” saved — ${saved.effectiveStatus}.`);
            void load();
          }}
        />
      </div>
    );
  }

  const tabs: Array<[Tab, string, typeof BarChart3]> = [
    ["campaigns", "Campaigns", MonitorPlay],
    ["analytics", "Analytics", BarChart3],
    ["settings", "Placement settings", Settings2],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Sponsored campaigns" className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-1">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                tab === key ? "bg-emerald-500/15 text-emerald-200" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {tab === "campaigns" ? (
          <Button type="button" onClick={() => setEditing("new")}>
            <Plus className="mr-1.5 h-4 w-4" /> New campaign
          </Button>
        ) : null}
      </div>

      {tab === "analytics" ? <PromotionsAnalytics campaigns={campaigns} /> : null}
      {tab === "settings" ? <PromotionsSettings /> : null}

      {tab === "campaigns" ? (
        <>
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaign or company" className={`${inputClass} pl-10`} aria-label="Search campaigns" />
            </label>
            <select className={`${inputClass} lg:max-w-[180px]`} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
              {STATUS_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className={`${inputClass} lg:max-w-[280px]`} value={placement} onChange={(event) => setPlacement(event.target.value)} aria-label="Filter by placement">
              <option value="">All placements</option>
              {(Object.keys(PLACEMENT_LABELS) as PromoPlacement[]).map((item) => (
                <option key={item} value={item}>{PLACEMENT_LABELS[item]}</option>
              ))}
            </select>
            <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </section>

          {notice ? <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p> : null}
          {error ? (
            <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
              <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
            </div>
          ) : null}

          {loading && !campaigns.length ? (
            <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Loading campaigns…</p>
          ) : !campaigns.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
              <MonitorPlay className="mx-auto mb-3 h-7 w-7 text-slate-500" />
              <p className="text-sm font-semibold text-white">No sponsored campaigns match.</p>
              <p className="mt-1 text-xs text-slate-500">Create a campaign to show an advertiser&apos;s banners or videos on the website.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const cover = campaign.media.find((item) => item.kind === "image")?.url ?? campaign.media.find((item) => item.posterUrl)?.posterUrl;
                const busy = actingId === campaign.id;
                const isRunning = campaign.status === "active";
                return (
                  <article key={campaign.id} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[160px_minmax(0,1fr)_auto] xl:items-center">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-800 md:w-[160px]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xs text-slate-500">
                          {campaign.media.length ? <Video className="h-5 w-5" /> : "No media"}
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 text-[10px] font-bold text-white">{campaign.media.length} media</span>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip status={campaign.effectiveStatus} />
                        <span className="text-[11px] text-slate-500">Priority {campaign.priority}</span>
                      </div>
                      <h3 className="truncate text-base font-bold text-white">{campaign.title}</h3>
                      <p className="truncate text-xs text-slate-400">
                        {campaign.companyName} · {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500">
                        {campaign.placements.map((item) => PLACEMENT_LABELS[item]).join(" · ") || "No placements"}
                      </p>
                      <p className="text-xs text-slate-300">
                        <span className="tabular-nums">{formatNumber(campaign.totals.impressions)}</span> impressions ·{" "}
                        <span className="tabular-nums">{formatNumber(campaign.totals.clicks)}</span> clicks · {ctr(campaign)}% CTR
                        {campaign.totals.videoViews ? ` · ${formatNumber(campaign.totals.videoViews)} video views` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1 xl:justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewing(campaign)}>
                        <Eye className="mr-1.5 h-4 w-4" /> Preview
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(campaign)} disabled={busy}>
                        <Pencil className="mr-1.5 h-4 w-4" /> Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run(campaign, () => adminPromotions.duplicate(campaign.id), "Draft copy created.")}>
                        <Copy className="mr-1.5 h-4 w-4" /> Duplicate
                      </Button>
                      {isRunning ? (
                        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void setCampaignStatus(campaign, "paused", "Campaign paused.")}>
                          <Pause className="mr-1.5 h-4 w-4" /> Pause
                        </Button>
                      ) : (
                        <Button type="button" size="sm" disabled={busy} onClick={() => void setCampaignStatus(campaign, "active", "Campaign activated.")}>
                          <Play className="mr-1.5 h-4 w-4" /> Activate
                        </Button>
                      )}
                      {campaign.status !== "archived" ? (
                        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void setCampaignStatus(campaign, "archived", "Campaign archived.")}>
                          <Archive className="mr-1.5 h-4 w-4" /> Archive
                        </Button>
                      ) : null}
                      <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => remove(campaign)}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {previewing ? <PreviewDialog campaign={previewing} onClose={() => setPreviewing(null)} /> : null}
    </div>
  );
}
