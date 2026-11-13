"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, ImageOff, Loader2, X } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  DARK_TONE_CLASSES,
  OPS_STATUS_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
  TONE_CLASSES,
  eventLabel,
  formatDate,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { AppNotification, MaintenanceImage, MaintenanceStatus, MaintenanceTimelineEvent } from "@/types/maintenance";

export function StatusBadge({
  status,
  dark = false,
  ops = false,
  className,
}: {
  status: MaintenanceStatus;
  dark?: boolean;
  ops?: boolean;
  className?: string;
}) {
  const tone = STATUS_TONES[status] ?? "slate";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        dark ? DARK_TONE_CLASSES[tone] : TONE_CLASSES[tone],
        className,
      )}
    >
      {(ops ? OPS_STATUS_LABELS : STATUS_LABELS)[status] ?? status}
    </span>
  );
}

export function ErrorBanner({ message, onRetry, dark = false }: { message: string; onRetry?: () => void; dark?: boolean }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm",
        dark ? "border-red-800 bg-red-950/40 text-red-300" : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ message, dark = false }: { message: string; dark?: boolean }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-xl border p-3 text-sm",
        dark ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}

export function LoadingState({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl border p-10 text-center text-sm",
        dark ? "border-slate-800 bg-slate-900 text-slate-400" : "border-[#e3ebf5] bg-white text-slate-500",
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  dark = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed p-8 text-center",
        dark ? "border-slate-700 bg-slate-900/60" : "border-[#cfdcee] bg-white",
      )}
    >
      {icon && <div className={cn("mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full", dark ? "bg-slate-800 text-slate-300" : "bg-blue-50 text-blue-700")}>{icon}</div>}
      <h3 className={cn("text-sm font-semibold", dark ? "text-white" : "text-[#102b55]")}>{title}</h3>
      {description && <p className={cn("mx-auto mt-1 max-w-md text-sm", dark ? "text-slate-400" : "text-slate-500")}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Maintenance photos are private: they are fetched with the bearer token and
 * rendered from an in-memory object URL instead of a public image URL.
 */
export function SecureImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    setFailed(false);
    apiClient
      .get<Blob>(src, { responseType: "blob", timeout: 30000 })
      .then((response) => {
        if (!active) return;
        created = URL.createObjectURL(response.data);
        setObjectUrl(created);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-200 text-slate-500", className)}>
        <ImageOff className="h-5 w-5" aria-label="Image unavailable" />
      </div>
    );
  }
  if (!objectUrl) {
    return <div className={cn("animate-pulse bg-slate-200", className)} aria-hidden="true" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={alt} className={cn("object-cover", className)} />;
}

export function ImageGallery({
  images,
  kinds,
  emptyLabel,
  dark = false,
}: {
  images: MaintenanceImage[];
  kinds?: Array<MaintenanceImage["kind"]>;
  emptyLabel: string;
  dark?: boolean;
}) {
  const [preview, setPreview] = useState<MaintenanceImage | null>(null);
  const visible = kinds ? images.filter((image) => kinds.includes(image.kind)) : images;
  if (!visible.length) {
    return <p className={cn("text-sm", dark ? "text-slate-500" : "text-slate-500")}>{emptyLabel}</p>;
  }
  const kindLabel = { problem: "Problem", before: "Before", after: "After" } as const;
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {visible.map((image) => (
          <li key={image.id} className="relative">
            <button
              type="button"
              onClick={() => setPreview(image)}
              className="block w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={`Open ${kindLabel[image.kind].toLowerCase()} photo`}
            >
              <SecureImage src={image.url} alt={`${kindLabel[image.kind]} photo`} className="aspect-square w-full" />
            </button>
            <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {kindLabel[image.kind]}
            </span>
          </li>
        ))}
      </ul>
      {preview && (
        <Modal title={`${kindLabel[preview.kind]} photo`} onClose={() => setPreview(null)} wide>
          <SecureImage src={preview.url} alt={`${kindLabel[preview.kind]} photo`} className="max-h-[70vh] w-full rounded-lg object-contain" />
        </Modal>
      )}
    </>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
  dark = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  dark?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "textarea, input, select, button:not([data-close])",
    );
    (focusable ?? panelRef.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Close dialog" data-close onClick={onClose} className="absolute inset-0 bg-slate-950/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-[#e3ebf5] bg-white text-slate-900",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Confirmation dialog for critical actions. When `reasonLabel` is given a
 * reason textarea is shown (and enforced when `reasonRequired`).
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = "primary",
  reasonLabel,
  reasonRequired = false,
  reasonMinLength = 0,
  busy = false,
  error,
  dark = false,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  reasonLabel?: string;
  reasonRequired?: boolean;
  reasonMinLength?: number;
  busy?: boolean;
  error?: string | null;
  dark?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const reasonId = useId();
  const invalid = reasonRequired && reason.trim().length < Math.max(1, reasonMinLength);
  return (
    <Modal title={title} onClose={busy ? () => undefined : onClose} dark={dark}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid && !busy) onConfirm(reason.trim());
        }}
        className="space-y-4"
      >
        <p className={cn("text-sm", dark ? "text-slate-300" : "text-[#5b6b82]")}>{description}</p>
        {reasonLabel && (
          <label htmlFor={reasonId} className="block text-sm font-medium">
            {reasonLabel}
            {reasonRequired && <span className="text-rose-500"> *</span>}
            <textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              required={reasonRequired}
              aria-invalid={invalid}
              className={cn(
                "mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500",
                dark ? "border-slate-700 bg-slate-800 text-white" : "border-[#cfdcee] bg-white",
              )}
            />
            {reasonRequired && reasonMinLength > 1 && (
              <span className="mt-1 block text-xs text-slate-500">At least {reasonMinLength} characters.</span>
            )}
          </label>
        )}
        {error && <ErrorBanner message={error} dark={dark} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn(
              "min-h-10 rounded-xl border px-4 text-sm font-semibold",
              dark ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-[#cfdcee] text-[#0d57ad] hover:bg-[#f2f7fe]",
            )}
          >
            Go back
          </button>
          <button
            type="submit"
            disabled={invalid || busy}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50",
              tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#0d57ad] hover:bg-[#0a4890]",
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Timeline({
  events,
  dark = false,
  showInternal = false,
}: {
  events: MaintenanceTimelineEvent[];
  dark?: boolean;
  showInternal?: boolean;
}) {
  const visible = [...events].reverse();
  if (!visible.length) return <p className="text-sm text-slate-500">No activity yet.</p>;
  const actor = { customer: "Customer", technician: "Technician", admin: "Ghar Safar team", system: "System" } as const;
  return (
    <ol className="relative space-y-4 border-l border-slate-300 pl-5">
      {visible.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={cn(
              "absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4",
              event.toStatus === "completed" ? "bg-emerald-500" : event.internal ? "bg-amber-500" : "bg-blue-600",
              dark ? "ring-slate-900" : "ring-white",
            )}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("text-sm font-semibold", dark ? "text-white" : "text-[#102b55]")}>
              {event.toStatus && event.event === "status_changed"
                ? <>Moved to <StatusBadge status={event.toStatus} dark={dark} ops={showInternal} className="ml-1 align-middle" /></>
                : eventLabel(event.event)}
            </p>
            {showInternal && event.internal && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">Internal</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {actor[event.actorRole] ?? event.actorRole} · {formatDate(event.at, true)}
          </p>
          {event.note && (
            <p className={cn("mt-1 whitespace-pre-line text-sm", dark ? "text-slate-300" : "text-[#5b6b82]")}>{event.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Compact in-app notifications list backed by /notifications. */
export function NotificationsPanel({ dark = false, limit = 8 }: { dark?: boolean; limit?: number }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<{ items: AppNotification[]; unreadCount: number }>>(
        "/notifications",
        { params: { limit } },
      );
      setItems(data.data.items);
      setUnread(data.data.unreadCount);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    try {
      await apiClient.post("/notifications/read-all");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const markOne = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
      setUnread((value) => Math.max(0, value - 1));
    } catch {
      // non-critical
    }
  };

  return (
    <section
      aria-labelledby="maintenance-notifications-heading"
      className={cn(
        "rounded-3xl border p-4",
        dark ? "border-slate-800 bg-slate-900" : "border-[#e3ebf5] bg-white",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id="maintenance-notifications-heading" className={cn("flex items-center gap-2 text-sm font-bold", dark ? "text-white" : "text-[#102b55]")}>
          <Bell className="h-4 w-4" aria-hidden="true" /> Updates
          {unread > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{unread} new</span>}
        </h2>
        {unread > 0 && (
          <button type="button" onClick={() => void markAll()} className="text-xs font-semibold text-blue-500 hover:underline">
            Mark all read
          </button>
        )}
      </header>
      {loading ? (
        <p className="text-xs text-slate-500" role="status">Loading updates…</p>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => void load()} dark={dark} />
      ) : !items.length ? (
        <p className="text-xs text-slate-500">No updates yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm",
                item.readAt ? "opacity-70" : dark ? "bg-blue-950/40" : "bg-blue-50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {item.link ? (
                    <Link href={item.link} onClick={() => !item.readAt && void markOne(item.id)} className={cn("font-semibold hover:underline", dark ? "text-white" : "text-[#102b55]")}>
                      {item.title}
                    </Link>
                  ) : (
                    <p className={cn("font-semibold", dark ? "text-white" : "text-[#102b55]")}>{item.title}</p>
                  )}
                  <p className={cn("text-xs", dark ? "text-slate-400" : "text-[#5b6b82]")}>{item.message}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(item.createdAt, true)}</p>
                </div>
                {!item.readAt && (
                  <button type="button" onClick={() => void markOne(item.id)} className="shrink-0 text-[11px] font-semibold text-slate-500 hover:text-slate-300" aria-label={`Mark ${item.title} as read`}>
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SectionCard({
  title,
  icon,
  actions,
  children,
  dark = false,
  className,
  id,
}: {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  dark?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 rounded-3xl border p-4 sm:p-5",
        dark ? "border-slate-800 bg-slate-900" : "border-[#e3ebf5] bg-white",
        className,
      )}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn("flex items-center gap-2 text-base font-bold", dark ? "text-white" : "text-[#102b55]")}>
          {icon}
          {title}
        </h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function FileUploadField({
  id,
  label,
  hint,
  remaining,
  onSelect,
  disabled,
  dark = false,
}: {
  id: string;
  label: string;
  hint?: string;
  remaining: number;
  onSelect: (files: File[]) => void;
  disabled?: boolean;
  dark?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-4 text-center text-sm transition",
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-blue-500",
        dark ? "border-slate-700 text-slate-300" : "border-slate-300 text-slate-600",
      )}
    >
      <span className="font-semibold">{label}</span>
      <span className="mt-1 text-xs text-slate-500">
        {hint ?? `JPEG, PNG or WebP, up to 10 MB each.`} {remaining > 0 ? `${remaining} remaining.` : "Limit reached."}
      </span>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled || remaining <= 0}
        className="sr-only"
        onChange={(event) => {
          onSelect(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </label>
  );
}
