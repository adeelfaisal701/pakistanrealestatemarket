"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Megaphone, RefreshCw, Search } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/utils";

interface Advertisement {
  id: string;
  status: string;
  submittedAt?: string;
  approvedAt?: string;
  moderationNotes?: string;
  analytics?: {
    property_view?: number;
    call_click?: number;
    whatsapp_click?: number;
  };
  property?: {
    _id?: string;
    title?: string;
    price?: number;
    location?: { city?: string; area?: string };
    images?: string[];
  } | null;
  agent?: { _id?: string; name?: string; agencyName?: string } | null;
}

interface AdvertisementPage {
  items: Advertisement[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTIONS: Record<string, Array<AdvertisementAction>> = {
  pending_review: ["approve", "reject", "remove"],
  published: ["pause", "unpublish", "end", "remove"],
  paused: ["resume", "end", "remove"],
  rejected: ["remove"],
  ended: ["remove"],
};

type AdvertisementAction =
  | "approve"
  | "reject"
  | "publish"
  | "unpublish"
  | "pause"
  | "resume"
  | "end"
  | "remove";

const STATUS_OPTIONS = [
  "all",
  "pending_review",
  "published",
  "paused",
  "rejected",
  "ended",
  "removed",
];

function requiresReason(action: AdvertisementAction) {
  return action === "reject" || action === "remove";
}

export function AdminAdvertisementManager() {
  const [data, setData] = useState<AdvertisementPage | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<AdvertisementPage>>(
        "/admin/advertisements",
        {
          params: {
            page,
            limit: 30,
            ...(status !== "all" ? { status } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        },
      );
      setData(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const act = async (item: Advertisement, action: AdvertisementAction) => {
    const explanation = action === "reject" || action === "remove"
      ? window.prompt(`Enter a reason to ${action} this advertisement:`)?.trim()
      : "";
    if (requiresReason(action) && !explanation) return;
    const warning = action === "remove"
      ? "This removes the advertisement from the marketplace but keeps the original property and its records."
      : `Confirm ${action} for this advertisement?`;
    if (!window.confirm(`${warning}\n\n${item.property?.title ?? item.id}`)) return;
    setActingId(item.id);
    setError("");
    try {
      await apiClient.patch(`/admin/advertisements/${item.id}/action`, {
        action,
        ...(explanation ? { reason: explanation } : {}),
      });
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search title, agent, agency, city, or ID"
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm text-white"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-white"
            aria-label="Filter advertisements by status"
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All statuses" : item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          {data ? `${data.total} advertisement records · page ${data.page} of ${Math.max(data.totalPages, 1)}` : "Loading advertisement records…"}
        </p>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
        </div>
      )}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">
          Loading advertisements…
        </p>
      ) : !data?.items.length ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">
          <Megaphone className="mx-auto mb-2 h-6 w-6" />
          No advertisements match this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {data.items.map((item) => {
            const propertyId = item.property?._id;
            return (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[150px_1fr_auto] md:items-center">
                {item.property?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.property.images[0]} alt="" className="h-28 w-full rounded-xl bg-slate-800 object-cover md:w-[150px]" />
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-xl bg-slate-800 text-xs text-slate-500 md:w-[150px]">No photo</div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-white">{item.property?.title ?? "Property no longer available"}</h2>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-300">{item.status.replaceAll("_", " ")}</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {typeof item.property?.price === "number" ? formatPKR(item.property.price) : "Price unavailable"}
                    {item.property?.location && ` · ${[item.property.location.area, item.property.location.city].filter(Boolean).join(", ")}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    Agent: {item.agent?.name ?? "Unavailable"}{item.agent?.agencyName ? ` · ${item.agent.agencyName}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "date unavailable"}
                    {item.approvedAt ? ` · Approved ${new Date(item.approvedAt).toLocaleDateString()}` : ""}
                  </p>
                  {item.analytics && (
                    <p className="text-xs text-slate-400">
                      Views {item.analytics.property_view ?? 0} · Calls {item.analytics.call_click ?? 0} · WhatsApp {item.analytics.whatsapp_click ?? 0}
                    </p>
                  )}
                  {item.moderationNotes && <p className="text-xs text-amber-300">Review note: {item.moderationNotes}</p>}
                  {propertyId && (
                    <Link href={`/property/${encodeURIComponent(propertyId)}`} className="text-xs font-semibold text-rose-300 hover:text-rose-200">
                      Open public property page
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:max-w-44 md:justify-end">
                  {(ACTIONS[item.status] ?? []).map((action) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant={action === "reject" || action === "remove" ? "danger" : "outline"}
                      disabled={actingId === item.id}
                      onClick={() => void act(item, action)}
                      className="capitalize"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!loading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-300">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span>Page {page} of {data.totalPages}</span>
          <Button type="button" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
