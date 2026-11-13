"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  FileText,
  History,
  Images,
  Loader2,
  MessageSquareWarning,
  NotebookPen,
  Plus,
  ReceiptText,
  Send,
  Settings2,
  Star,
  Trash2,
  UserCog,
  Wallet,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { OPS_STATUS_LABELS, QUOTATION_LABELS, formatDate, formatMoney, timeSlotLabel } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { AdminMaintenanceRequest, MaintenanceStatus, TechnicianSummary } from "@/types/maintenance";
import {
  ConfirmDialog,
  ErrorBanner,
  ImageGallery,
  LoadingState,
  SectionCard,
  StatusBadge,
  SuccessBanner,
  Timeline,
} from "@/components/maintenance/MaintenanceShared";

const input = "min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";
const label = "block text-xs font-semibold text-slate-400";

function toLocalInput(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

type PendingAction =
  | null
  | { kind: "status"; status: MaintenanceStatus }
  | { kind: "assign" }
  | { kind: "send-quotation" }
  | { kind: "save-quotation"; send: boolean };

export function AdminMaintenanceRequestDetail({ id }: { id: string }) {
  const [request, setRequest] = useState<AdminMaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [eligible, setEligible] = useState<TechnicianSummary[] | null>(null);
  const [eligibleError, setEligibleError] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ technicianId: "", scheduledVisitAt: "", notes: "" });
  const [targetStatus, setTargetStatus] = useState<MaintenanceStatus | "">("");
  const [quote, setQuote] = useState({ inspectionCharge: "0", laborCharge: "0", materialCharge: "0", notes: "", lines: [] as Array<{ label: string; amount: string }> });
  const [payment, setPayment] = useState({ amount: "", method: "cash", reference: "", note: "" });
  const [adminNote, setAdminNote] = useState("");
  const [complaintEdits, setComplaintEdits] = useState<Record<string, { status: string; resolutionNote: string }>>({});

  const endpoint = `/care-ops/requests/${encodeURIComponent(id)}`;

  const hydrate = useCallback((data: AdminMaintenanceRequest) => {
    setRequest(data);
    setTargetStatus("");
    if (data.quotation) {
      setQuote({
        inspectionCharge: String(data.quotation.inspectionCharge),
        laborCharge: String(data.quotation.laborCharge),
        materialCharge: String(data.quotation.materialCharge),
        notes: data.quotation.notes ?? "",
        lines: data.quotation.additionalCharges.map((line) => ({ label: line.label, amount: String(line.amount) })),
      });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<AdminMaintenanceRequest>>(endpoint);
      hydrate(data.data);
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [endpoint, hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadEligible = useCallback(async () => {
    setEligibleError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<TechnicianSummary[]>>(`${endpoint}/eligible-technicians`);
      setEligible(data.data);
    } catch (requestError) {
      setEligibleError(getApiErrorMessage(requestError));
    }
  }, [endpoint]);

  useEffect(() => {
    if (request?.canAssign && eligible === null) void loadEligible();
  }, [request?.canAssign, eligible, loadEligible]);

  useEffect(() => {
    if (!request || assignForm.scheduledVisitAt) return;
    const base = request.preferredVisitDate ? new Date(request.preferredVisitDate) : new Date(Date.now() + 24 * 3600 * 1000);
    if (base.getTime() < Date.now()) base.setTime(Date.now() + 3600 * 1000);
    base.setHours(request.preferredTimeSlot === "afternoon" ? 13 : request.preferredTimeSlot === "evening" ? 17 : 10, 0, 0, 0);
    setAssignForm((current) => ({ ...current, scheduledVisitAt: toLocalInput(base) }));
  }, [request, assignForm.scheduledVisitAt]);

  const run = async (action: () => Promise<{ data: ApiEnvelope<AdminMaintenanceRequest> }>, success: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const { data } = await action();
      hydrate(data.data);
      setPending(null);
      setNotice(success);
      setEligible(null);
      return true;
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const quotationPayload = (send: boolean, revisionReason?: string) => ({
    inspectionCharge: Number(quote.inspectionCharge) || 0,
    laborCharge: Number(quote.laborCharge) || 0,
    materialCharge: Number(quote.materialCharge) || 0,
    additionalCharges: quote.lines
      .filter((line) => line.label.trim())
      .map((line) => ({ label: line.label.trim(), amount: Number(line.amount) || 0 })),
    notes: quote.notes.trim() || undefined,
    send,
    revisionReason: revisionReason || undefined,
  });

  const quoteTotal =
    (Number(quote.inspectionCharge) || 0) +
    (Number(quote.laborCharge) || 0) +
    (Number(quote.materialCharge) || 0) +
    quote.lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  if (loading && !request) return <LoadingState label="Loading request…" dark />;
  if (loadError && !request) {
    return (
      <div className="space-y-4">
        <Link href="/care-ops/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Requests</Link>
        <ErrorBanner message={loadError} onRetry={() => void load()} dark />
      </div>
    );
  }
  if (!request) return null;

  const replacing = Boolean(request.technician);
  const quotationApproved = request.quotation?.status === "approved";
  const paid = request.payments.reduce((sum, item) => sum + item.amount, 0);

  const submitAssign = (event: FormEvent) => {
    event.preventDefault();
    if (!assignForm.technicianId) {
      setActionError("Select a technician to assign.");
      return;
    }
    if (!assignForm.scheduledVisitAt || new Date(assignForm.scheduledVisitAt).getTime() < Date.now() - 15 * 60 * 1000) {
      setActionError("Choose a future visit date and time.");
      return;
    }
    setActionError(null);
    setPending({ kind: "assign" });
  };

  // Rendered at the top on phones/tablets and in the sidebar on wide screens.
  const statusControl = (variant: "mobile" | "desktop") => (
    <SectionCard title="Status control" icon={<Settings2 className="h-4 w-4 text-blue-300" />} dark>
      {request.allowedStatusTargets.length ? (
        <form onSubmit={(event) => { event.preventDefault(); if (targetStatus) { setActionError(null); setPending({ kind: "status", status: targetStatus }); } }} className="space-y-3">
          <label className={label} htmlFor={`status-target-${variant}`}>Move to</label>
          <select id={`status-target-${variant}`} value={targetStatus} onChange={(event) => setTargetStatus(event.target.value as MaintenanceStatus)} className={cn(input, "mt-1")}>
            <option value="">Select a valid next status…</option>
            {request.allowedStatusTargets.map((status) => <option key={status} value={status}>{OPS_STATUS_LABELS[status]}</option>)}
          </select>
          <button type="submit" disabled={!targetStatus || busy} className="min-h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Update status</button>
          <p className="text-[11px] text-slate-500">Only transitions permitted by the workflow are listed. Assignment uses the technician panel.</p>
        </form>
      ) : (
        <p className="text-sm text-slate-400">No manual status changes are available in this state.</p>
      )}
    </SectionCard>
  );

  const jumpLinks = [
    { id: "mr-request", label: "Request" },
    { id: "mr-photos", label: "Photos" },
    ...(request.canAssign ? [{ id: "mr-assign", label: replacing ? "Reassign" : "Assign" }] : []),
    ...(request.assignments.length ? [{ id: "mr-history", label: "Assignments" }] : []),
    { id: "mr-quotation", label: "Quotation" },
    { id: "mr-payments", label: "Payments" },
    ...(request.complaints.length ? [{ id: "mr-complaints", label: `Complaints (${request.complaints.length})` }] : []),
    { id: "mr-audit", label: "Audit trail" },
  ];

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link href="/care-ops/requests" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Requests
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{request.reference}</p>
            <h1 className="text-2xl font-bold text-white">{request.title}</h1>
            <p className="text-sm text-slate-400">{request.categoryLabel} · {request.propertyType} · submitted {formatDate(request.createdAt, true)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={request.status} dark ops className="text-xs" />
            {request.hasOpenComplaint && <span className="text-xs font-semibold text-rose-300">Open complaint</span>}
          </div>
        </div>
      </header>

      {notice && <SuccessBanner message={notice} dark />}
      {actionError && !pending && <ErrorBanner message={actionError} dark />}

      <nav aria-label="Jump to section" className="sticky top-16 z-20 -mx-4 overflow-x-auto border-y border-slate-800 bg-[#08111f]/95 px-4 py-2 backdrop-blur [scrollbar-width:none] sm:-mx-6 sm:px-6 xl:hidden">
        <ul className="flex gap-2">
          {jumpLinks.map((link) => (
            <li key={link.id} className="shrink-0">
              <a href={`#${link.id}`} className="inline-flex min-h-9 items-center rounded-full border border-slate-700 bg-slate-900 px-3.5 text-xs font-semibold text-slate-200 hover:border-blue-500 hover:text-white">{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="xl:hidden">{statusControl("mobile")}</div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <SectionCard id="mr-request" title="Request" icon={<FileText className="h-4 w-4 text-blue-300" />} dark>
            <p className="whitespace-pre-line text-sm text-slate-300">{request.description}</p>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div><dt className={label}>Customer</dt><dd className="text-slate-200">{request.customer?.name ?? request.contact.name}<span className="block text-xs text-slate-400">{request.customer?.email}</span></dd></div>
              <div><dt className={label}>Contact for visit</dt><dd className="text-slate-200">{request.contact.name} · {request.contact.phone}</dd></div>
              <div className="sm:col-span-2"><dt className={label}>Address</dt><dd className="text-slate-200">{request.address.line}, {request.address.area}, {request.address.city}</dd></div>
              <div><dt className={label}>Preferred visit</dt><dd className="text-slate-200">{request.preferredVisitDate ? formatDate(request.preferredVisitDate) : "Flexible"} · {timeSlotLabel(request.preferredTimeSlot)}</dd></div>
              <div><dt className={label}>Scheduled visit</dt><dd className="text-slate-200">{formatDate(request.scheduledVisitAt, true)}</dd></div>
            </dl>
          </SectionCard>

          <SectionCard id="mr-photos" title="Photos" icon={<Images className="h-4 w-4 text-blue-300" />} dark>
            <ImageGallery images={request.images} emptyLabel="No photos uploaded." dark />
          </SectionCard>

          {request.canAssign && (
            <SectionCard id="mr-assign" title={replacing ? "Reassign technician" : "Assign technician"} icon={<UserCog className="h-4 w-4 text-blue-300" />} dark actions={
              <Link href="/care-ops/technicians" className="text-xs font-semibold text-blue-300 hover:underline">Manage technicians</Link>
            }>
              {request.status === "pending" ? (
                <p className="text-sm text-slate-400">Move the request to <strong>Under Review</strong> before assigning a technician.</p>
              ) : (
                <form onSubmit={submitAssign} className="space-y-4">
                  <fieldset>
                    <legend className={label}>Eligible technicians (active, available, {request.categoryLabel})</legend>
                    {eligibleError && <ErrorBanner message={eligibleError} onRetry={() => void loadEligible()} dark />}
                    {eligible === null && !eligibleError ? (
                      <p className="mt-2 text-sm text-slate-400" role="status">Loading technicians…</p>
                    ) : eligible && !eligible.length ? (
                      <p className="mt-2 text-sm text-amber-300">No active, available technicians are registered for this category. Add or update technicians first.</p>
                    ) : (
                      <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                        {eligible?.map((technician) => (
                          <li key={technician.id}>
                            <label className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition",
                              assignForm.technicianId === technician.id ? "border-blue-500 bg-blue-950/40" : "border-slate-800 hover:border-slate-600",
                            )}>
                              <input type="radio" name="technician" value={technician.id} checked={assignForm.technicianId === technician.id} onChange={() => setAssignForm((current) => ({ ...current, technicianId: technician.id }))} className="mt-1 accent-blue-500" />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2 font-semibold text-white">
                                  {technician.name}
                                  {technician.areaMatch && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">AREA MATCH</span>}
                                </span>
                                <span className="block text-xs text-slate-400">{technician.phone} · {technician.activeJobs} active job(s)</span>
                                <span className="block truncate text-xs text-slate-500">{technician.serviceAreas.join(", ") || "No service areas"}{technician.skills.length ? ` · ${technician.skills.join(", ")}` : ""}</span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </fieldset>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={label}>
                      Scheduled visit
                      <input type="datetime-local" required value={assignForm.scheduledVisitAt} min={toLocalInput(new Date())} onChange={(event) => setAssignForm((current) => ({ ...current, scheduledVisitAt: event.target.value }))} className={cn(input, "mt-1")} />
                    </label>
                    <label className={label}>
                      Internal dispatch notes (visible to the technician, not the customer)
                      <input value={assignForm.notes} maxLength={1000} onChange={(event) => setAssignForm((current) => ({ ...current, notes: event.target.value }))} className={cn(input, "mt-1")} />
                    </label>
                  </div>
                  <button type="submit" disabled={busy || !eligible?.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    <UserCog className="h-4 w-4" />{replacing ? "Reassign technician" : "Assign technician"}
                  </button>
                </form>
              )}
            </SectionCard>
          )}

          {request.assignments.length > 0 && (
            <SectionCard id="mr-history" title="Assignment history" icon={<History className="h-4 w-4 text-blue-300" />} dark>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead><tr className="border-b border-slate-800 text-xs uppercase text-slate-400"><th className="py-2 pr-3">Technician</th><th className="py-2 pr-3">Assigned</th><th className="py-2 pr-3">Visit</th><th className="py-2 pr-3">Outcome</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {[...request.assignments].reverse().map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="py-2 pr-3"><Link href={`/care-ops/technicians/${assignment.technician.id}`} className="font-semibold text-white hover:underline">{assignment.technician.name}</Link>{assignment.notes && <p className="text-xs text-slate-500">Note: {assignment.notes}</p>}</td>
                        <td className="py-2 pr-3 text-xs text-slate-300">{formatDate(assignment.assignedAt, true)}</td>
                        <td className="py-2 pr-3 text-xs text-slate-300">{formatDate(assignment.scheduledVisitAt, true)}</td>
                        <td className="py-2 pr-3 text-xs">
                          <span className="font-semibold capitalize text-slate-200">{assignment.status}</span>
                          {assignment.respondedAt && <span className="block text-slate-500">{formatDate(assignment.respondedAt, true)}</span>}
                          {assignment.rejectionReason && <span className="block text-rose-300">{assignment.rejectionReason}</span>}
                          {assignment.withdrawnReason && <span className="block text-amber-300">{assignment.withdrawnReason}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          <SectionCard id="mr-quotation" title="Quotation" icon={<ReceiptText className="h-4 w-4 text-blue-300" />} dark actions={
            request.quotation && <span className="text-xs text-slate-400">v{request.quotation.version} · {QUOTATION_LABELS[request.quotation.status]}</span>
          }>
            {request.quotation?.customerNote && <p className="mb-3 rounded-lg bg-slate-800 p-2 text-sm text-slate-300">Customer note: {request.quotation.customerNote}</p>}
            {request.canEditQuotation ? (
              <form onSubmit={(event) => { event.preventDefault(); setActionError(null); setPending({ kind: "save-quotation", send: false }); }} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {([["inspectionCharge", "Inspection"], ["laborCharge", "Labour"], ["materialCharge", "Materials"]] as const).map(([key, text]) => (
                    <label key={key} className={label}>
                      {text} (PKR)
                      <input type="number" min="0" step="1" value={quote[key]} onChange={(event) => setQuote((current) => ({ ...current, [key]: event.target.value }))} className={cn(input, "mt-1")} />
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className={label}>Additional approved charges</p>
                  {quote.lines.map((line, index) => (
                    <div key={index} className="flex gap-2">
                      <label className="sr-only" htmlFor={`line-label-${index}`}>Charge label</label>
                      <input id={`line-label-${index}`} value={line.label} maxLength={120} placeholder="Label" onChange={(event) => setQuote((current) => ({ ...current, lines: current.lines.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)) }))} className={input} />
                      <label className="sr-only" htmlFor={`line-amount-${index}`}>Charge amount</label>
                      <input id={`line-amount-${index}`} type="number" min="0" value={line.amount} placeholder="Amount" onChange={(event) => setQuote((current) => ({ ...current, lines: current.lines.map((item, i) => (i === index ? { ...item, amount: event.target.value } : item)) }))} className={cn(input, "max-w-36")} />
                      <button type="button" aria-label="Remove charge" onClick={() => setQuote((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) }))} className="rounded-lg border border-slate-700 px-2 text-slate-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {quote.lines.length < 15 && (
                    <button type="button" onClick={() => setQuote((current) => ({ ...current, lines: [...current.lines, { label: "", amount: "" }] }))} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-300 hover:underline"><Plus className="h-3.5 w-3.5" />Add charge</button>
                  )}
                </div>
                <label className={label}>
                  Notes to customer
                  <textarea value={quote.notes} maxLength={1000} rows={2} onChange={(event) => setQuote((current) => ({ ...current, notes: event.target.value }))} className={cn(input, "mt-1 py-2")} />
                </label>
                <p className="text-sm font-semibold text-white">Total: {formatMoney(quoteTotal)}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={busy} className="min-h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800">Save draft</button>
                  <button type="button" disabled={busy} onClick={() => { setActionError(null); setPending({ kind: "save-quotation", send: true }); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Send className="h-4 w-4" />Save & send to customer</button>
                  {request.quotation?.status === "draft" && (
                    <button type="button" disabled={busy} onClick={() => { setActionError(null); setPending({ kind: "send-quotation" }); }} className="min-h-10 rounded-lg border border-blue-700 px-4 text-sm font-semibold text-blue-200">Send saved draft</button>
                  )}
                </div>
                {quotationApproved && <p className="text-xs text-amber-300">This quotation is approved. Saving changes requires a revision reason and customer re-approval.</p>}
              </form>
            ) : request.quotation ? (
              <p className="text-sm text-slate-300">Total {formatMoney(request.quotation.total)} — quotations can no longer be changed for this request.</p>
            ) : (
              <p className="text-sm text-slate-400">No quotation.</p>
            )}
          </SectionCard>

          <SectionCard id="mr-payments" title="Payment records" icon={<Wallet className="h-4 w-4 text-blue-300" />} dark actions={
            <span className="text-xs capitalize text-slate-400">{request.paymentStatus.replace("_", " ")}</span>
          }>
            <p className="mb-2 text-xs text-slate-500">Manual payment records only — no payment gateway is connected.</p>
            {request.payments.length ? (
              <ul className="mb-3 space-y-1 text-sm">
                {request.payments.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-slate-300">
                    <span>{formatMoney(item.amount)} · <span className="capitalize">{item.method.replace("_", " ")}</span>{item.reference ? ` · ${item.reference}` : ""}</span>
                    <span className="text-xs text-slate-500">{formatDate(item.recordedAt, true)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mb-3 text-sm text-slate-400">No payments recorded.</p>}
            {quotationApproved && request.status !== "cancelled" && paid < (request.quotation?.total ?? 0) && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(() => apiClient.post(`${endpoint}/payments`, {
                    amount: Number(payment.amount),
                    method: payment.method,
                    reference: payment.reference.trim() || undefined,
                    note: payment.note.trim() || undefined,
                  }), "Payment recorded.").then((ok) => ok && setPayment({ amount: "", method: "cash", reference: "", note: "" }));
                }}
                className="grid grid-cols-1 gap-2 sm:grid-cols-4"
              >
                <label className={label}>Amount<input type="number" min="1" max={(request.quotation?.total ?? 0) - paid} required value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} className={cn(input, "mt-1")} /></label>
                <label className={label}>Method
                  <select value={payment.method} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value }))} className={cn(input, "mt-1")}>
                    <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_wallet">Mobile wallet</option><option value="other">Other</option>
                  </select>
                </label>
                <label className={label}>Reference<input value={payment.reference} maxLength={120} onChange={(event) => setPayment((current) => ({ ...current, reference: event.target.value }))} className={cn(input, "mt-1")} /></label>
                <div className="flex items-end"><button type="submit" disabled={busy} className="min-h-10 w-full rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">Record</button></div>
                <p className="text-xs text-slate-500 sm:col-span-4">Outstanding: {formatMoney((request.quotation?.total ?? 0) - paid)}</p>
              </form>
            )}
          </SectionCard>

          {request.completionReport && (
            <SectionCard title="Completion report" icon={<ClipboardCheck className="h-4 w-4 text-emerald-300" />} dark>
              <ul className="space-y-1 text-sm text-slate-300">
                {request.completionReport.checklist.map((item) => <li key={item.label}>{item.done ? "✓" : "✗"} {item.label}</li>)}
              </ul>
              {request.completionReport.summary && <p className="mt-2 text-sm text-slate-300">{request.completionReport.summary}</p>}
              <p className="mt-1 text-xs text-slate-500">Submitted {formatDate(request.completionReport.submittedAt, true)}</p>
            </SectionCard>
          )}

          {request.complaints.length > 0 && (
            <SectionCard id="mr-complaints" title="Complaints" icon={<MessageSquareWarning className="h-4 w-4 text-rose-300" />} dark>
              <ul className="space-y-3">
                {request.complaints.map((item) => {
                  const edit = complaintEdits[item.id] ?? { status: item.status === "open" ? "in_review" : item.status, resolutionNote: item.resolutionNote ?? "" };
                  const closed = item.status === "resolved" || item.status === "closed";
                  return (
                    <li key={item.id} className="rounded-xl border border-slate-800 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{item.subject}</p>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-300">{item.status.replace("_", " ")}</span>
                      </div>
                      <p className="mt-1 text-slate-400">{item.description}</p>
                      <p className="mt-1 text-xs text-slate-500">Raised {formatDate(item.createdAt, true)}</p>
                      {item.resolutionNote && <p className="mt-2 text-xs text-emerald-300">Resolution: {item.resolutionNote}</p>}
                      {!closed && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run(() => apiClient.patch(`${endpoint}/complaints/${item.id}`, {
                              status: edit.status,
                              resolutionNote: edit.resolutionNote.trim() || undefined,
                            }), "Complaint updated.");
                          }}
                          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto]"
                        >
                          <label className="sr-only" htmlFor={`complaint-status-${item.id}`}>Complaint status</label>
                          <select id={`complaint-status-${item.id}`} value={edit.status} onChange={(event) => setComplaintEdits((current) => ({ ...current, [item.id]: { ...edit, status: event.target.value } }))} className={input}>
                            <option value="in_review">In review</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                          </select>
                          <label className="sr-only" htmlFor={`complaint-note-${item.id}`}>Resolution note</label>
                          <input id={`complaint-note-${item.id}`} value={edit.resolutionNote} maxLength={1500} placeholder="Resolution note (required to resolve/close)" onChange={(event) => setComplaintEdits((current) => ({ ...current, [item.id]: { ...edit, resolutionNote: event.target.value } }))} className={input} />
                          <button type="submit" disabled={busy} className="min-h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white">Update</button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}

          <SectionCard id="mr-audit" title="Audit trail" icon={<History className="h-4 w-4 text-blue-300" />} dark>
            <Timeline events={request.timeline} dark showInternal />
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <div className="hidden xl:block">{statusControl("desktop")}</div>

          <SectionCard title="Current technician" icon={<CalendarClock className="h-4 w-4 text-blue-300" />} dark>
            {request.technician ? (
              <div className="text-sm">
                <Link href={`/care-ops/technicians/${request.technician.id}`} className="font-semibold text-white hover:underline">{request.technician.name}</Link>
                <p className="text-xs text-slate-400">{request.technician.phone}</p>
                <p className="mt-2 text-xs text-slate-400">Visit: {formatDate(request.scheduledVisitAt, true)}</p>
              </div>
            ) : <p className="text-sm text-slate-400">No technician assigned.</p>}
          </SectionCard>

          {request.feedback && (
            <SectionCard title="Customer feedback" icon={<Star className="h-4 w-4 text-amber-300" />} dark>
              <p className="text-lg font-bold text-amber-300">{request.feedback.rating}/5</p>
              {request.feedback.comment && <p className="text-sm text-slate-300">{request.feedback.comment}</p>}
            </SectionCard>
          )}

          <SectionCard title="Internal notes" icon={<NotebookPen className="h-4 w-4 text-blue-300" />} dark>
            <ul className="mb-3 space-y-2">
              {request.workNotes.map((item) => (
                <li key={item.id} className="rounded-lg bg-slate-800/60 p-2 text-sm text-slate-300">
                  <span className="text-[10px] font-bold uppercase text-slate-500">{item.authorRole}{item.internal ? " · internal" : ""}</span>
                  <p>{item.note}</p>
                  <p className="text-[11px] text-slate-500">{formatDate(item.createdAt, true)}</p>
                </li>
              ))}
              {!request.workNotes.length && <li className="text-sm text-slate-500">No notes yet.</li>}
            </ul>
            <form onSubmit={(event) => { event.preventDefault(); if (adminNote.trim().length >= 2) void run(() => apiClient.post(`${endpoint}/notes`, { note: adminNote.trim() }), "Note added.").then((ok) => ok && setAdminNote("")); }} className="space-y-2">
              <label htmlFor="admin-note" className="sr-only">Internal note</label>
              <textarea id="admin-note" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={2} maxLength={2000} placeholder="Visible to admins only" className={cn(input, "py-2")} />
              <button type="submit" disabled={busy || adminNote.trim().length < 2} className="min-h-9 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 disabled:opacity-50">Add note</button>
            </form>
          </SectionCard>
        </aside>
      </div>

      {pending?.kind === "status" && (
        <ConfirmDialog
          dark
          title={`Move to ${OPS_STATUS_LABELS[pending.status]}?`}
          description={`${request.reference} will move from ${OPS_STATUS_LABELS[request.status]} to ${OPS_STATUS_LABELS[pending.status]}. The customer and technician will be notified.`}
          confirmLabel="Update status"
          tone={pending.status === "cancelled" ? "danger" : "primary"}
          reasonLabel="Reason (recorded in the audit trail)"
          reasonRequired={pending.status !== "under_review"}
          busy={busy}
          error={actionError}
          onClose={() => setPending(null)}
          onConfirm={(reason) => void run(() => apiClient.patch(`${endpoint}/status`, { status: pending.status, reason: reason || undefined }), "Status updated.")}
        />
      )}
      {pending?.kind === "assign" && (
        <ConfirmDialog
          dark
          title={replacing ? "Reassign this job?" : "Assign technician?"}
          description={`${eligible?.find((item) => item.id === assignForm.technicianId)?.name ?? "The technician"} will be asked to accept the visit on ${formatDate(new Date(assignForm.scheduledVisitAt).toISOString(), true)}.${replacing ? ` ${request.technician?.name} will be released from this job.` : ""}`}
          confirmLabel={replacing ? "Reassign" : "Assign"}
          reasonLabel={replacing ? "Reason for reassignment" : undefined}
          reasonRequired={replacing}
          busy={busy}
          error={actionError}
          onClose={() => setPending(null)}
          onConfirm={(reason) => void run(() => apiClient.post(`${endpoint}/assign`, {
            technicianId: assignForm.technicianId,
            scheduledVisitAt: new Date(assignForm.scheduledVisitAt).toISOString(),
            notes: assignForm.notes.trim() || undefined,
            reason: reason || undefined,
          }), replacing ? "Job reassigned." : "Technician assigned.").then((ok) => ok && setAssignForm({ technicianId: "", scheduledVisitAt: "", notes: "" }))}
        />
      )}
      {pending?.kind === "save-quotation" && (
        <ConfirmDialog
          dark
          title={pending.send ? "Send quotation to customer?" : "Save quotation draft?"}
          description={`Total ${formatMoney(quoteTotal)}.${pending.send ? " The customer will be asked to approve it." : " Drafts are not visible to the customer."}`}
          confirmLabel={pending.send ? "Save & send" : "Save draft"}
          reasonLabel={quotationApproved ? "Revision reason" : undefined}
          reasonRequired={quotationApproved}
          busy={busy}
          error={actionError}
          onClose={() => setPending(null)}
          onConfirm={(reason) => void run(() => apiClient.put(`${endpoint}/quotation`, quotationPayload(pending.send, reason)), pending.send ? "Quotation sent to customer." : "Quotation draft saved.")}
        />
      )}
      {pending?.kind === "send-quotation" && (
        <ConfirmDialog
          dark
          title="Send saved draft?"
          description={`The saved draft (${formatMoney(request.quotation?.total)}) will be sent to the customer for approval.`}
          confirmLabel="Send"
          busy={busy}
          error={actionError}
          onClose={() => setPending(null)}
          onConfirm={() => void run(() => apiClient.post(`${endpoint}/quotation/send`), "Quotation sent to customer.")}
        />
      )}
      {busy && <span className="sr-only" role="status"><Loader2 className="h-4 w-4 animate-spin" />Working…</span>}
    </div>
  );
}
