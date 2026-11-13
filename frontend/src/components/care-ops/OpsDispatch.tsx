"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, Route, UserCog } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { formatDate, timeSlotLabel } from "@/lib/maintenance";
import { useAdminRequests } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { MaintenanceListItem, TechnicianSummary } from "@/types/maintenance";
import { ConfirmDialog, EmptyState, ErrorBanner, LoadingState, StatusBadge, SuccessBanner } from "@/components/maintenance/MaintenanceShared";
import { ServiceIcon } from "@/components/property-care/PropertyCareUI";
import { OpsPageHeader } from "./OpsShell";

const input = "min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500";

const QUEUES = [
  { key: "pending", label: "Needs review", statuses: ["pending"] },
  { key: "ready", label: "Ready to dispatch", statuses: ["under_review"] },
  { key: "reassign", label: "Needs reassignment", statuses: ["rejected", "rescheduling"] },
] as const;

function toLocalInput(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function defaultVisit(item: MaintenanceListItem) {
  const base = item.preferredVisitDate ? new Date(item.preferredVisitDate) : new Date(Date.now() + 24 * 3600 * 1000);
  if (base.getTime() < Date.now()) base.setTime(Date.now() + 24 * 3600 * 1000);
  base.setHours(item.preferredTimeSlot === "afternoon" ? 13 : item.preferredTimeSlot === "evening" ? 17 : 10, 0, 0, 0);
  return toLocalInput(base);
}

export function OpsDispatch() {
  const list = useAdminRequests({ page: 1, limit: 100 }, "dispatch-queue");
  const [queue, setQueue] = useState<(typeof QUEUES)[number]["key"]>("ready");
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("request"));
  const [eligible, setEligible] = useState<TechnicianSummary[] | null>(null);
  const [eligibleError, setEligibleError] = useState<string | null>(null);
  const [form, setForm] = useState({ technicianId: "", scheduledVisitAt: "", notes: "" });
  const [confirm, setConfirm] = useState<null | "assign" | "review">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const items = list.data?.items ?? [];
  const counts = useMemo(
    () => Object.fromEntries(QUEUES.map((q) => [q.key, items.filter((item) => (q.statuses as readonly string[]).includes(item.status)).length])),
    [items],
  );
  const queueItems = items.filter((item) => (QUEUES.find((q) => q.key === queue)!.statuses as readonly string[]).includes(item.status));
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const replacing = Boolean(selected?.technician);

  useEffect(() => {
    if (!selected || selected.status === "pending") {
      setEligible(null);
      return;
    }
    let active = true;
    setEligible(null);
    setEligibleError(null);
    setForm({ technicianId: "", scheduledVisitAt: defaultVisit(selected), notes: "" });
    apiClient
      .get<ApiEnvelope<TechnicianSummary[]>>(`/admin/maintenance/requests/${encodeURIComponent(selected.id)}/eligible-technicians`)
      .then(({ data }) => { if (active) setEligible(data.data); })
      .catch((requestError) => { if (active) setEligibleError(getApiErrorMessage(requestError)); });
    return () => {
      active = false;
    };
  }, [selected]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setConfirm(null);
      setNotice(message);
      setSelectedId(null);
      list.reload();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const chosen = eligible?.find((tech) => tech.id === form.technicianId);

  return (
    <div>
      <OpsPageHeader title="Dispatch" description="Review incoming requests, compare eligible technicians and assign visits. Customers never choose technicians." />
      {notice && <div className="mb-4"><SuccessBanner message={notice} dark /></div>}
      {list.error && <div className="mb-4"><ErrorBanner message={list.error} onRetry={list.reload} dark /></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Dispatch queue" className={cn(selected && "hidden lg:block")}>
          <div role="tablist" className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1">
            {QUEUES.map((q) => (
              <button key={q.key} type="button" role="tab" aria-selected={queue === q.key} onClick={() => setQueue(q.key)} className={cn("min-h-11 rounded-lg px-1 text-[11px] font-bold leading-tight transition", queue === q.key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}>
                {q.label}
                <span className="block text-[13px] tabular-nums">{counts[q.key] ?? 0}</span>
              </button>
            ))}
          </div>
          {list.loading && !list.data ? (
            <LoadingState label="Loading queue…" dark />
          ) : !queueItems.length ? (
            <EmptyState dark icon={<CheckCircle2 className="h-5 w-5" />} title="Queue is clear" description="No requests are waiting in this queue." />
          ) : (
            <ul className="space-y-2">
              {queueItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedId(item.id); setNotice(null); setError(null); }}
                    aria-pressed={selectedId === item.id}
                    className={cn("w-full rounded-2xl border p-3.5 text-left transition", selectedId === item.id ? "border-blue-500 bg-blue-600/10" : "border-white/5 bg-[#0e1b33] hover:border-white/15")}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ServiceIcon category={item.category} className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                        <span className="block text-xs text-slate-500">{item.reference} · {item.categoryLabel}</span>
                        <span className="mt-1.5 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" />{item.area}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><CalendarClock className="h-3.5 w-3.5" />{item.preferredVisitDate ? formatDate(item.preferredVisitDate) : "Flexible"} · {timeSlotLabel(item.preferredTimeSlot)}</span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Dispatch workspace" className={cn(!selected && "hidden lg:block")}>
          {!selected ? (
            <EmptyState dark icon={<Route className="h-5 w-5" />} title="Select a request" description="Choose a request from the queue to compare eligible technicians and schedule a visit." />
          ) : (
            <div className="space-y-4">
              <button type="button" onClick={() => setSelectedId(null)} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white lg:hidden">
                <ArrowLeft className="h-4 w-4" /> Back to queue
              </button>
              <div className="rounded-2xl border border-white/5 bg-[#0e1b33] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{selected.reference} · {selected.categoryLabel}</p>
                    <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">{selected.customerName} · {selected.area}, {selected.city}</p>
                  </div>
                  <StatusBadge status={selected.status} dark ops />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/care-ops/requests/${selected.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-200 hover:bg-white/5">Open full request</Link>
                  {selected.technician && <span className="inline-flex min-h-9 items-center rounded-lg bg-amber-500/10 px-3 text-xs font-semibold text-amber-200">Current: {selected.technician.name}</span>}
                </div>
              </div>

              {error && !confirm && <ErrorBanner message={error} dark />}

              {selected.status === "pending" ? (
                <div className="rounded-2xl border border-white/5 bg-[#0e1b33] p-5">
                  <h3 className="text-sm font-bold text-white">Review before dispatch</h3>
                  <p className="mt-1 text-sm text-slate-400">Check the request details and photos, then move it under review to unlock technician assignment.</p>
                  <button type="button" onClick={() => { setError(null); setConfirm("review"); }} className="mt-4 min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">Move to under review</button>
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!form.technicianId) return setError("Select a technician.");
                    if (!form.scheduledVisitAt || new Date(form.scheduledVisitAt).getTime() < Date.now() - 15 * 60 * 1000) return setError("Choose a future visit date and time.");
                    setError(null);
                    setConfirm("assign");
                  }}
                  className="space-y-4"
                >
                  <fieldset className="rounded-2xl border border-white/5 bg-[#0e1b33] p-4">
                    <legend className="float-left mb-1 w-full text-sm font-bold text-white">Eligible technicians</legend>
                    <p className="clear-both mb-3 text-xs text-slate-500">Active, available and registered for {selected.categoryLabel}. Area matches first, then lightest workload.</p>
                    {eligibleError && <ErrorBanner message={eligibleError} dark />}
                    {eligible === null && !eligibleError ? (
                      <LoadingState label="Finding technicians…" dark />
                    ) : eligible && !eligible.length ? (
                      <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">No eligible technicians right now. Update availability or add technicians for this category.</p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                        {eligible?.map((tech) => (
                          <li key={tech.id}>
                            <label className={cn("flex h-full cursor-pointer gap-3 rounded-xl border p-3 transition", form.technicianId === tech.id ? "border-blue-500 bg-blue-600/10" : "border-white/10 hover:border-white/20")}>
                              <input type="radio" name="technician" value={tech.id} checked={form.technicianId === tech.id} onChange={() => setForm((current) => ({ ...current, technicianId: tech.id }))} className="mt-1 accent-blue-500" />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                                  {tech.name}
                                  {tech.areaMatch && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">AREA MATCH</span>}
                                </span>
                                <span className="mt-1 block text-xs text-slate-400">{tech.categoryLabels.join(" · ")}</span>
                                <span className="block truncate text-xs text-slate-500">Areas: {tech.serviceAreas.join(", ") || "—"}</span>
                                <span className="mt-2 flex gap-3 text-[11px] font-semibold">
                                  <span className="text-emerald-300">Available</span>
                                  <span className={tech.activeJobs >= 3 ? "text-amber-300" : "text-slate-300"}>{tech.activeJobs} active job(s)</span>
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </fieldset>

                  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/5 bg-[#0e1b33] p-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-400">Visit date & time
                      <input type="datetime-local" required value={form.scheduledVisitAt} min={toLocalInput(new Date())} onChange={(event) => setForm((current) => ({ ...current, scheduledVisitAt: event.target.value }))} className={cn(input, "mt-1")} />
                      <span className="mt-1 block text-[11px] text-slate-500">Customer prefers {selected.preferredVisitDate ? formatDate(selected.preferredVisitDate) : "a flexible date"} · {timeSlotLabel(selected.preferredTimeSlot)}</span>
                    </label>
                    <label className="text-xs font-semibold text-slate-400">Dispatch instructions (technician only)
                      <textarea value={form.notes} maxLength={1000} rows={3} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Parts to bring, access notes…" className={cn(input, "mt-1 py-2")} />
                    </label>
                  </div>

                  <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-white/10 bg-[#08111f]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
                    <button type="submit" disabled={busy || !eligible?.length} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto">
                      <UserCog className="h-4 w-4" />{replacing ? "Reassign technician" : "Assign technician"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      {confirm === "review" && selected && (
        <ConfirmDialog dark title="Move to under review?" description={`${selected.reference} will be marked as under review and the customer will be notified.`} confirmLabel="Move to review" busy={busy} error={error}
          onClose={() => setConfirm(null)}
          onConfirm={() => void run(() => apiClient.patch(`/admin/maintenance/requests/${encodeURIComponent(selected.id)}/status`, { status: "under_review" }), "Request moved under review.")} />
      )}
      {confirm === "assign" && selected && (
        <ConfirmDialog dark
          title={replacing ? "Reassign this job?" : "Assign technician?"}
          description={`${chosen?.name ?? "The technician"} will be asked to accept the visit on ${formatDate(new Date(form.scheduledVisitAt).toISOString(), true)}.`}
          confirmLabel={replacing ? "Reassign" : "Assign"}
          reasonLabel={replacing ? "Reason for reassignment" : undefined}
          reasonRequired={replacing}
          busy={busy}
          error={error}
          onClose={() => setConfirm(null)}
          onConfirm={(reason) => void run(() => apiClient.post(`/admin/maintenance/requests/${encodeURIComponent(selected.id)}/assign`, {
            technicianId: form.technicianId,
            scheduledVisitAt: new Date(form.scheduledVisitAt).toISOString(),
            notes: form.notes.trim() || undefined,
            reason: reason || undefined,
          }), replacing ? "Job reassigned." : "Technician assigned. Awaiting their acceptance.")}
        />
      )}
    </div>
  );
}
