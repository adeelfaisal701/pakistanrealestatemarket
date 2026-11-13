"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertOctagon, CheckCircle2, MessageSquareWarning, Scale } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/maintenance";
import { useAdminRequestDetails } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { AdminMaintenanceRequest, MaintenanceComplaint } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, StatusBadge, SuccessBanner } from "@/components/maintenance/MaintenanceShared";
import { OpsPageHeader, OpsStat } from "./OpsShell";

const input = "min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500";
type Row = { complaint: MaintenanceComplaint; request: AdminMaintenanceRequest };

const TONES: Record<string, string> = {
  open: "bg-rose-500/15 text-rose-300",
  in_review: "bg-amber-500/15 text-amber-300",
  resolved: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-slate-500/15 text-slate-300",
};

export function OpsComplaints() {
  const result = useAdminRequestDetails({}, "complaints", (item) => item.hasOpenComplaint || item.status === "disputed" || item.status === "completed");
  const [tab, setTab] = useState<"open" | "disputed" | "resolved">("open");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [edit, setEdit] = useState({ status: "in_review", resolutionNote: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const details = result.data?.details ?? [];
  const rows: Row[] = details.flatMap((request) => request.complaints.map((complaint) => ({ complaint, request })));
  const open = rows.filter((row) => row.complaint.status === "open" || row.complaint.status === "in_review");
  const resolved = rows.filter((row) => row.complaint.status === "resolved" || row.complaint.status === "closed");
  const disputed = details.filter((request) => request.status === "disputed");
  const visible = tab === "open" ? open : tab === "resolved" ? resolved : [];
  const selected = rows.find((row) => `${row.request.id}:${row.complaint.id}` === selectedKey) ?? null;

  const submit = async () => {
    if (!selected) return;
    if ((edit.status === "resolved" || edit.status === "closed") && !edit.resolutionNote.trim()) {
      setError("A resolution note is required to resolve or close a complaint.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.patch(`/admin/maintenance/requests/${encodeURIComponent(selected.request.id)}/complaints/${encodeURIComponent(selected.complaint.id)}`, {
        status: edit.status,
        resolutionNote: edit.resolutionNote.trim() || undefined,
      });
      setNotice("Complaint updated. The customer has been notified.");
      setSelectedKey(null);
      result.reload();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <OpsPageHeader title="Complaints" description="Investigate customer complaints and disputed jobs, then record a resolution." />
      {notice && <div className="mb-4"><SuccessBanner message={notice} dark /></div>}
      {result.error && <div className="mb-4"><ErrorBanner message={result.error} onRetry={result.reload} dark /></div>}

      <section className="mb-4 grid grid-cols-3 gap-3">
        <OpsStat label="Open" value={result.data ? open.length : "–"} icon={<MessageSquareWarning className="h-5 w-5" />} tone="text-rose-300" />
        <OpsStat label="Disputed jobs" value={result.data ? disputed.length : "–"} icon={<Scale className="h-5 w-5" />} tone="text-amber-300" />
        <OpsStat label="Resolved" value={result.data ? resolved.length : "–"} icon={<CheckCircle2 className="h-5 w-5" />} tone="text-emerald-300" />
      </section>

      <div role="tablist" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1 sm:max-w-md">
        {(["open", "disputed", "resolved"] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setSelectedKey(null); }} className={cn("min-h-10 rounded-lg text-xs font-bold capitalize", tab === key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}>
            {key === "resolved" ? "History" : key}
          </button>
        ))}
      </div>

      {result.loading && !result.data ? <LoadingState label="Loading complaints…" dark /> : tab === "disputed" ? (
        !disputed.length ? <EmptyState dark icon={<Scale className="h-5 w-5" />} title="No disputed jobs" /> : (
          <ul className="space-y-2">
            {disputed.map((request) => (
              <li key={request.id}>
                <Link href={`/care-ops/requests/${request.id}`} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0e1b33] p-4 hover:border-white/15">
                  <AlertOctagon className="h-5 w-5 shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{request.title}</span>
                    <span className="block text-xs text-slate-500">{request.reference} · {request.customer?.name} · technician {request.technician?.name ?? "—"}</span>
                  </span>
                  <StatusBadge status={request.status} dark ops />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : !visible.length ? (
        <EmptyState dark icon={<CheckCircle2 className="h-5 w-5" />} title={tab === "open" ? "No open complaints" : "No resolved complaints yet"} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <ul className={cn("space-y-2", selected && "hidden lg:block")}>
            {visible.map((row) => {
              const key = `${row.request.id}:${row.complaint.id}`;
              return (
                <li key={key}>
                  <button type="button" onClick={() => { setSelectedKey(key); setEdit({ status: row.complaint.status === "open" ? "in_review" : row.complaint.status, resolutionNote: row.complaint.resolutionNote ?? "" }); setError(null); }} aria-pressed={selectedKey === key}
                    className={cn("w-full rounded-2xl border p-4 text-left transition", selectedKey === key ? "border-blue-500 bg-blue-600/10" : "border-white/5 bg-[#0e1b33] hover:border-white/15")}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{row.complaint.subject}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", TONES[row.complaint.status])}>{row.complaint.status.replace("_", " ")}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{row.complaint.description}</p>
                    <p className="mt-2 text-[11px] text-slate-500">{row.request.reference} · {row.request.customer?.name ?? row.request.contact.name} · {formatDate(row.complaint.createdAt)}</p>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <section className="space-y-4 rounded-2xl border border-white/5 bg-[#0e1b33] p-4 lg:sticky lg:top-20 lg:self-start">
              <button type="button" onClick={() => setSelectedKey(null)} className="text-xs font-semibold text-slate-400 hover:text-white lg:hidden">← Back to complaints</button>
              <div>
                <p className="text-xs text-slate-500">{selected.request.reference}</p>
                <h2 className="text-base font-bold text-white">{selected.complaint.subject}</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{selected.complaint.description}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white/[0.03] p-2.5"><dt className="text-slate-500">Customer</dt><dd className="font-semibold text-white">{selected.request.customer?.name ?? selected.request.contact.name}</dd></div>
                <div className="rounded-xl bg-white/[0.03] p-2.5"><dt className="text-slate-500">Technician</dt><dd className="font-semibold text-white">{selected.request.technician?.name ?? "—"}</dd></div>
                <div className="rounded-xl bg-white/[0.03] p-2.5"><dt className="text-slate-500">Job status</dt><dd><StatusBadge status={selected.request.status} dark ops /></dd></div>
                <div className="rounded-xl bg-white/[0.03] p-2.5"><dt className="text-slate-500">Raised</dt><dd className="font-semibold text-white">{formatDate(selected.complaint.createdAt, true)}</dd></div>
              </dl>
              {selected.request.workNotes.filter((note) => note.internal).length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold text-slate-400">Internal notes</p>
                  <ul className="space-y-1.5">
                    {selected.request.workNotes.filter((note) => note.internal).slice(-3).map((note) => (
                      <li key={note.id} className="rounded-lg bg-white/[0.03] p-2 text-xs text-slate-300">{note.note}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.complaint.status === "resolved" || selected.complaint.status === "closed" ? (
                <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">Resolution: {selected.complaint.resolutionNote}</p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400">Update status
                    <select value={edit.status} onChange={(event) => setEdit((current) => ({ ...current, status: event.target.value }))} className={cn(input, "mt-1")}>
                      <option value="in_review">In review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-400">Resolution note (shared with the customer)
                    <textarea value={edit.resolutionNote} onChange={(event) => setEdit((current) => ({ ...current, resolutionNote: event.target.value }))} rows={3} maxLength={1500} className={cn(input, "mt-1 py-2")} />
                  </label>
                  {error && <ErrorBanner message={error} dark />}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void submit()} disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">Save resolution</button>
                    <Link href={`/care-ops/requests/${selected.request.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5">Open job</Link>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
