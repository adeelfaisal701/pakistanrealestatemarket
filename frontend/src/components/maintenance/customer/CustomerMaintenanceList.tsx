"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, MapPin, Plus, ShieldCheck, Wrench } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { CUSTOMER_PROGRESS_STEPS, formatDate, progressIndex, timeSlotLabel } from "@/lib/maintenance";
import { PROPERTY_CARE_SERVICES, requestServiceHref } from "@/lib/property-care-services";
import { cn } from "@/lib/utils";
import type { MaintenanceListItem, MaintenanceStatus, Paginated } from "@/types/maintenance";
import { PcPageHeader, PropertyCareSurface, ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";
import { EmptyState, ErrorBanner, LoadingState, NotificationsPanel, StatusBadge } from "../MaintenanceShared";

const SCOPES = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

/** Short, customer-friendly "what happens next" line for each status. */
const NEXT_STEP: Partial<Record<MaintenanceStatus, string>> = {
  pending: "Our team will review your request shortly.",
  under_review: "We're reviewing your request and finding a technician.",
  assigned: "A technician is being confirmed for your visit.",
  awaiting_technician_acceptance: "A technician is being confirmed for your visit.",
  rejected: "We're arranging a different technician.",
  rescheduling: "We're arranging a new technician or time.",
  accepted: "Your technician has confirmed the visit.",
  on_the_way: "Your technician is on the way.",
  in_progress: "Work is in progress.",
  awaiting_customer_confirmation: "Please review the work and confirm completion.",
  disputed: "Our team is reviewing your complaint.",
};

export function CustomerMaintenanceList() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("active");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<MaintenanceListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ApiEnvelope<Paginated<MaintenanceListItem>>>("/maintenance/requests", {
        params: { scope, page, limit: 10 },
      });
      setData(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [scope, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PropertyCareSurface>
      <div className="space-y-6">
        <PcPageHeader
          eyebrow="Property Care"
          title="My service requests"
          description="Track every request from review to completion. Ghar Safar assigns a verified technician for you."
          action={
            <Link href="/buyer/maintenance/new" className={cn(pc.primaryBtn, "hidden sm:inline-flex")}>
              <Plus className="h-4 w-4" /> New request
            </Link>
          }
        />

        <section aria-label="Request a service" className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d57ad] to-[#0b2545] p-5 text-white shadow-[0_14px_30px_rgba(13,87,173,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em]">Need something fixed?</h2>
              <p className="mt-1 text-sm text-blue-100">Pick a service to start a request.</p>
            </div>
            <ShieldCheck className="h-8 w-8 shrink-0 text-[#9ccaff]" aria-hidden="true" />
          </div>
          <ul className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {PROPERTY_CARE_SERVICES.map((service) => (
              <li key={service.key} className="shrink-0">
                <Link href={requestServiceHref(service.key)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-white/12 px-3.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/20">
                  <ServiceIcon category={service.key} className="h-4 w-4 text-[#9ccaff]" />
                  {service.shortTitle}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/buyer/maintenance/new" className={cn(pc.primaryBtn, "mt-4 w-full bg-white text-[#0d57ad] shadow-none hover:bg-[#eef5ff] sm:hidden")}>
            <Plus className="h-4 w-4" /> New request
          </Link>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <div role="tablist" aria-label="Filter requests" className="grid grid-cols-4 gap-1 rounded-2xl bg-[#e6eef8] p-1">
              {SCOPES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={scope === item.key}
                  onClick={() => { setScope(item.key); setPage(1); }}
                  className={cn(
                    "min-h-10 rounded-xl px-2 text-[13px] font-bold transition",
                    scope === item.key ? "bg-white text-[#0d57ad] shadow-sm" : "text-[#5b6b82] hover:text-[#102b55]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {error && <ErrorBanner message={error} onRetry={() => void load()} />}
            {loading && !data ? (
              <LoadingState label="Loading your requests…" />
            ) : !data?.items.length ? (
              <EmptyState
                icon={<Wrench className="h-5 w-5" />}
                title={scope === "active" ? "No active requests" : "Nothing here yet"}
                description="When you submit a maintenance request it will appear here with live status updates."
                action={<Link href="/buyer/maintenance/new" className={pc.primaryBtn}>Request a service</Link>}
              />
            ) : (
              <ul className="space-y-3">
                {data.items.map((item) => {
                  const step = progressIndex(item.status);
                  const total = CUSTOMER_PROGRESS_STEPS.length;
                  const percent = item.status === "completed" ? 100 : item.status === "cancelled" ? 0 : Math.round(((step + 1) / total) * 100);
                  const needsAction = item.quotationStatus === "sent" || item.status === "awaiting_customer_confirmation";
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/buyer/maintenance/${item.id}`}
                        className={cn(
                          pc.card,
                          "group block p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,43,85,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d57ad] sm:p-5",
                          needsAction && "border-amber-300 ring-1 ring-amber-200",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf5ff] text-[#0d57ad]">
                            <ServiceIcon category={item.category} className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h2 className="truncate text-[15px] font-extrabold text-[#102b55]">{item.title}</h2>
                                <p className="mt-0.5 text-xs text-[#6b7a90]">{item.categoryLabel} · <span className="font-mono">{item.reference}</span></p>
                              </div>
                              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#a9b8cc] transition group-hover:translate-x-0.5 group-hover:text-[#0d57ad]" aria-hidden="true" />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <StatusBadge status={item.status} />
                              {item.quotationStatus === "sent" && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">Quotation needs approval</span>
                              )}
                            </div>
                            {item.status !== "cancelled" && (
                              <div className="mt-3">
                                <div className="h-1.5 overflow-hidden rounded-full bg-[#e6eef8]" aria-hidden="true">
                                  <div className={cn("h-full rounded-full", item.status === "completed" ? "bg-emerald-500" : "bg-[#0d57ad]")} style={{ width: `${percent}%` }} />
                                </div>
                                {NEXT_STEP[item.status] && <p className="mt-2 text-[13px] text-[#36506f]">{NEXT_STEP[item.status]}</p>}
                              </div>
                            )}
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b7a90]">
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{item.area}, {item.city}</span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                                {item.scheduledVisitAt
                                  ? `Visit ${formatDate(item.scheduledVisitAt, true)}`
                                  : item.preferredVisitDate
                                    ? `Preferred ${formatDate(item.preferredVisitDate)} · ${timeSlotLabel(item.preferredTimeSlot)}`
                                    : `Submitted ${formatDate(item.createdAt)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {data && data.totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-between gap-2 text-sm font-semibold text-[#36506f]">
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className={cn(pc.secondaryBtn, "min-h-10 px-4 disabled:opacity-40")}>Previous</button>
                <span>Page {page} of {data.totalPages}</span>
                <button type="button" disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)} className={cn(pc.secondaryBtn, "min-h-10 px-4 disabled:opacity-40")}>Next</button>
              </nav>
            )}
          </div>

          <aside className="space-y-4">
            <NotificationsPanel />
            <div className={cn(pc.card, "p-5")}>
              <h2 className="text-[15px] font-extrabold text-[#102b55]">How Property Care works</h2>
              <ol className="mt-3 space-y-3">
                {[
                  "You submit a request with photos.",
                  "We review it and assign a verified technician.",
                  "You approve the quotation before chargeable work.",
                  "The technician completes the job with photo proof.",
                  "You confirm completion and rate the service.",
                ].map((text, index) => (
                  <li key={text} className="flex gap-3 text-sm text-[#36506f]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf5ff] text-xs font-bold text-[#0d57ad]">{index + 1}</span>
                    {text}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </PropertyCareSurface>
  );
}
