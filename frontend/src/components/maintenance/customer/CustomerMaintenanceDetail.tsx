"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  History,
  Images,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Phone,
  ReceiptText,
  ShieldCheck,
  Star,
  UserRoundCheck,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  CUSTOMER_PROGRESS_STEPS,
  QUOTATION_LABELS,
  formatDate,
  formatMoney,
  progressIndex,
  timeSlotLabel,
  validateImageFiles,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { CustomerMaintenanceRequest } from "@/types/maintenance";
import { PcBackLink, PcCard, PcInfoRow, PropertyCareSurface, ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";
import {
  ConfirmDialog,
  ErrorBanner,
  FileUploadField,
  ImageGallery,
  LoadingState,
  Modal,
  StatusBadge,
  SuccessBanner,
  Timeline,
} from "../MaintenanceShared";

type Dialog = null | "cancel" | "approve" | "reject" | "confirm" | "complaint";
const MAX_PROBLEM_IMAGES = 8;
const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function CustomerMaintenanceDetail({ id }: { id: string }) {
  const [request, setRequest] = useState<CustomerMaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [complaint, setComplaint] = useState({ subject: "", description: "" });

  const endpoint = `/maintenance/requests/${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<CustomerMaintenanceRequest>>(endpoint);
      setRequest(data.data);
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (
    action: () => Promise<{ data: ApiEnvelope<CustomerMaintenanceRequest> }>,
    success: string,
  ): Promise<boolean> => {
    setBusy(true);
    setActionError(null);
    try {
      const { data } = await action();
      setRequest(data.data);
      setDialog(null);
      setNotice(success);
      return true;
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openDialog = (next: Dialog) => {
    setActionError(null);
    setDialog(next);
  };

  const uploadPhotos = async (files: File[]) => {
    if (!request) return;
    const remaining = MAX_PROBLEM_IMAGES - request.images.filter((image) => image.kind === "problem").length;
    const problem = validateImageFiles(files, remaining);
    setUploadError(problem);
    if (problem) return;
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    setBusy(true);
    try {
      const { data } = await apiClient.post<ApiEnvelope<CustomerMaintenanceRequest>>(`${endpoint}/images`, body, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000,
      });
      setRequest(data.data);
      setNotice("Photos added.");
    } catch (requestError) {
      setUploadError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = (event: FormEvent) => {
    event.preventDefault();
    if (!rating) {
      setActionError("Select a star rating.");
      return;
    }
    void run(() => apiClient.post(`${endpoint}/feedback`, { rating, comment: comment.trim() || undefined }), "Thank you for your feedback.");
  };

  if (loading && !request) {
    return <PropertyCareSurface><LoadingState label="Loading request…" /></PropertyCareSurface>;
  }
  if (loadError && !request) {
    return (
      <PropertyCareSurface>
        <div className="space-y-4">
          <PcBackLink href="/buyer/maintenance" label="My requests" />
          <ErrorBanner message={loadError} onRetry={() => void load()} />
        </div>
      </PropertyCareSurface>
    );
  }
  if (!request) return null;

  const step = progressIndex(request.status);
  const cancelled = request.status === "cancelled";
  const completed = request.status === "completed";
  const problemCount = request.images.filter((image) => image.kind === "problem").length;
  const quoteAction = request.actions.canRespondToQuotation && request.quotation;
  const confirmAction = request.actions.canConfirmCompletion;
  const stickyAction = quoteAction || confirmAction;

  return (
    <PropertyCareSurface>
      <div className={cn("mx-auto max-w-6xl space-y-5", stickyAction && "pb-24 sm:pb-0")}>
        <PcBackLink href="/buyer/maintenance" label="My requests" />

        {/* Header */}
        <section className={cn(pc.card, "overflow-hidden")}>
          <div className="flex items-start gap-3 p-4 sm:p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf5ff] text-[#0d57ad]">
              <ServiceIcon category={request.category} className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#6b7a90]">{request.categoryLabel} · <span className="font-mono">{request.reference}</span></p>
              <h1 className="mt-0.5 text-xl font-black leading-tight tracking-[-0.02em] text-[#102b55] sm:text-2xl">{request.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={request.status} />
                <span className="text-xs text-[#6b7a90]">Submitted {formatDate(request.createdAt, true)}</span>
              </div>
            </div>
          </div>
          {!cancelled && (
            <div className="border-t border-[#eef2f8] bg-[#fafcff] px-4 py-4 sm:px-6">
              <p className="mb-2 text-xs font-bold text-[#36506f]">
                {completed ? "Completed" : `Step ${step + 1} of ${CUSTOMER_PROGRESS_STEPS.length}: ${CUSTOMER_PROGRESS_STEPS[step]?.label ?? ""}`}
              </p>
              <ol aria-label="Request progress" className="grid grid-cols-6 gap-1.5">
                {CUSTOMER_PROGRESS_STEPS.map((item, index) => {
                  const done = completed || index < step;
                  const current = !completed && index === step;
                  return (
                    <li key={item.key} aria-current={current ? "step" : undefined} title={item.label}>
                      <span className={cn("block h-2 rounded-full", done ? "bg-emerald-500" : current ? "bg-[#0d57ad]" : "bg-[#dbe5f2]")} />
                      <span className={cn("mt-1.5 hidden text-[11px] font-semibold leading-tight sm:block", done || current ? "text-[#20385c]" : "text-[#9aa9bd]")}>{item.label}</span>
                      <span className="sr-only">{item.label}{done ? " (done)" : current ? " (current)" : ""}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>

        {notice && <SuccessBanner message={notice} />}
        {actionError && !dialog && <ErrorBanner message={actionError} />}
        {cancelled && <ErrorBanner message={`This request was cancelled${request.cancellationReason ? `: ${request.cancellationReason}` : "."}`} />}

        {quoteAction && request.quotation && (
          <section className="rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 shadow-[0_8px_24px_rgba(217,119,6,0.12)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><ReceiptText className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold text-amber-950">Your quotation is ready</h2>
                <p className="mt-0.5 text-sm text-amber-900/80">Review the breakdown below. Chargeable work starts only after you approve.</p>
                <p className="mt-2 text-2xl font-black text-amber-950">{formatMoney(request.quotation.total)}</p>
              </div>
            </div>
            <div className="mt-4 hidden gap-2 sm:flex">
              <button type="button" onClick={() => openDialog("reject")} className={pc.secondaryBtn}>Request changes</button>
              <button type="button" onClick={() => openDialog("approve")} className={pc.successBtn}>Approve quotation</button>
            </div>
          </section>
        )}

        {confirmAction && (
          <section className="rounded-3xl border border-sky-300 bg-gradient-to-br from-sky-50 to-white p-5 shadow-[0_8px_24px_rgba(2,132,199,0.12)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><ClipboardCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="text-base font-extrabold text-sky-950">The technician has finished</h2>
                <p className="mt-0.5 text-sm text-sky-900/80">Check the after-work photos and checklist, then confirm — or report a problem.</p>
              </div>
            </div>
            <div className="mt-4 hidden gap-2 sm:flex">
              <button type="button" onClick={() => openDialog("complaint")} className={pc.secondaryBtn}>Report a problem</button>
              <button type="button" onClick={() => openDialog("confirm")} className={pc.successBtn}>Confirm completion</button>
            </div>
          </section>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            {/* Technician (mobile first position) */}
            <TechnicianCard request={request} className="lg:hidden" />

            {request.quotation && (
              <PcCard title="Quotation" icon={<ReceiptText className="h-4 w-4" />} action={
                <span className="rounded-full bg-[#edf5ff] px-2.5 py-1 text-[11px] font-bold text-[#0d57ad]">v{request.quotation.version} · {QUOTATION_LABELS[request.quotation.status]}</span>
              }>
                <dl className="divide-y divide-[#eef2f8]">
                  {request.quotation.inspectionCharge > 0 && <PcInfoRow label="Inspection">{formatMoney(request.quotation.inspectionCharge)}</PcInfoRow>}
                  <PcInfoRow label="Labour">{formatMoney(request.quotation.laborCharge)}</PcInfoRow>
                  <PcInfoRow label="Materials">{formatMoney(request.quotation.materialCharge)}</PcInfoRow>
                  {request.quotation.additionalCharges.map((line) => (
                    <PcInfoRow key={line.label} label={line.label}>{formatMoney(line.amount)}</PcInfoRow>
                  ))}
                </dl>
                <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#102b55] px-4 py-3 text-white">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-black">{formatMoney(request.quotation.total)}</span>
                </div>
                {request.quotation.notes && <p className="mt-3 text-sm text-[#5b6b82]">{request.quotation.notes}</p>}
                {request.quotation.status === "approved" && (
                  <p className="mt-3 text-xs text-[#6b7a90]">Payment status: <span className="font-bold capitalize text-[#102b55]">{request.paymentStatus.replace("_", " ")}</span></p>
                )}
              </PcCard>
            )}

            <PcCard title="Photos" icon={<Images className="h-4 w-4" />}>
              <ImageGallery images={request.images} emptyLabel="No photos uploaded yet." />
              {request.actions.canUploadImages && (
                <div className="mt-4">
                  <FileUploadField id="customer-problem-photos" label={busy ? "Uploading…" : "Add problem photos"} remaining={MAX_PROBLEM_IMAGES - problemCount} onSelect={(files) => void uploadPhotos(files)} disabled={busy} />
                  {uploadError && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{uploadError}</p>}
                </div>
              )}
            </PcCard>

            {request.completionReport && (
              <PcCard title="Completion report" icon={<ClipboardCheck className="h-4 w-4" />}>
                <ul className="space-y-2">
                  {request.completionReport.checklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-2.5 text-sm text-[#20385c]">
                      <CheckCircle2 className={cn("h-5 w-5 shrink-0", item.done ? "text-emerald-500" : "text-rose-400")} aria-hidden="true" />
                      {item.label}
                    </li>
                  ))}
                </ul>
                {request.completionReport.summary && <p className="mt-3 rounded-2xl bg-[#f6f9fd] p-3 text-sm text-[#36506f]">{request.completionReport.summary}</p>}
                <p className="mt-2 text-xs text-[#6b7a90]">Submitted {formatDate(request.completionReport.submittedAt, true)}</p>
              </PcCard>
            )}

            {request.actions.canSubmitFeedback && (
              <PcCard title="How did we do?" icon={<Star className="h-4 w-4" />}>
                <form onSubmit={submitFeedback} className="space-y-4">
                  <fieldset>
                    <legend className="text-sm text-[#5b6b82]">Rate your Property Care experience</legend>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label key={value} className="cursor-pointer rounded-xl p-1 focus-within:ring-2 focus-within:ring-[#0d57ad]">
                          <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" />
                          <Star aria-hidden="true" className={cn("h-9 w-9 transition", value <= rating ? "fill-amber-400 text-amber-400" : "text-[#cfdcee]")} />
                          <span className="sr-only">{value} star{value > 1 ? "s" : ""}</span>
                        </label>
                      ))}
                      {rating > 0 && <span className="ml-2 text-sm font-bold text-amber-700">{RATING_LABELS[rating]}</span>}
                    </div>
                  </fieldset>
                  <label className={pc.label}>
                    Comments <span className="font-normal text-[#94a3b8]">(optional)</span>
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1500} rows={3} className={cn(pc.input, "py-3")} />
                  </label>
                  <button type="submit" disabled={busy} className={cn(pc.primaryBtn, "w-full sm:w-auto")}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}Submit feedback
                  </button>
                </form>
              </PcCard>
            )}

            {request.feedback && (
              <PcCard title="Your feedback" icon={<Star className="h-4 w-4" />}>
                <p className="flex items-center gap-0.5" aria-label={`${request.feedback.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((value) => <Star key={value} aria-hidden="true" className={cn("h-6 w-6", value <= request.feedback!.rating ? "fill-amber-400 text-amber-400" : "text-[#cfdcee]")} />)}
                  <span className="ml-2 text-sm font-bold text-[#36506f]">{RATING_LABELS[request.feedback.rating]}</span>
                </p>
                {request.feedback.comment && <p className="mt-2 text-sm text-[#36506f]">“{request.feedback.comment}”</p>}
              </PcCard>
            )}

            {request.complaints.length > 0 && (
              <PcCard title="Complaints" icon={<MessageSquareWarning className="h-4 w-4" />}>
                <ul className="space-y-3">
                  {request.complaints.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-[#eef2f8] p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-extrabold text-[#102b55]">{item.subject}</p>
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold capitalize", item.status === "resolved" || item.status === "closed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{item.status.replace("_", " ")}</span>
                      </div>
                      <p className="mt-1 text-[#5b6b82]">{item.description}</p>
                      {item.resolutionNote && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-emerald-900"><span className="font-bold">Ghar Safar:</span> {item.resolutionNote}</p>}
                      <p className="mt-2 text-xs text-[#94a3b8]">Raised {formatDate(item.createdAt, true)}</p>
                    </li>
                  ))}
                </ul>
              </PcCard>
            )}

            <PcCard title="Activity" icon={<History className="h-4 w-4" />}>
              <Timeline events={request.timeline} />
            </PcCard>
          </div>

          <aside className="space-y-5">
            <TechnicianCard request={request} className="hidden lg:block" />

            <PcCard title="Request details" icon={<FileText className="h-4 w-4" />}>
              <p className="whitespace-pre-line text-sm leading-6 text-[#36506f]">{request.description}</p>
              <dl className="mt-3 divide-y divide-[#eef2f8] border-t border-[#eef2f8]">
                <PcInfoRow label="Property"><span className="capitalize">{request.propertyType}</span></PcInfoRow>
                <PcInfoRow label="Preferred">{request.preferredVisitDate ? formatDate(request.preferredVisitDate) : "Flexible"} · {timeSlotLabel(request.preferredTimeSlot)}</PcInfoRow>
                <PcInfoRow label="Contact">{request.contact.name}<span className="block text-xs font-normal text-[#6b7a90]">{request.contact.phone}</span></PcInfoRow>
              </dl>
              <p className="mt-2 flex items-start gap-2 text-sm text-[#36506f]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0d57ad]" />{request.address.line}, {request.address.area}, {request.address.city}</p>
            </PcCard>

            {((request.actions.canRaiseComplaint && !confirmAction) || request.actions.canCancel) && (
              <div className={cn(pc.card, "space-y-2 p-4")}>
                <p className="text-xs font-bold text-[#6b7a90]">Need help with this request?</p>
                {request.actions.canRaiseComplaint && !confirmAction && (
                  <button type="button" onClick={() => openDialog("complaint")} className={cn(pc.secondaryBtn, "w-full")}>
                    <MessageSquareWarning className="h-4 w-4" /> Raise a complaint
                  </button>
                )}
                {request.actions.canCancel && (
                  <button type="button" onClick={() => openDialog("cancel")} className={cn(pc.dangerBtn, "w-full")}>Cancel request</button>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      {stickyAction && (
        <div className="fixed inset-x-0 bottom-[calc(var(--buyer-mobile-nav-height,0px)+env(safe-area-inset-bottom))] z-30 border-t border-[#e3ebf5] bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(16,43,85,0.1)] backdrop-blur sm:hidden">
          <div className="flex gap-2.5">
            {quoteAction ? (
              <>
                <button type="button" onClick={() => openDialog("reject")} className={cn(pc.secondaryBtn, "flex-1 px-3")}>Request changes</button>
                <button type="button" onClick={() => openDialog("approve")} className={cn(pc.successBtn, "flex-1 px-3")}>Approve</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => openDialog("complaint")} className={cn(pc.secondaryBtn, "flex-1 px-3")}>Report problem</button>
                <button type="button" onClick={() => openDialog("confirm")} className={cn(pc.successBtn, "flex-1 px-3")}>Confirm</button>
              </>
            )}
          </div>
        </div>
      )}

      {dialog === "cancel" && (
        <ConfirmDialog
          title="Cancel this request?"
          description="Your request will be closed and any assigned technician will be released. This cannot be undone."
          confirmLabel="Cancel request"
          tone="danger"
          reasonLabel="Reason (optional)"
          busy={busy}
          error={actionError}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => void run(() => apiClient.post(`${endpoint}/cancel`, { reason: reason || undefined }), "Request cancelled.")}
        />
      )}
      {(dialog === "approve" || dialog === "reject") && request.quotation && (
        <ConfirmDialog
          title={dialog === "approve" ? "Approve quotation?" : "Request changes to the quotation?"}
          description={dialog === "approve"
            ? `You are approving a total of ${formatMoney(request.quotation.total)} for this job.`
            : "The quotation will be marked as rejected. Ghar Safar will review your note and may send a revised quotation."}
          confirmLabel={dialog === "approve" ? "Approve" : "Reject quotation"}
          tone={dialog === "approve" ? "primary" : "danger"}
          reasonLabel={dialog === "approve" ? "Note (optional)" : "What should change? (optional)"}
          busy={busy}
          error={actionError}
          onClose={() => setDialog(null)}
          onConfirm={(note) => void run(
            () => apiClient.post(`${endpoint}/quotation/respond`, { decision: dialog, note: note || undefined }),
            dialog === "approve" ? "Quotation approved." : "Quotation rejected. Our team will follow up.",
          )}
        />
      )}
      {dialog === "confirm" && (
        <ConfirmDialog
          title="Confirm the job is complete?"
          description="Confirming closes the job. If anything is wrong, choose “Report a problem” instead."
          confirmLabel="Yes, it's complete"
          busy={busy}
          error={actionError}
          onClose={() => setDialog(null)}
          onConfirm={() => void run(() => apiClient.post(`${endpoint}/confirm-completion`), "Thank you! The job is now complete.")}
        />
      )}
      {dialog === "complaint" && (
        <Modal title="Raise a complaint" onClose={() => !busy && setDialog(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (complaint.subject.trim().length < 3 || complaint.description.trim().length < 10) {
                setActionError("Add a subject (3+ characters) and description (10+ characters).");
                return;
              }
              void run(() => apiClient.post(`${endpoint}/complaints`, {
                subject: complaint.subject.trim(),
                description: complaint.description.trim(),
              }), "Complaint submitted. Our team will contact you.").then((ok) => {
                if (ok) setComplaint({ subject: "", description: "" });
              });
            }}
            className="space-y-4"
          >
            <label className={pc.label}>
              Subject
              <input value={complaint.subject} onChange={(event) => setComplaint((c) => ({ ...c, subject: event.target.value }))} maxLength={160} required className={pc.input} />
            </label>
            <label className={pc.label}>
              What went wrong?
              <textarea value={complaint.description} onChange={(event) => setComplaint((c) => ({ ...c, description: event.target.value }))} maxLength={2000} rows={4} required className={cn(pc.input, "py-3")} />
            </label>
            {confirmAction && (
              <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">Raising a complaint now puts the job into dispute review instead of completing it.</p>
            )}
            {actionError && <ErrorBanner message={actionError} />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDialog(null)} disabled={busy} className={pc.secondaryBtn}>Go back</button>
              <button type="submit" disabled={busy} className={cn(pc.primaryBtn, "bg-rose-600 shadow-none hover:bg-rose-700")}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}Submit complaint
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PropertyCareSurface>
  );
}

function TechnicianCard({ request, className }: { request: CustomerMaintenanceRequest; className?: string }) {
  return (
    <PcCard title="Your technician" icon={<UserRoundCheck className="h-4 w-4" />} className={className}>
      {request.technician ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0d57ad] to-[#0b2545] text-base font-black text-white">
              {request.technician.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
            </span>
            <div>
              <p className="text-base font-extrabold text-[#102b55]">{request.technician.name}</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified Ghar Safar technician</p>
            </div>
          </div>
          {request.scheduledVisitAt && (
            <p className="flex items-center gap-2 rounded-2xl bg-[#f6f9fd] p-3 text-sm font-semibold text-[#20385c]">
              <CalendarClock className="h-4 w-4 text-[#0d57ad]" /> {formatDate(request.scheduledVisitAt, true)}
            </p>
          )}
          {request.technician.phone && (
            <a href={`tel:${request.technician.phone}`} className={cn(pc.secondaryBtn, "w-full")}>
              <Phone className="h-4 w-4" /> Call {request.technician.phone}
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl bg-[#f6f9fd] p-3">
          <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0d57ad]/40 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0d57ad]" />
          </span>
          <p className="text-sm leading-6 text-[#36506f]">
            {request.technicianPending
              ? "A technician has been dispatched and is confirming your visit. Their details will appear here once confirmed."
              : request.status === "cancelled"
                ? "No technician — this request was cancelled."
                : "Our team will assign a verified technician after reviewing your request."}
          </p>
        </div>
      )}
    </PcCard>
  );
}
