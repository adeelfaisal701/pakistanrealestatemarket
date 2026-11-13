"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, CheckCircle2, CreditCard, Home, Loader2, MessageSquareWarning, Plus, ReceiptText, Star } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/lib/api-client";
import { QUOTATION_LABELS, formatDate, formatMoney } from "@/lib/maintenance";
import { useCustomerRequestDetails, useCustomerRequests } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { CustomerMaintenanceRequest } from "@/types/maintenance";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ImageGallery,
  LoadingState,
  Modal,
  NotificationsPanel,
  SuccessBanner,
} from "@/components/maintenance/MaintenanceShared";
import { PcPageHeader, ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";

function TruncationNote({ truncated }: { truncated?: boolean }) {
  return truncated ? <p className="text-xs text-[#7a8594]">Showing your latest 20 records.</p> : null;
}

const QUOTE_TONES: Record<string, string> = {
  sent: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-700",
  draft: "bg-slate-100 text-slate-600",
};

export function CareQuotations() {
  const result = useCustomerRequestDetails((item) => Boolean(item.quotationStatus), "quotations");
  const [tab, setTab] = useState<"sent" | "approved" | "rejected">("sent");
  const [dialog, setDialog] = useState<null | { request: CustomerMaintenanceRequest; decision: "approve" | "reject" }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const details = (result.data?.details ?? []).filter((request) => request.quotation);
  const visible = details.filter((request) => request.quotation!.status === tab);
  const count = (status: string) => details.filter((request) => request.quotation!.status === status).length;

  const respond = async (note: string) => {
    if (!dialog) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/maintenance/requests/${encodeURIComponent(dialog.request.id)}/quotation/respond`, { decision: dialog.decision, note: note || undefined });
      setNotice(dialog.decision === "approve" ? "Quotation approved." : "Quotation rejected. Our team will follow up.");
      setDialog(null);
      result.reload();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PcPageHeader eyebrow="Property Care" title="Quotations" description="Review itemised quotations from Ghar Safar. Chargeable work starts only after you approve." />
      {notice && <SuccessBanner message={notice} />}
      {result.error && <ErrorBanner message={result.error} onRetry={result.reload} />}
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-[#e5ebf4] p-1 sm:max-w-md">
        {(["sent", "approved", "rejected"] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn("min-h-11 rounded-xl text-[13px] font-bold", tab === key ? "bg-white text-[#1660d0] shadow-sm" : "text-[#64748b]")}>
            {key === "sent" ? "To approve" : key === "approved" ? "Approved" : "Rejected"} <span className="tabular-nums opacity-70">{result.data ? count(key) : ""}</span>
          </button>
        ))}
      </div>

      {result.loading && !result.data ? <LoadingState label="Loading quotations…" /> : !visible.length ? (
        <EmptyState icon={<ReceiptText className="h-5 w-5" />} title={tab === "sent" ? "No quotations to approve" : "No quotations here"} description="Quotations appear when Ghar Safar prices chargeable work for one of your requests." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((request) => {
            const quote = request.quotation!;
            const lines: Array<[string, number]> = [
              ...(quote.inspectionCharge > 0 ? [["Inspection", quote.inspectionCharge] as [string, number]] : []),
              ["Labour", quote.laborCharge],
              ["Materials", quote.materialCharge],
              ...quote.additionalCharges.map((line) => [line.label, line.amount] as [string, number]),
            ];
            return (
              <li key={request.id} className={cn(pc.card, "flex flex-col p-4 sm:p-5", quote.status === "sent" && "border-amber-300 ring-1 ring-amber-200")}>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2fe] text-[#1660d0]"><ServiceIcon category={request.category} className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/care/requests/${request.id}`} className="block truncate text-[15px] font-extrabold hover:underline">{request.title}</Link>
                    <p className="text-xs text-[#7a8594]">{request.reference} · v{quote.version}{quote.sentAt ? ` · sent ${formatDate(quote.sentAt)}` : ""}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", QUOTE_TONES[quote.status])}>{QUOTATION_LABELS[quote.status]}</span>
                </div>
                <dl className="mt-4 divide-y divide-[#edf2f8] text-sm">
                  {lines.map(([label, amount]) => (
                    <div key={label} className="flex justify-between py-2"><dt className="text-[#7a8594]">{label}</dt><dd className="font-semibold">{formatMoney(amount)}</dd></div>
                  ))}
                </dl>
                <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#0f2747] px-4 py-3 text-white"><span className="text-sm">Total</span><span className="text-lg font-black">{formatMoney(quote.total)}</span></div>
                {quote.notes && <p className="mt-3 text-sm text-[#64748b]">{quote.notes}</p>}
                {quote.customerNote && <p className="mt-2 text-xs text-[#7a8594]">Your note: {quote.customerNote}</p>}
                {request.actions.canRespondToQuotation && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setError(null); setDialog({ request, decision: "reject" }); }} className={pc.secondaryBtn}>Request changes</button>
                    <button type="button" onClick={() => { setError(null); setDialog({ request, decision: "approve" }); }} className={pc.successBtn}>Approve</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <TruncationNote truncated={result.data?.truncated} />
      {dialog && (
        <ConfirmDialog
          title={dialog.decision === "approve" ? "Approve quotation?" : "Reject quotation?"}
          description={dialog.decision === "approve" ? `You are approving ${formatMoney(dialog.request.quotation?.total)} for “${dialog.request.title}”.` : "Ghar Safar will review your note and may send a revised quotation."}
          confirmLabel={dialog.decision === "approve" ? "Approve" : "Reject quotation"}
          tone={dialog.decision === "approve" ? "primary" : "danger"}
          reasonLabel={dialog.decision === "approve" ? "Note (optional)" : "What should change? (optional)"}
          busy={busy}
          error={error}
          onClose={() => setDialog(null)}
          onConfirm={(note) => void respond(note)}
        />
      )}
    </div>
  );
}

export function CarePayments() {
  const result = useCustomerRequestDetails((item) => item.quotationStatus === "approved", "payments");
  const details = result.data?.details ?? [];
  const transactions = details.flatMap((request) => request.payments.map((payment) => ({ ...payment, request })))
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const paid = transactions.reduce((sum, row) => sum + row.amount, 0);
  const due = details.reduce((sum, request) => sum + Math.max(0, (request.quotation?.total ?? 0) - request.payments.reduce((acc, payment) => acc + payment.amount, 0)), 0);
  const STATUS_TONE: Record<string, string> = { paid: "bg-emerald-100 text-emerald-800", partially_paid: "bg-amber-100 text-amber-800", unpaid: "bg-slate-100 text-slate-600" };

  return (
    <div className="space-y-5">
      <PcPageHeader eyebrow="Property Care" title="Payments" description="Payment status for approved quotations and the payments Ghar Safar has recorded." />
      {result.error && <ErrorBanner message={result.error} onRetry={result.reload} />}
      <section className="grid grid-cols-2 gap-3">
        <div className={cn(pc.card, "p-4")}><p className="text-xs font-semibold text-[#7a8594]">Paid</p><p className="mt-1 text-xl font-black text-emerald-700">{result.data ? formatMoney(paid) : "–"}</p></div>
        <div className={cn(pc.card, "p-4")}><p className="text-xs font-semibold text-[#7a8594]">Outstanding</p><p className="mt-1 text-xl font-black text-amber-700">{result.data ? formatMoney(due) : "–"}</p></div>
      </section>
      <p className="rounded-2xl bg-[#eaf2fe] p-3 text-xs text-[#334155]">Online payments are not available yet. Payments made to Ghar Safar are recorded by our team and appear here.</p>

      {result.loading && !result.data ? <LoadingState label="Loading payments…" /> : !details.length ? (
        <EmptyState icon={<CreditCard className="h-5 w-5" />} title="No payments due" description="Payment details appear once you approve a quotation." />
      ) : (
        <>
          <section aria-labelledby="jobs-heading">
            <h2 id="jobs-heading" className="mb-3 text-lg font-black tracking-[-0.02em]">By job</h2>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {details.map((request) => {
                const jobPaid = request.payments.reduce((sum, payment) => sum + payment.amount, 0);
                return (
                  <li key={request.id}>
                    <Link href={`/care/requests/${request.id}`} className={cn(pc.card, "block p-4")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate font-extrabold">{request.title}</p><p className="text-xs text-[#7a8594]">{request.reference}</p></div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize", STATUS_TONE[request.paymentStatus])}>{request.paymentStatus.replace("_", " ")}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5ebf4]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${request.quotation?.total ? Math.min(100, (jobPaid / request.quotation.total) * 100) : 0}%` }} /></div>
                      <p className="mt-2 text-xs text-[#64748b]">{formatMoney(jobPaid)} of {formatMoney(request.quotation?.total)} paid</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="tx-heading" className={cn(pc.card, "p-4 sm:p-5")}>
            <h2 id="tx-heading" className="mb-2 text-[15px] font-extrabold">Transaction history</h2>
            {!transactions.length ? <p className="text-sm text-[#7a8594]">No payments recorded yet.</p> : (
              <ul className="divide-y divide-[#edf2f8]">
                {transactions.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{row.request.title}</span>
                      <span className="block text-xs capitalize text-[#7a8594]">{row.method.replace("_", " ")} · {formatDate(row.recordedAt, true)}</span>
                    </span>
                    <span className="text-sm font-black tabular-nums">{formatMoney(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <TruncationNote truncated={result.data?.truncated} />
    </div>
  );
}

export function CarePassport() {
  const result = useCustomerRequestDetails((item) => item.status === "completed", "passport");
  const properties = useMemo(() => {
    const groups = new Map<string, { address: CustomerMaintenanceRequest["address"]; propertyType: string; jobs: CustomerMaintenanceRequest[] }>();
    for (const request of result.data?.details ?? []) {
      const key = `${request.address.line}|${request.address.area}|${request.address.city}`.toLowerCase();
      const group = groups.get(key) ?? { address: request.address, propertyType: request.propertyType, jobs: [] };
      group.jobs.push(request);
      groups.set(key, group);
    }
    return [...groups.values()].map((group) => ({ ...group, jobs: group.jobs.sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime()) }));
  }, [result.data]);

  return (
    <div className="space-y-5">
      <PcPageHeader eyebrow="Property Care" title="Property Care Passport" description="A permanent maintenance record for each of your properties — what was done, when, by whom and at what cost." />
      {result.error && <ErrorBanner message={result.error} onRetry={result.reload} />}
      {result.loading && !result.data ? <LoadingState label="Loading passport…" /> : !properties.length ? (
        <EmptyState icon={<BookOpenCheck className="h-5 w-5" />} title="Your passport is empty" description="Completed jobs are recorded here automatically, building a service history for your property." />
      ) : properties.map((property) => {
        const spend = property.jobs.reduce((sum, job) => sum + (job.quotation?.total ?? 0), 0);
        return (
          <section key={`${property.address.line}-${property.address.area}`} className={cn(pc.card, "overflow-hidden")}>
            <header className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-[#0b2c5f] to-[#1660d0] p-4 text-white sm:p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Home className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-extrabold">{property.address.line}</h2>
                <p className="text-xs text-slate-300">{property.address.area}, {property.address.city} · <span className="capitalize">{property.propertyType}</span></p>
              </div>
              <div className="flex w-full gap-6 border-t border-white/15 pt-3 sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
                <div><p className="text-lg font-black">{property.jobs.length}</p><p className="text-[10px] uppercase tracking-wide text-slate-300">Services</p></div>
                <div><p className="text-lg font-black">{formatMoney(spend)}</p><p className="text-[10px] uppercase tracking-wide text-slate-300">Total cost</p></div>
              </div>
            </header>
            <ol className="divide-y divide-[#edf2f8]">
              {property.jobs.map((job) => (
                <li key={job.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf2fe] text-[#1660d0]"><ServiceIcon category={job.category} className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1660d0]">{formatDate(job.completedAt ?? job.updatedAt)}</p>
                      <Link href={`/care/requests/${job.id}`} className="block text-[15px] font-extrabold hover:underline">{job.title}</Link>
                      <p className="text-xs text-[#7a8594]">{job.categoryLabel} · {job.reference}{job.technician ? ` · ${job.technician.name}` : ""}</p>
                    </div>
                    {job.quotation && <span className="text-sm font-black">{formatMoney(job.quotation.total)}</span>}
                  </div>
                  {job.completionReport?.summary && <p className="mt-3 rounded-2xl bg-[#f5f8fd] p-3 text-sm text-[#334155]">{job.completionReport.summary}</p>}
                  {job.images.some((image) => image.kind !== "problem") && (
                    <div className="mt-3"><ImageGallery images={job.images} kinds={["before", "after"]} emptyLabel="" /></div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      <TruncationNote truncated={result.data?.truncated} />
    </div>
  );
}

const COMPLAINT_TONE: Record<string, string> = {
  open: "bg-rose-100 text-rose-700",
  in_review: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-600",
};

export function CareComplaints() {
  const result = useCustomerRequestDetails((item) => item.status !== "pending", "complaints");
  const requests = useCustomerRequests();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ requestId: "", subject: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const details = result.data?.details ?? [];
  const complaints = details.flatMap((request) => request.complaints.map((complaint) => ({ complaint, request })))
    .sort((a, b) => new Date(b.complaint.createdAt).getTime() - new Date(a.complaint.createdAt).getTime());
  const feedback = details.filter((request) => request.feedback);
  const eligible = (requests.data?.items ?? []).filter((item) => item.status !== "cancelled");

  const submit = async () => {
    if (!form.requestId) return setError("Choose the request this complaint is about.");
    if (form.subject.trim().length < 3 || form.description.trim().length < 10) return setError("Add a subject (3+ characters) and description (10+ characters).");
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/maintenance/requests/${encodeURIComponent(form.requestId)}/complaints`, { subject: form.subject.trim(), description: form.description.trim() });
      setOpen(false);
      setForm({ requestId: "", subject: "", description: "" });
      setNotice("Complaint submitted. Our team will contact you.");
      result.reload();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PcPageHeader eyebrow="Property Care" title="Complaints & feedback" description="Raise a concern about a job and follow it until it's resolved." action={
        <button type="button" onClick={() => { setError(null); setOpen(true); }} className={pc.primaryBtn}><Plus className="h-4 w-4" /> New complaint</button>
      } />
      {notice && <SuccessBanner message={notice} />}
      {result.error && <ErrorBanner message={result.error} onRetry={result.reload} />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="complaints-heading">
          <h2 id="complaints-heading" className="mb-3 text-lg font-black tracking-[-0.02em]">Complaint history</h2>
          {result.loading && !result.data ? <LoadingState label="Loading complaints…" /> : !complaints.length ? (
            <EmptyState icon={<MessageSquareWarning className="h-5 w-5" />} title="No complaints" description="We hope it stays that way. If something isn't right, raise a complaint and our team will help." />
          ) : (
            <ul className="space-y-3">
              {complaints.map(({ complaint, request }) => (
                <li key={complaint.id} className={cn(pc.card, "p-4")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold">{complaint.subject}</p>
                      <Link href={`/care/requests/${request.id}`} className="text-xs text-[#1660d0] hover:underline">{request.title} · {request.reference}</Link>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold capitalize", COMPLAINT_TONE[complaint.status])}>{complaint.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#64748b]">{complaint.description}</p>
                  {complaint.resolutionNote && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900"><b>Ghar Safar:</b> {complaint.resolutionNote}</p>}
                  <p className="mt-2 text-xs text-[#94a3b8]">Raised {formatDate(complaint.createdAt, true)}{complaint.resolvedAt ? ` · resolved ${formatDate(complaint.resolvedAt)}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside>
          <section className={cn(pc.card, "p-4 sm:p-5")} aria-labelledby="ratings-heading">
            <h2 id="ratings-heading" className="flex items-center gap-2 text-[15px] font-extrabold"><Star className="h-4 w-4 text-amber-500" /> Your ratings</h2>
            {!feedback.length ? <p className="mt-2 text-sm text-[#7a8594]">Rate completed jobs from their request page.</p> : (
              <ul className="mt-3 space-y-3">
                {feedback.map((request) => (
                  <li key={request.id} className="rounded-2xl bg-[#f5f8fd] p-3">
                    <p className="truncate text-sm font-bold">{request.title}</p>
                    <p className="text-amber-500" aria-label={`${request.feedback!.rating} out of 5`}>{"★".repeat(request.feedback!.rating)}<span className="text-[#d2ddec]">{"★".repeat(5 - request.feedback!.rating)}</span></p>
                    {request.feedback!.comment && <p className="mt-1 text-xs text-[#64748b]">“{request.feedback!.comment}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {open && (
        <Modal title="New complaint" onClose={() => !busy && setOpen(false)}>
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-4">
            <label className={pc.label}>Request
              <select value={form.requestId} onChange={(event) => setForm((current) => ({ ...current, requestId: event.target.value }))} className={pc.input}>
                <option value="">Select a request…</option>
                {eligible.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.title}</option>)}
              </select>
            </label>
            <label className={pc.label}>Subject
              <input value={form.subject} maxLength={160} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} className={pc.input} />
            </label>
            <label className={pc.label}>What went wrong?
              <textarea value={form.description} maxLength={2000} rows={4} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={cn(pc.input, "py-3")} />
            </label>
            <p className="text-xs text-[#7a8594]">If the job is awaiting your confirmation or already completed, it will move to dispute review.</p>
            {error && <ErrorBanner message={error} />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className={pc.secondaryBtn}>Cancel</button>
              <button type="submit" disabled={busy} className={cn(pc.primaryBtn, "bg-rose-600 shadow-none hover:bg-rose-700")}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Submit complaint</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function CareNotifications() {
  return (
    <div className="space-y-5">
      <PcPageHeader eyebrow="Property Care" title="Notifications" description="Updates about your requests, quotations and visits." />
      <NotificationsPanel limit={50} />
    </div>
  );
}

