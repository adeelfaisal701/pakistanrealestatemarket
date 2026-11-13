"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Lock,
  MapPin,
  NotebookPen,
  Phone,
  ReceiptText,
  Send,
  UserRound,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { QUOTATION_LABELS, formatDate, formatMoney, timeSlotLabel, validateImageFiles } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { TechnicianJob } from "@/types/maintenance";
import {
  ConfirmDialog,
  ErrorBanner,
  FileUploadField,
  ImageGallery,
  LoadingState,
  StatusBadge,
  SuccessBanner,
} from "@/components/maintenance/MaintenanceShared";
import { PcBackLink, PcCard, PcInfoRow, ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";

const DEFAULT_CHECKLIST = [
  "Problem resolved and tested",
  "Work area cleaned",
  "Before and after photos uploaded",
  "Customer walked through the completed work",
];
const MAX_PHOTOS_PER_KIND = 12;
const WORK_STEPS = [
  { label: "Accepted", statuses: ["accepted"] },
  { label: "On the way", statuses: ["on_the_way"] },
  { label: "Working", statuses: ["in_progress"] },
  { label: "Submitted", statuses: ["awaiting_customer_confirmation", "completed", "disputed"] },
];

type Dialog = null | "accept" | "reject" | "on_the_way" | "in_progress" | "complete";

export function TechnicianJobDetail({ id }: { id: string }) {
  const [job, setJob] = useState<TechnicianJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST.map((label) => ({ label, done: false })));
  const [summary, setSummary] = useState("");

  const endpoint = `/maintenance/technician/jobs/${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<TechnicianJob>>(endpoint);
      setJob(data.data);
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<{ data: ApiEnvelope<TechnicianJob> }>, success: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const { data } = await action();
      setJob(data.data);
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

  const open = (next: Dialog) => {
    setActionError(null);
    setDialog(next);
  };

  const uploadPhotos = async (kind: "before" | "after", files: File[]) => {
    if (!job) return;
    const existing = job.images?.filter((image) => image.kind === kind).length ?? 0;
    const problem = validateImageFiles(files, MAX_PHOTOS_PER_KIND - existing);
    setPhotoError(problem);
    if (problem) return;
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    await run(
      () => apiClient.post(`${endpoint}/photos`, body, {
        params: { kind },
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000,
      }),
      `${kind === "before" ? "Before" : "After"}-work photos uploaded.`,
    );
  };

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 2) return;
    if (await run(() => apiClient.post(`${endpoint}/notes`, { note: note.trim() }), "Note added.")) setNote("");
  };

  if (loading && !job) return <LoadingState label="Loading job…" />;
  if (loadError && !job) {
    return (
      <div className="space-y-4">
        <PcBackLink href="/technician/jobs" label="My jobs" />
        <ErrorBanner message={loadError} onRetry={() => void load()} />
      </div>
    );
  }
  if (!job) return null;

  if (!job.isCurrent) {
    return (
      <div className="space-y-4">
        <PcBackLink href="/technician/history" label="Job history" />
        <PcCard>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ServiceIcon category={job.category} className="h-5 w-5" /></span>
            <div>
              <p className="font-mono text-xs text-[#6b7a90]">{job.reference}</p>
              <h1 className="text-lg font-black">{job.title}</h1>
              <p className="text-sm text-[#5b6b82]">{job.categoryLabel} · {job.area}, {job.city}</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-[#36506f]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>This job is no longer assigned to you (<span className="font-bold capitalize">{job.myAssignment?.status}</span>). Customer details are hidden.</span>
          </div>
          {job.myAssignment?.rejectionReason && <p className="mt-3 text-sm text-rose-600">Your rejection reason: {job.myAssignment.rejectionReason}</p>}
        </PcCard>
      </div>
    );
  }

  const actions = job.actions!;
  const beforeCount = job.images?.filter((image) => image.kind === "before").length ?? 0;
  const afterCount = job.images?.filter((image) => image.kind === "after").length ?? 0;
  const workStep = WORK_STEPS.findIndex((item) => job.status && item.statuses.includes(job.status));
  const checklistDone = checklist.every((item) => item.done);

  const primary = actions.canAccept
    ? { label: "Accept job", onClick: () => open("accept"), tone: pc.successBtn }
    : actions.canMarkOnTheWay
      ? { label: "I'm on the way", onClick: () => open("on_the_way"), tone: pc.primaryBtn }
      : job.status === "on_the_way"
        ? { label: "Start work", onClick: () => open("in_progress"), tone: pc.primaryBtn, disabled: !actions.canStartWork }
        : actions.canSubmitCompletion
          ? { label: "Submit for verification", onClick: () => open("complete"), tone: pc.successBtn, disabled: !checklistDone || afterCount === 0 }
          : null;

  const statusMessage =
    job.status === "awaiting_customer_confirmation" ? "Submitted — waiting for the customer to confirm." :
      job.status === "completed" ? "Job completed and confirmed by the customer." :
        job.status === "disputed" ? "The customer raised a concern. Ghar Safar operations will contact you." : null;

  return (
    <div className={cn("space-y-4", primary && "pb-24 sm:pb-0")}>
      <PcBackLink href="/technician/jobs" label="My jobs" />

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d57ad] to-[#0b2545] text-white shadow-[0_14px_30px_rgba(13,87,173,0.25)]">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><ServiceIcon category={job.category} className="h-6 w-6" /></span>
            {job.status && <StatusBadge status={job.status} ops className="bg-white/90 ring-white" />}
          </div>
          <p className="mt-4 font-mono text-xs text-blue-200">{job.reference}</p>
          <h1 className="mt-0.5 text-[22px] font-black leading-tight tracking-[-0.02em]">{job.title}</h1>
          <p className="mt-1 text-sm text-blue-100">{job.categoryLabel} · <span className="capitalize">{job.propertyType}</span></p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-200">Visit</p>
              <p className="mt-0.5 font-bold">{formatDate(job.scheduledVisitAt, true)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-200">Area</p>
              <p className="mt-0.5 font-bold">{job.area}</p>
            </div>
          </div>
        </div>
        {workStep >= 0 && (
          <ol aria-label="Work progress" className="grid grid-cols-4 gap-1.5 bg-black/15 px-5 py-3">
            {WORK_STEPS.map((item, index) => (
              <li key={item.label} aria-current={index === workStep ? "step" : undefined}>
                <span className={cn("block h-1.5 rounded-full", index <= workStep ? "bg-[#9ccaff]" : "bg-white/20")} />
                <span className={cn("mt-1.5 block text-[11px] font-bold", index <= workStep ? "text-white" : "text-white/50")}>{item.label}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {notice && <SuccessBanner message={notice} />}
      {actionError && !dialog && <ErrorBanner message={actionError} />}
      {statusMessage && <p className="rounded-2xl border border-[#cfe1f7] bg-[#edf5ff] p-3 text-sm font-semibold text-[#0d4f9e]">{statusMessage}</p>}
      {job.status === "on_the_way" && !actions.canStartWork && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The quotation is awaiting customer approval. Wait for approval before starting chargeable work.</p>
      )}

      {actions.canAccept && (
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => open("reject")} className={pc.dangerBtn}>Reject job</button>
          <button type="button" onClick={() => open("accept")} className={pc.successBtn}>Accept job</button>
        </div>
      )}
      {primary && !actions.canAccept && (
        <div className="hidden sm:block">
          <button type="button" onClick={primary.onClick} disabled={primary.disabled} className={primary.tone}>{primary.label}</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <PcCard title="Job details" icon={<FileText className="h-4 w-4" />}>
            <p className="whitespace-pre-line text-sm leading-6 text-[#36506f]">{job.description}</p>
            {job.myAssignment?.dispatchNotes && (
              <p className="mt-3 rounded-2xl bg-[#edf5ff] p-3 text-sm text-[#0d4f9e]"><span className="font-bold">Dispatch note:</span> {job.myAssignment.dispatchNotes}</p>
            )}
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#6b7a90]">Photos</p>
              <ImageGallery images={job.images ?? []} emptyLabel="No photos yet." />
            </div>
          </PcCard>

          {actions.canUploadPhotos && (
            <PcCard title="Work photos" icon={<Camera className="h-4 w-4" />}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FileUploadField id="tech-before-photos" label={busy ? "Uploading…" : `Before-work photos (${beforeCount})`} remaining={MAX_PHOTOS_PER_KIND - beforeCount} onSelect={(files) => void uploadPhotos("before", files)} disabled={busy} />
                <FileUploadField id="tech-after-photos" label={busy ? "Uploading…" : `After-work photos (${afterCount})`} remaining={MAX_PHOTOS_PER_KIND - afterCount} onSelect={(files) => void uploadPhotos("after", files)} disabled={busy} />
              </div>
              {photoError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{photoError}</p>}
            </PcCard>
          )}

          {actions.canSubmitCompletion && (
            <PcCard title="Completion checklist" icon={<ClipboardCheck className="h-4 w-4" />}>
              <fieldset className="space-y-2">
                <legend className="sr-only">Completion checklist</legend>
                {checklist.map((item, index) => (
                  <label key={item.label} className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition", item.done ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-[#e3ebf5] text-[#20385c]")}>
                    <input type="checkbox" checked={item.done} onChange={(event) => setChecklist((current) => current.map((entry, i) => (i === index ? { ...entry, done: event.target.checked } : entry)))} className="h-5 w-5 accent-emerald-600" />
                    {item.label}
                  </label>
                ))}
              </fieldset>
              <label className={cn(pc.label, "mt-4")}>
                Work summary
                <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={2000} rows={3} placeholder="What was done, parts replaced, advice for the customer" className={cn(pc.input, "py-3")} />
              </label>
              {afterCount === 0 && <p className="mt-2 text-xs font-semibold text-amber-700">Upload at least one after-work photo before submitting.</p>}
            </PcCard>
          )}

          <PcCard title="Work notes" icon={<NotebookPen className="h-4 w-4" />}>
            {job.workNotes?.length ? (
              <ul className="mb-3 space-y-2">
                {job.workNotes.map((item) => (
                  <li key={item.id} className="rounded-2xl bg-[#f6f9fd] p-3 text-sm text-[#20385c]">
                    {item.note}
                    <p className="mt-1 text-[11px] text-[#94a3b8]">{formatDate(item.createdAt, true)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-[#94a3b8]">No notes yet.</p>
            )}
            {actions.canAddNotes && (
              <form onSubmit={addNote} className="flex items-end gap-2">
                <label htmlFor="tech-note" className="sr-only">Add a work note</label>
                <textarea id="tech-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} placeholder="Parts used, findings, follow-ups…" className={cn(pc.input, "mt-0 flex-1 py-3")} />
                <button type="submit" aria-label="Add note" disabled={busy || note.trim().length < 2} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d57ad] text-white disabled:opacity-40">
                  <Send className="h-5 w-5" />
                </button>
              </form>
            )}
          </PcCard>
        </div>

        <aside className="space-y-4">
          <PcCard title="Customer & location" icon={<MapPin className="h-4 w-4" />}>
            {job.address && job.contact ? (
              <div className="space-y-3 text-sm">
                <p className="flex items-start gap-2 text-[#20385c]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0d57ad]" />{job.address.line}, {job.address.area}, {job.address.city}</p>
                <p className="flex items-center gap-2 text-[#20385c]"><UserRound className="h-4 w-4 text-[#0d57ad]" />{job.contact.name}</p>
                <a href={`tel:${job.contact.phone}`} className={cn(pc.secondaryBtn, "w-full")}><Phone className="h-4 w-4" /> Call {job.contact.phone}</a>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#f6f9fd] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0d57ad] shadow-sm"><Lock className="h-5 w-5" /></span>
                <p className="mt-2 text-sm font-bold">{job.area}, {job.city}</p>
                <p className="mt-1 text-xs leading-5 text-[#5b6b82]">Exact address and customer phone unlock after you accept the job.</p>
              </div>
            )}
          </PcCard>

          <PcCard title="Schedule" icon={<CalendarClock className="h-4 w-4" />}>
            <dl className="divide-y divide-[#eef2f8]">
              <PcInfoRow label="Scheduled">{formatDate(job.scheduledVisitAt, true)}</PcInfoRow>
              <PcInfoRow label="Customer prefers">{job.preferredVisitDate ? formatDate(job.preferredVisitDate) : "Flexible"} · {timeSlotLabel(job.preferredTimeSlot)}</PcInfoRow>
            </dl>
          </PcCard>

          <PcCard title="Quotation" icon={<ReceiptText className="h-4 w-4" />}>
            {job.quotation ? (
              <div className="flex items-center justify-between">
                <span className="text-lg font-black">{formatMoney(job.quotation.total)}</span>
                <span className="rounded-full bg-[#edf5ff] px-2.5 py-1 text-[11px] font-bold text-[#0d57ad]">{QUOTATION_LABELS[job.quotation.status]}</span>
              </div>
            ) : (
              <p className="text-sm text-[#5b6b82]">No quotation issued. Quotations are prepared by Ghar Safar operations.</p>
            )}
          </PcCard>
        </aside>
      </div>

      {primary && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-[#e3ebf5] bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(16,43,85,0.1)] backdrop-blur sm:hidden">
          <div className="flex gap-2.5">
            {actions.canAccept && <button type="button" onClick={() => open("reject")} className={cn(pc.dangerBtn, "flex-1 px-3")}>Reject</button>}
            <button type="button" onClick={primary.onClick} disabled={primary.disabled} className={cn(primary.tone, "flex-[2] px-3")}>
              {primary.label === "Submit for verification" && <CheckCircle2 className="h-4 w-4" />}
              {primary.label}
            </button>
          </div>
        </div>
      )}

      {dialog === "accept" && (
        <ConfirmDialog title="Accept this job?" description={`You are confirming the visit on ${formatDate(job.scheduledVisitAt, true)}. The customer's address and phone will then be shared with you.`} confirmLabel="Accept job" busy={busy} error={actionError} onClose={() => setDialog(null)} onConfirm={() => void run(() => apiClient.post(`${endpoint}/accept`), "Job accepted.")} />
      )}
      {dialog === "reject" && (
        <ConfirmDialog title="Reject this job?" description="Ghar Safar operations will reassign it. Please tell us why." confirmLabel="Reject job" tone="danger" reasonLabel="Reason" reasonRequired reasonMinLength={5} busy={busy} error={actionError} onClose={() => setDialog(null)} onConfirm={(reason) => void run(() => apiClient.post(`${endpoint}/reject`, { reason }), "Job rejected.")} />
      )}
      {(dialog === "on_the_way" || dialog === "in_progress") && (
        <ConfirmDialog title={dialog === "on_the_way" ? "Mark as on the way?" : "Start work?"} description={dialog === "on_the_way" ? "The customer will be notified that you are on the way." : "The customer will be notified that work has started."} confirmLabel="Confirm" reasonLabel="Note (optional)" busy={busy} error={actionError} onClose={() => setDialog(null)} onConfirm={(statusNote) => void run(() => apiClient.post(`${endpoint}/status`, { status: dialog, note: statusNote || undefined }), "Status updated.")} />
      )}
      {dialog === "complete" && (
        <ConfirmDialog title="Submit for verification?" description="The customer will be asked to confirm the work. You cannot add photos or notes after submitting." confirmLabel="Submit" busy={busy} error={actionError} onClose={() => setDialog(null)} onConfirm={() => void run(() => apiClient.post(`${endpoint}/complete`, { checklist, summary: summary.trim() || undefined }), "Submitted for customer verification.")} />
      )}
      {busy && <span className="sr-only" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Working…</span>}
    </div>
  );
}
