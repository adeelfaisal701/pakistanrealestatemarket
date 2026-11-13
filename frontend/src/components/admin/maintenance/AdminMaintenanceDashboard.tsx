"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hammer,
  Hourglass,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { MAINTENANCE_CATEGORIES, OPS_STATUS_LABELS, formatDate } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { MaintenanceListItem, MaintenanceStatus, Paginated } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, StatusBadge } from "@/components/maintenance/MaintenanceShared";
import { AdminMaintenanceTabs } from "./AdminMaintenanceTabs";

interface Overview {
  stats: Record<string, number>;
  technicians: { active: number; available: number };
}

const STAT_CARDS: Array<{ key: string; label: string; icon: typeof ClipboardList; tone: string; filter?: Partial<Filters> }> = [
  { key: "total", label: "Total Requests", icon: ClipboardList, tone: "text-blue-300", filter: { status: "all" } },
  { key: "pending", label: "Pending", icon: Clock3, tone: "text-amber-300", filter: { status: "pending" } },
  { key: "awaitingAcceptance", label: "Awaiting Technician", icon: Hourglass, tone: "text-indigo-300", filter: { status: "awaiting_technician_acceptance" } },
  { key: "assigned", label: "Assigned Jobs", icon: UserCheck, tone: "text-sky-300", filter: { status: "accepted" } },
  { key: "inProgress", label: "In Progress", icon: Hammer, tone: "text-violet-300", filter: { status: "in_progress" } },
  { key: "completed", label: "Completed", icon: CheckCircle2, tone: "text-emerald-300", filter: { status: "completed" } },
  { key: "cancelled", label: "Cancelled", icon: XCircle, tone: "text-slate-300", filter: { status: "cancelled" } },
  { key: "openComplaints", label: "Open Complaints", icon: AlertTriangle, tone: "text-rose-300", filter: { status: "all", openComplaints: "true" } },
];

interface Filters {
  status: string;
  category: string;
  location: string;
  search: string;
  from: string;
  to: string;
  openComplaints: string;
}

const EMPTY_FILTERS: Filters = { status: "all", category: "all", location: "", search: "", from: "", to: "", openComplaints: "" };
const input = "min-h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none focus:border-blue-500";

export function AdminMaintenanceDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [debounced, setDebounced] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<MaintenanceListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      for (const [key, value] of Object.entries(debounced)) if (value && value !== "all") params[key] = value;
      const [overviewResponse, listResponse] = await Promise.all([
        apiClient.get<ApiEnvelope<Overview>>("/admin/maintenance/overview"),
        apiClient.get<ApiEnvelope<Paginated<MaintenanceListItem>>>("/admin/maintenance/requests", { params }),
      ]);
      setOverview(overviewResponse.data.data);
      setData(listResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [debounced, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (key: keyof Filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">Property Care</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Maintenance Management</h1>
          <p className="mt-1 text-sm text-slate-400">Review requests, dispatch verified technicians, manage quotations and resolve complaints.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm text-slate-200 hover:bg-slate-800">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </header>

      <AdminMaintenanceTabs />

      {error && <ErrorBanner message={error} onRetry={() => void load()} dark />}

      <section aria-label="Maintenance overview" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, tone, filter }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setPage(1); setFilters({ ...EMPTY_FILTERS, ...filter }); }}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Icon className={cn("h-5 w-5", tone)} aria-hidden="true" />
            <p className="mt-2 text-2xl font-bold text-white">{overview ? overview.stats[key] ?? 0 : "–"}</p>
            <p className="text-xs font-semibold text-slate-400">{label}</p>
          </button>
        ))}
      </section>

      {overview && (
        <p className="text-xs text-slate-400">
          Under review {overview.stats.underReview ?? 0} · needs reassignment {overview.stats.needsReassignment ?? 0} · awaiting customer confirmation {overview.stats.awaitingConfirmation ?? 0} · disputed {overview.stats.disputed ?? 0} · technicians active {overview.technicians.active} / available {overview.technicians.available}
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <button type="button" aria-expanded={filtersOpen} aria-controls="maintenance-filters" onClick={() => setFiltersOpen((open) => !open)} className="flex min-h-10 w-full items-center justify-between rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 sm:hidden">
          <span>Search &amp; filters{Object.entries(filters).some(([key, value]) => value && value !== EMPTY_FILTERS[key as keyof Filters]) ? " (active)" : ""}</span>
          <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
        </button>
        <div id="maintenance-filters" className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6", !filtersOpen && "hidden sm:grid")}>
          <label className="relative sm:col-span-2">
            <span className="sr-only">Search requests</span>
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={filters.search} onChange={(event) => setFilter("search", event.target.value)} placeholder="Reference, title, customer, phone" className={cn(input, "w-full pl-9")} />
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select value={filters.status} onChange={(event) => setFilter("status", event.target.value)} className={cn(input, "w-full")}>
              <option value="all">All statuses</option>
              {(Object.keys(OPS_STATUS_LABELS) as MaintenanceStatus[]).map((status) => <option key={status} value={status}>{OPS_STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Category</span>
            <select value={filters.category} onChange={(event) => setFilter("category", event.target.value)} className={cn(input, "w-full")}>
              <option value="all">All categories</option>
              {MAINTENANCE_CATEGORIES.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="sr-only">Location</span>
            <input value={filters.location} onChange={(event) => setFilter("location", event.target.value)} placeholder="Area or city" className={cn(input, "w-full")} />
          </label>
          <label className="text-xs text-slate-400">
            From
            <input type="date" value={filters.from} onChange={(event) => setFilter("from", event.target.value)} className={cn(input, "mt-1 w-full")} />
          </label>
          <label className="text-xs text-slate-400">
            To
            <input type="date" value={filters.to} onChange={(event) => setFilter("to", event.target.value)} className={cn(input, "mt-1 w-full")} />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-300">
            <input type="checkbox" checked={filters.openComplaints === "true"} onChange={(event) => setFilter("openComplaints", event.target.checked ? "true" : "")} className="h-4 w-4 accent-rose-500" />
            Open complaints only
          </label>
          <div className="flex items-end">
            <button type="button" onClick={() => { setPage(1); setFilters(EMPTY_FILTERS); }} className="min-h-10 w-full rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:bg-slate-800">Clear filters</button>
          </div>
        </div>
        <p className="text-xs text-slate-400">{data ? `${data.total} request(s)` : "Loading…"}</p>
      </section>

      {loading && !data ? (
        <LoadingState label="Loading maintenance requests…" dark />
      ) : !data?.items.length ? (
        <EmptyState dark icon={<ClipboardList className="h-5 w-5" />} title="No requests match these filters" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Customer / Location</th>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Visit</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.items.map((item) => (
                  <tr key={item.id} onClick={() => router.push(`/admin/maintenance/requests/${item.id}`)} className="cursor-pointer hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/maintenance/requests/${item.id}`} className="font-semibold text-white hover:underline" onClick={(event) => event.stopPropagation()}>{item.title}</Link>
                      <p className="font-mono text-xs text-slate-500">{item.reference}</p>
                      <p className="text-xs text-slate-400">{item.categoryLabel} · {formatDate(item.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{item.customerName}<p className="text-xs text-slate-500">{item.area}, {item.city}</p></td>
                    <td className="px-4 py-3 text-slate-300">{item.technician?.name ?? <span className="text-slate-500">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{item.scheduledVisitAt ? formatDate(item.scheduledVisitAt, true) : item.preferredVisitDate ? `Pref. ${formatDate(item.preferredVisitDate)}` : "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} dark ops />
                      {item.hasOpenComplaint && <p className="mt-1 text-[11px] font-semibold text-rose-300">Open complaint</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/maintenance/requests/${item.id}`} className="block rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500">{item.reference}</p>
                      <p className="truncate font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.categoryLabel} · {item.area}</p>
                    </div>
                    <StatusBadge status={item.status} dark ops />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{item.customerName} · {item.technician?.name ?? "Unassigned"}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-slate-300">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-slate-700 px-4 disabled:opacity-40">Previous</button>
          <span>Page {page} of {data.totalPages}</span>
          <button type="button" disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-slate-700 px-4 disabled:opacity-40">Next</button>
        </nav>
      )}
    </div>
  );
}
