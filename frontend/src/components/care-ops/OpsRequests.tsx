"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, SlidersHorizontal, Search } from "lucide-react";
import { MAINTENANCE_CATEGORIES, OPS_STATUS_LABELS, formatDate } from "@/lib/maintenance";
import { useAdminRequests } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { MaintenanceStatus } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, StatusBadge } from "@/components/maintenance/MaintenanceShared";
import { ServiceIcon } from "@/components/property-care/PropertyCareUI";
import { OpsPageHeader } from "./OpsShell";

const input = "min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500";

const QUICK = [
  { key: "all", label: "All" },
  { key: "pending", label: "New" },
  { key: "under_review", label: "Under review" },
  { key: "awaiting_technician_acceptance", label: "Awaiting tech" },
  { key: "in_progress", label: "In progress" },
  { key: "awaiting_customer_confirmation", label: "Awaiting customer" },
  { key: "disputed", label: "Disputed" },
  { key: "completed", label: "Completed" },
];

export function OpsRequests() {
  const router = useRouter();
  const params = useSearchParams();
  const [filters, setFilters] = useState({
    status: params.get("status") ?? "all",
    category: "all",
    location: "",
    search: "",
    from: "",
    to: "",
    openComplaints: params.get("openComplaints") ?? "",
  });
  const [debounced, setDebounced] = useState(filters);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const query = { ...debounced, page, limit: 20 };
  const list = useAdminRequests(query, JSON.stringify(query));
  const set = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const data = list.data;
  const activeFilterCount = [filters.category !== "all", filters.location, filters.from, filters.to, filters.openComplaints].filter(Boolean).length;

  return (
    <div>
      <OpsPageHeader title="Requests" description="Every maintenance request across Ghar Safar Property Care." />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {QUICK.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => set("status", item.key)}
            aria-pressed={filters.status === item.key}
            className={cn("min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition", filters.status === item.key ? "border-blue-500 bg-blue-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="mb-4 rounded-2xl border border-white/5 bg-[#0e1b33] p-3 sm:p-4">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search requests</span>
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input value={filters.search} onChange={(event) => set("search", event.target.value)} placeholder="Reference, title, customer or phone" className={cn(input, "pl-9")} />
          </label>
          <button type="button" aria-expanded={showFilters} onClick={() => setShowFilters((open) => !open)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 text-[10px]">{activeFilterCount}</span>}
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-semibold text-slate-400">Status
              <select value={filters.status} onChange={(event) => set("status", event.target.value)} className={cn(input, "mt-1")}>
                <option value="all">All statuses</option>
                {(Object.keys(OPS_STATUS_LABELS) as MaintenanceStatus[]).map((status) => <option key={status} value={status}>{OPS_STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-400">Category
              <select value={filters.category} onChange={(event) => set("category", event.target.value)} className={cn(input, "mt-1")}>
                <option value="all">All categories</option>
                {MAINTENANCE_CATEGORIES.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-400">Location
              <input value={filters.location} onChange={(event) => set("location", event.target.value)} placeholder="Area or city" className={cn(input, "mt-1")} />
            </label>
            <label className="text-xs font-semibold text-slate-400">From
              <input type="date" value={filters.from} onChange={(event) => set("from", event.target.value)} className={cn(input, "mt-1")} />
            </label>
            <label className="text-xs font-semibold text-slate-400">To
              <input type="date" value={filters.to} onChange={(event) => set("to", event.target.value)} className={cn(input, "mt-1")} />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input type="checkbox" checked={filters.openComplaints === "true"} onChange={(event) => set("openComplaints", event.target.checked ? "true" : "")} className="h-4 w-4 accent-rose-500" />
              Open complaints only
            </label>
            <button type="button" onClick={() => { setPage(1); setFilters({ status: "all", category: "all", location: "", search: "", from: "", to: "", openComplaints: "" }); }} className="min-h-11 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 lg:col-start-5">
              Clear all
            </button>
          </div>
        )}
      </section>

      <p className="mb-3 text-xs text-slate-500">{data ? `${data.total} request(s)` : "Loading…"}</p>
      {list.error && <div className="mb-3"><ErrorBanner message={list.error} onRetry={list.reload} dark /></div>}

      {list.loading && !data ? (
        <LoadingState label="Loading requests…" dark />
      ) : !data?.items.length ? (
        <EmptyState dark icon={<ClipboardList className="h-5 w-5" />} title="No requests match" description="Try clearing filters or searching for a different reference." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-[#0e1b33] md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">Request</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Technician</th>
                  <th className="px-4 py-3 font-bold">Visit</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((item) => (
                  <tr key={item.id} onClick={() => router.push(`/care-ops/requests/${item.id}`)} className="cursor-pointer transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ServiceIcon category={item.category} className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <Link href={`/care-ops/requests/${item.id}`} onClick={(event) => event.stopPropagation()} className="block truncate font-semibold text-white hover:underline">{item.title}</Link>
                          <span className="block text-xs text-slate-500">{item.reference} · {formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{item.customerName}<span className="block text-xs text-slate-500">{item.area}, {item.city}</span></td>
                    <td className="px-4 py-3 text-slate-300">{item.technician?.name ?? <span className="text-slate-500">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{item.scheduledVisitAt ? formatDate(item.scheduledVisitAt, true) : "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} dark ops />
                      {item.hasOpenComplaint && <span className="mt-1 block text-[11px] font-bold text-rose-300">Open complaint</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2.5 md:hidden">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/care-ops/requests/${item.id}`} className="block rounded-2xl border border-white/5 bg-[#0e1b33] p-4 active:bg-white/[0.04]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ServiceIcon category={item.category} className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.reference}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} dark ops />
                        {item.hasOpenComplaint && <span className="text-[11px] font-bold text-rose-300">Complaint</span>}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{item.customerName} · {item.area}</p>
                      <p className="text-xs text-slate-500">{item.technician?.name ?? "Unassigned"}{item.scheduledVisitAt ? ` · ${formatDate(item.scheduledVisitAt, true)}` : ""}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-slate-300">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-xl border border-white/10 px-4 disabled:opacity-40">Previous</button>
          <span>Page {page} of {data.totalPages}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-xl border border-white/10 px-4 disabled:opacity-40">Next</button>
        </nav>
      )}
    </div>
  );
}
