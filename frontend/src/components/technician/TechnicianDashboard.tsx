"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, ClipboardList, MapPin, Sparkles } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { formatDate } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { Paginated, TechnicianJob } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, StatusBadge } from "@/components/maintenance/MaintenanceShared";
import { ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";

const ACTIVE_BUCKETS = [
  { key: "new", label: "New", empty: "No new assignments right now.", hint: "Accept or reject promptly." },
  { key: "accepted", label: "Accepted", empty: "No accepted jobs waiting for a visit.", hint: "Head out when it's time." },
  { key: "in_progress", label: "In progress", empty: "No jobs on the way or in progress.", hint: "Finish and submit for verification." },
] as const;

const HISTORY_BUCKETS = [
  { key: "completed", label: "Completed", empty: "Completed jobs will appear here.", hint: "Submitted and confirmed jobs." },
  { key: "rejected", label: "Rejected / reassigned", empty: "No rejected or reassigned jobs.", hint: "Customer details are hidden for these jobs." },
] as const;

type Bucket = (typeof ACTIVE_BUCKETS)[number]["key"] | (typeof HISTORY_BUCKETS)[number]["key"];

export function TechnicianDashboard({ mode = "active" }: { mode?: "active" | "history" }) {
  const buckets = mode === "active" ? ACTIVE_BUCKETS : HISTORY_BUCKETS;
  const [bucket, setBucket] = useState<Bucket>(buckets[0].key);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Paginated<TechnicianJob> & { counts: Record<string, number> }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ApiEnvelope<Paginated<TechnicianJob> & { counts: Record<string, number> }>>(
        "/maintenance/technician/jobs",
        { params: { bucket, page, limit: 20 } },
      );
      setData(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [bucket, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = buckets.find((item) => item.key === bucket) ?? buckets[0];
  const newCount = data?.counts?.new ?? 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1660d0]">{mode === "active" ? "Today" : "Job history"}</p>
        <h1 className="mt-1 text-[26px] font-black tracking-[-0.03em]">{mode === "active" ? "My jobs" : "Past jobs"}</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          {mode === "active" ? "Jobs dispatched to you by Ghar Safar operations." : "Completed, rejected and reassigned jobs."}
        </p>
      </header>

      {mode === "active" && newCount > 0 && bucket !== "new" && (
        <button type="button" onClick={() => { setBucket("new"); setPage(1); }} className="flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-[#1660d0] to-[#0b2c5f] p-4 text-left text-white shadow-[0_12px_28px_rgba(22,96,208,0.3)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Sparkles className="h-5 w-5" /></span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">{newCount} new assignment{newCount > 1 ? "s" : ""}</span>
            <span className="block text-xs text-slate-300">Review and accept or reject</span>
          </span>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div role="tablist" aria-label="Job buckets" className={cn("grid gap-2", buckets.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {buckets.map((item) => {
          const selected = bucket === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => { setBucket(item.key); setPage(1); }}
              className={cn(
                "rounded-3xl border-2 p-3 text-left transition sm:p-4",
                selected ? "border-[#1660d0] bg-white shadow-[0_8px_20px_rgba(22,96,208,0.12)]" : "border-transparent bg-white/70 hover:bg-white",
              )}
            >
              <span className={cn("block text-2xl font-black", selected ? "text-[#1660d0]" : "text-[#0f2747]")}>{data?.counts?.[item.key] ?? "–"}</span>
              <span className="block text-xs font-bold text-[#64748b]">{item.label}</span>
            </button>
          );
        })}
      </div>
      <p className="-mt-2 text-xs text-[#7a8594]">{active.hint}</p>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {loading && !data ? (
        <LoadingState label="Loading jobs…" />
      ) : !data?.items.length ? (
        <EmptyState icon={<ClipboardList className="h-5 w-5" />} title={active.empty} />
      ) : (
        <ul className="space-y-3">
          {data.items.map((job) => {
            const visit = job.scheduledVisitAt ?? job.myAssignment?.scheduledVisitAt;
            const isNew = job.status === "awaiting_technician_acceptance";
            return (
              <li key={job.id}>
                <Link
                  href={`/technician/jobs/${job.id}`}
                  className={cn(
                    pc.card,
                    "group block p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,39,71,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1660d0]",
                    isNew && "border-[#8fb8f0] ring-1 ring-[#cfe0fb]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2fe] text-[#1660d0]">
                      <ServiceIcon category={job.category} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-[15px] font-extrabold">{job.title}</h2>
                          <p className="text-xs text-[#7a8594]">{job.categoryLabel} · <span className="font-mono">{job.reference}</span></p>
                        </div>
                        {job.status ? (
                          <StatusBadge status={job.status} ops />
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-600">{job.myAssignment?.status ?? "closed"}</span>
                        )}
                      </div>
                      <div className="mt-3 grid gap-1.5 text-[13px] text-[#334155]">
                        <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#1660d0]" aria-hidden="true" />{job.area}, {job.city}</span>
                        {visit && <span className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-[#1660d0]" aria-hidden="true" />{formatDate(visit, true)}</span>}
                        {job.myAssignment?.rejectionReason && <span className="text-xs text-rose-600">You rejected: {job.myAssignment.rejectionReason}</span>}
                      </div>
                      {isNew && (
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#1660d0]">Review & respond <ChevronRight className="h-3.5 w-3.5" /></span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-2 text-sm font-semibold text-[#334155]">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={cn(pc.secondaryBtn, "min-h-10 px-4 disabled:opacity-40")}>Previous</button>
          <span>Page {page} of {data.totalPages}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)} className={cn(pc.secondaryBtn, "min-h-10 px-4 disabled:opacity-40")}>Next</button>
        </nav>
      )}
    </div>
  );
}
