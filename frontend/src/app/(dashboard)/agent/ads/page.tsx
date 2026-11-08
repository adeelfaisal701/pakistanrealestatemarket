"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Pause, Play, Plus, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GHOST_BTN, PANEL, PRIMARY_BTN } from "@/lib/agent-ui";
import type { AdRange, AdMetrics } from "@/lib/agent-dashboard-options";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  AdMetricsLine,
  DarkCanvas,
  PageHeader,
  RangeSelect,
} from "@/components/crm/AgentDashboardWidgets";

type AdvertisementStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "paused"
  | "ended";

interface AgentAdvertisement {
  id: string;
  propertyId: string;
  status: AdvertisementStatus;
  submittedAt: string;
  approvedAt?: string;
  moderationNotes?: string;
  property: {
    title: string;
    location: { area: string; city: string };
    price: number;
    propertyType: string;
    purpose: string;
    images?: string[];
  };
}

interface PropertyAnalytics {
  propertyId: string;
  propertyViews: number;
  peopleReached: number;
  callClicks: number;
  whatsappClicks: number;
}

interface AgentAnalytics {
  properties: PropertyAnalytics[];
}

const FILTERS: ("All" | AdvertisementStatus)[] = [
  "All",
  "pending_review",
  "published",
  "rejected",
  "paused",
  "ended",
  "draft",
];
const LABELS: Record<AdvertisementStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  published: "Published",
  rejected: "Rejected",
  paused: "Paused",
  ended: "Ended",
};
const RANGE_DAYS: Record<AdRange, number> = { today: 1, "7d": 7, "30d": 30 };

function formatPrice(price: number): string {
  return `PKR ${new Intl.NumberFormat("en-PK").format(price)}`;
}

export default function MyAdsPage() {
  const [ads, setAds] = useState<AgentAdvertisement[]>([]);
  const [metrics, setMetrics] = useState<Map<string, PropertyAnalytics>>(new Map());
  const [range, setRange] = useState<AdRange>("7d");
  const [filter, setFilter] = useState<"All" | AdvertisementStatus>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadAds = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adsResponse, analyticsResponse] = await Promise.all([
        apiClient.get<ApiEnvelope<AgentAdvertisement[]>>("/properties/agent/my-ads"),
        apiClient.get<ApiEnvelope<AgentAnalytics>>(
          `/properties/agent/analytics?days=${RANGE_DAYS[range]}`,
        ),
      ]);
      setAds(adsResponse.data.data);
      setMetrics(
        new Map(
          analyticsResponse.data.data.properties.map((item) => [item.propertyId, item]),
        ),
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void loadAds();
  }, [loadAds]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [ads, loading]);

  const visible = useMemo(
    () => ads.filter((ad) => filter === "All" || ad.status === filter),
    [ads, filter],
  );
  const counts = useMemo(() => {
    const result: Record<string, number> = { All: ads.length };
    for (const status of FILTERS.slice(1)) result[status] = 0;
    ads.forEach((ad) => { result[ad.status] = (result[ad.status] ?? 0) + 1; });
    return result;
  }, [ads]);

  const changeStatus = async (ad: AgentAdvertisement, status: string) => {
    setUpdatingId(ad.id);
    setError("");
    try {
      await apiClient.put(`/properties/advertisements/${encodeURIComponent(ad.id)}/status`, { status });
      await loadAds();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setUpdatingId("");
    }
  };

  const getMetrics = (propertyId: string): AdMetrics => {
    const record = metrics.get(propertyId);
    return {
      views: record?.propertyViews ?? 0,
      reach: record?.peopleReached ?? 0,
      calls: record?.callClicks ?? 0,
      whatsapp: record?.whatsappClicks ?? 0,
    };
  };

  return (
    <DarkCanvas>
      <div className="space-y-6">
        <PageHeader title="My Ads" subtitle="Advertisements submitted for moderation or publishing.">
          <RangeSelect value={range} onChange={setRange} />
          <Link href="/agent/add-property" className={PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Create New Ad
          </Link>
        </PageHeader>

        <div className="flex flex-wrap gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-1" role="tablist" aria-label="Filter advertisements by status">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={filter === status}
              onClick={() => setFilter(status)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                filter === status
                  ? "border-emerald-500 bg-emerald-600/25 text-white max-md:bg-[#008F68]"
                  : "border-[#27405f] bg-[#0b1524] text-slate-300 hover:bg-[#13233b] max-md:border-[#E2E8F0] max-md:bg-white max-md:text-[#64748B]",
              )}
            >
              {status === "All" ? status : LABELS[status]}{" "}
              <span className="ml-1 text-xs text-slate-400">{counts[status] ?? 0}</span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200 max-md:border-red-200 max-md:bg-red-50 max-md:text-red-800">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-400">Loading advertisements…</p>
        ) : visible.length === 0 ? (
          <div className={cn(PANEL, "flex flex-col items-center gap-3 px-6 py-14 text-center")}>
            <Megaphone className="h-8 w-8 text-slate-500" />
            <p className="text-slate-300">
              {ads.length === 0 ? "You don't have any advertisements yet." : `No ${LABELS[filter as AdvertisementStatus]?.toLowerCase() ?? filter} advertisements.`}
            </p>
            {ads.length === 0 && (
              <Link href="/agent/listings" className={PRIMARY_BTN}>Choose a listing to send live</Link>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {visible.map((ad) => {
              const stats = getMetrics(ad.propertyId);
              return (
                <li
                  key={ad.id}
                  id={`advertisement-${ad.id}`}
                  className={cn(PANEL, "flex flex-col gap-4 p-4 sm:flex-row sm:items-center max-md:grid max-md:grid-cols-[88px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-2 max-md:p-3")}
                >
                  {ad.property.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ad.property.images[0]}
                      alt={ad.property.title}
                      className="h-24 w-full flex-shrink-0 rounded-xl bg-[#16243a] object-cover sm:w-36 max-md:h-full max-md:min-h-[96px]"
                    />
                  ) : (
                    <div className="flex h-24 w-full flex-shrink-0 items-center justify-center rounded-xl bg-[#16243a] text-xs text-slate-500 sm:w-36 max-md:min-h-[96px]">
                      No listing image
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-base font-semibold text-white max-md:text-sm max-md:text-[#071B2B]">{ad.property.title}</h2>
                      <span className="rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 max-md:bg-[#EAF7F2] max-md:text-[#008F68]">
                        {LABELS[ad.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 max-md:text-[#64748B]">
                      {ad.property.location.area}, {ad.property.location.city} · {ad.property.propertyType} · For {ad.property.purpose} · {formatPrice(ad.property.price)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 max-md:text-[#64748B]">
                      Submitted {new Date(ad.submittedAt).toLocaleDateString()}
                      {ad.approvedAt ? ` · Approved ${new Date(ad.approvedAt).toLocaleDateString()}` : ""}
                    </p>
                    {ad.status === "rejected" && ad.moderationNotes && (
                      <p className="mt-1 text-sm text-red-300 max-md:text-red-700">Review reason: {ad.moderationNotes}</p>
                    )}
                    <div className="mt-2"><AdMetricsLine metrics={stats} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:w-40 sm:flex-col max-md:col-span-2 max-md:flex-nowrap max-md:gap-1 max-md:border-t max-md:border-[#E2E8F0] max-md:pt-2">
                    {ad.status === "published" && (
                      <button
                        type="button"
                        disabled={updatingId === ad.id}
                        onClick={() => void changeStatus(ad, "paused")}
                        className={cn(
                          GHOST_BTN,
                          "max-md:min-w-0 max-md:flex-[1_1_0%] max-md:whitespace-nowrap max-md:px-1 max-md:text-[clamp(0.625rem,3vw,0.875rem)] min-[360px]:max-md:px-2",
                        )}
                      >
                        <Pause className="h-4 w-4 shrink-0 max-md:h-3 max-md:w-3 min-[360px]:max-md:h-3.5 min-[360px]:max-md:w-3.5" /> Pause
                      </button>
                    )}
                    {ad.status === "paused" && (
                      <button
                        type="button"
                        disabled={updatingId === ad.id}
                        onClick={() => void changeStatus(ad, "published")}
                        className={cn(
                          GHOST_BTN,
                          "max-md:min-w-0 max-md:flex-[1_1_0%] max-md:whitespace-nowrap max-md:px-1 max-md:text-[clamp(0.625rem,3vw,0.875rem)] min-[360px]:max-md:px-2",
                        )}
                      >
                        <Play className="h-4 w-4 shrink-0 max-md:h-3 max-md:w-3 min-[360px]:max-md:h-3.5 min-[360px]:max-md:w-3.5" /> Resume
                      </button>
                    )}
                    {["published", "paused"].includes(ad.status) && (
                      <button
                        type="button"
                        disabled={updatingId === ad.id}
                        onClick={() => void changeStatus(ad, "ended")}
                        className={cn(
                          GHOST_BTN,
                          "max-md:min-w-0 max-md:flex-[1_1_0%] max-md:whitespace-nowrap max-md:px-1 max-md:text-[clamp(0.625rem,3vw,0.875rem)] min-[360px]:max-md:px-2",
                        )}
                      >
                        <StopCircle className="h-4 w-4 shrink-0 max-md:h-3 max-md:w-3 min-[360px]:max-md:h-3.5 min-[360px]:max-md:w-3.5" /> End Ad
                      </button>
                    )}
                    <Link
                      href={`/agent/listings/${encodeURIComponent(ad.propertyId)}/edit`}
                      className={cn(
                        GHOST_BTN,
                        "max-md:min-w-0 max-md:flex-[1_1_0%] max-md:whitespace-nowrap max-md:px-1 max-md:text-[clamp(0.625rem,3vw,0.875rem)] min-[360px]:max-md:px-2",
                      )}
                    >
                      Edit Listing
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DarkCanvas>
  );
}
