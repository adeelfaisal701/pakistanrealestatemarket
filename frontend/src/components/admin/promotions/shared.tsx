"use client";

import type { ReactNode } from "react";
import type { PromoEffectiveStatus } from "@/lib/promotions";

export const STATUS_STYLES: Record<PromoEffectiveStatus, string> = {
  live: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  scheduled: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  expired: "border-slate-600 bg-slate-800 text-slate-400",
  draft: "border-slate-600 bg-slate-800 text-slate-300",
  paused: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  archived: "border-slate-700 bg-slate-900 text-slate-500",
};

export function StatusChip({ status }: { status: PromoEffectiveStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLES[status]}`}>
      {status === "live" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> : null}
      {status}
    </span>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-300">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "min-h-10 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60";

export function ToggleChip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`min-h-9 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        checked
          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
          : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PK").format(value);
}

export function formatDate(value?: string | null) {
  if (!value) return "No end date";
  return new Date(value).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

/** ISO → value for <input type="datetime-local"> in the admin's local time. */
export function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
