"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  type ClientRequirement,
  type RequirementOffer,
  type RequirementStatus,
  formatPkr,
} from "@/lib/requirements";

type AdminRequirement = ClientRequirement & {
  buyer?: { name: string; email: string; phone?: string };
  moderationReason?: string | null;
  offers?: RequirementOffer[];
  moderationHistory?: Array<{
    action: string;
    admin?: { name: string };
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    occurredAt: string;
  }>;
};
type PageData = { items: AdminRequirement[]; total: number; page: number; limit: number; totalPages: number };

const STATUSES: RequirementStatus[] = ["draft", "published", "paused", "closed", "suspended"];

export function AdminRequirementsManager() {
  const [data, setData] = useState<PageData | null>(null);
  const [selected, setSelected] = useState<AdminRequirement | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<PageData>>("/requirements/admin", {
        params: { search: query || undefined, status, page, limit: 50 },
      });
      setData(response.data.data);
      if (selected) {
        const detail = await apiClient.get<ApiEnvelope<AdminRequirement>>(`/requirements/admin/${encodeURIComponent(selected.id)}`);
        setSelected(detail.data.data);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, query, status, selected?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const select = async (item: AdminRequirement) => {
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<AdminRequirement>>(`/requirements/admin/${encodeURIComponent(item.id)}`);
      setSelected(response.data.data);
      setReason("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const moderate = async (action: "suspend" | "restore" | "close") => {
    if (!selected) return;
    if (action === "close" && !window.confirm("Close this requirement? This action prevents further agent offers.")) return;
    setActing(true);
    setError("");
    try {
      await apiClient.patch(`/requirements/admin/${encodeURIComponent(selected.id)}/moderate`, { action, reason: reason.trim() || undefined });
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActing(false);
    }
  };

  return (
    <section className="space-y-5">
      <header><p className="mb-2 text-xs text-slate-400">Admin / Marketplace moderation</p><h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Client Requirements</h1><p className="mt-1 text-sm text-slate-400">Review requirements, buyer information, offers, and moderation history.</p></header>
      {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 rounded-xl border border-[#1b2b42] bg-[#0b1626] p-3">
            <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input aria-label="Search requirements or buyer" className="min-h-10 w-full rounded-lg border border-[#263952] bg-[#08101d] pl-9 pr-3 text-sm text-white" placeholder="Search title, location, buyer" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} /></label>
            <select aria-label="Filter by status" className="min-h-10 rounded-lg border border-[#263952] bg-[#08101d] px-3 text-sm text-white" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="all">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
          {loading ? <p role="status" className="rounded-xl border border-[#1b2b42] bg-[#0b1626] p-10 text-center text-sm text-slate-400">Loading…</p> : data?.items.length ? data.items.map((item) => (
            <button type="button" key={item.id} onClick={() => void select(item)} className={`block w-full rounded-xl border p-4 text-left transition-colors ${selected?.id === item.id ? "border-emerald-500/60 bg-emerald-500/10" : "border-[#1b2b42] bg-[#0b1626] hover:border-[#344b68]"}`}>
              <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-white">{item.title}</span><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-300">{item.status}</span></div>
              <p className="mt-1 text-sm text-slate-400">{item.location.area}, {item.location.city} · {item.purpose} · {item.propertyType}</p>
              <p className="mt-1 text-xs text-slate-500">Buyer: {item.buyer?.name ?? "Unavailable"} · {item.offerCount ?? 0} offers</p>
            </button>
          )) : <p className="rounded-xl border border-[#1b2b42] bg-[#0b1626] p-10 text-center text-sm text-slate-400">No matching requirements found.</p>}
          {data && data.totalPages > 1 && <div className="flex items-center justify-between rounded-xl border border-[#1b2b42] bg-[#0b1626] p-3 text-sm text-slate-400"><span>Page {data.page} of {data.totalPages} · {data.total} requirements</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button size="sm" variant="outline" disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}
        </div>
        {selected ? (
          <aside className="h-fit space-y-4 rounded-xl border border-[#1b2b42] bg-[#0b1626] p-5">
            <div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-semibold text-white">{selected.title}</h2><span className="h-fit rounded-full bg-slate-800 px-3 py-1 text-xs capitalize text-slate-300">{selected.status}</span></div>
            <p className="text-sm text-slate-300">{selected.location.area}, {selected.location.city} · {selected.purpose} · {selected.propertyType}</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{selected.description}</p>
            <div className="rounded-lg border border-[#263952] p-3 text-sm"><h3 className="font-semibold text-white">Buyer details (admin only)</h3><p className="mt-1 text-slate-300">{selected.buyer?.name ?? "Unavailable"}</p><p className="text-slate-400">{selected.buyer?.email ?? ""}</p><p className="text-slate-400">{selected.buyer?.phone ?? ""}</p></div>
            <p className="text-sm text-slate-400">{selected.minBudget != null && `Min ${formatPkr(selected.minBudget)} · `}{selected.maxBudget != null && `Max ${formatPkr(selected.maxBudget)} · `}{selected.minArea ?? "Any"}–{selected.maxArea ?? "any"} {selected.areaUnit ?? ""}</p>
            {selected.moderationReason && <p className="rounded-lg bg-amber-950/30 p-3 text-sm text-amber-200">Moderation note: {selected.moderationReason}</p>}
            <div className="space-y-2"><h3 className="font-semibold text-white">Offers ({selected.offers?.length ?? 0})</h3>{selected.offers?.length ? selected.offers.map((offer) => <div key={offer.id} className="rounded-lg border border-[#263952] p-3 text-sm"><p className="font-medium text-white">{offer.property?.title ?? "Property"} · {offer.status}</p><p className="text-slate-400">{offer.agent?.name ?? "Agent"} · {offer.agent?.email ?? ""} · {offer.agent?.phone ?? ""}</p><p className="mt-1 text-slate-300">{offer.message}</p></div>) : <p className="text-sm text-slate-500">No offers.</p>}</div>
            <div className="space-y-2"><h3 className="font-semibold text-white">Moderation history</h3>{selected.moderationHistory?.length ? selected.moderationHistory.map((entry, index) => <div key={`${entry.action}-${entry.occurredAt}-${index}`} className="rounded-lg border border-[#263952] p-3 text-sm"><p className="font-medium text-slate-200">{entry.action.replace("requirement_", "")}: {entry.previousStatus ?? "—"} → {entry.newStatus ?? "—"}</p><p className="text-xs text-slate-500">{entry.admin?.name ?? "Admin"} · {new Date(entry.occurredAt).toLocaleString()}</p>{entry.reason && <p className="mt-1 text-slate-400">{entry.reason}</p>}</div>) : <p className="text-sm text-slate-500">No moderation actions recorded.</p>}</div>
            <label className="block text-sm font-medium text-slate-300">Moderation reason<textarea maxLength={1000} rows={2} className="mt-1.5 w-full rounded-lg border border-[#263952] bg-[#08101d] p-3 text-sm text-white" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <div className="flex flex-wrap gap-2">
              {selected.status !== "closed" && selected.status !== "suspended" && <Button size="sm" variant="outline" disabled={acting} onClick={() => void moderate("suspend")}>Suspend</Button>}
              {selected.status === "suspended" && <Button size="sm" disabled={acting} onClick={() => void moderate("restore")}>Restore</Button>}
              {selected.status !== "closed" && <Button size="sm" variant="outline" disabled={acting} onClick={() => void moderate("close")}>Close</Button>}
            </div>
          </aside>
        ) : <aside className="rounded-xl border border-dashed border-[#263952] p-10 text-center text-sm text-slate-500">Select a requirement to review the owner and offer details.</aside>}
      </div>
    </section>
  );
}
