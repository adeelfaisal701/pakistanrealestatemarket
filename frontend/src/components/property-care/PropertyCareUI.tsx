import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Droplets,
  Hammer,
  Paintbrush,
  Ruler,
  Snowflake,
  Waves,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ghar Safar Property Care design system (light, blue/navy/white).
 * Navy  #0b2545 / #102b55 — headings, hero surfaces
 * Blue  #0d57ad — primary actions, links
 * Sky   #edf5ff — tints, selected states
 */
export const pc = {
  navy: "text-[#102b55]",
  muted: "text-[#5b6b82]",
  primaryBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0d57ad] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(13,87,173,0.28)] transition hover:bg-[#0a4890] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d57ad] focus-visible:ring-offset-2 disabled:opacity-60",
  secondaryBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#cfdcee] bg-white px-5 text-sm font-bold text-[#0d57ad] transition hover:bg-[#f2f7fe] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d57ad] disabled:opacity-60",
  dangerBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] disabled:opacity-60",
  successBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(5,150,105,0.25)] transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60",
  card: "rounded-3xl border border-[#e3ebf5] bg-white shadow-[0_2px_10px_rgba(16,43,85,0.05)]",
  input:
    "mt-1.5 min-h-12 w-full rounded-2xl border border-[#d5e0ee] bg-white px-4 text-[15px] text-[#102b55] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0d57ad] focus:ring-4 focus:ring-[#0d57ad]/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:ring-rose-100",
  label: "block text-sm font-semibold text-[#20385c]",
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  plumbing: Droplets,
  electrical: Zap,
  ac_repair: Snowflake,
  general_handyman: Hammer,
  painting: Paintbrush,
  carpentry: Ruler,
  water_tank_cleaning: Waves,
};

export function serviceIcon(key: string): LucideIcon {
  return SERVICE_ICONS[key] ?? Wrench;
}

export function ServiceIcon({ category, className }: { category: string; className?: string }) {
  const Icon = serviceIcon(category);
  return <Icon aria-hidden="true" className={className} />;
}

/**
 * Content wrapper for customer Property Care screens. The dedicated CareShell
 * provides the light canvas, navigation and spacing.
 */
export function PropertyCareSurface({ children }: { children: ReactNode }) {
  return <div className="text-[#102b55]">{children}</div>;
}

export function PcBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full pr-3 text-[13px] font-semibold text-[#5b6b82] transition hover:text-[#0d57ad]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {label}
    </Link>
  );
}

export function PcPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1768c4]">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-[26px] font-black leading-tight tracking-[-0.03em] text-[#102b55] sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm leading-6 text-[#5b6b82]">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function PcCard({
  title,
  icon,
  action,
  children,
  className,
  id,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn(pc.card, "scroll-mt-24 p-4 sm:p-5", className)}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-[#102b55]">
            {icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf5ff] text-[#0d57ad]">{icon}</span>
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PcInfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-[#6b7a90]">{label}</dt>
      <dd className="text-right font-semibold text-[#102b55]">{children}</dd>
    </div>
  );
}
