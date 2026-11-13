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
 * Ghar Safar Property Care (Maintenance) design system — blue & white.
 * Tokens live in globals.css (`care-*`):
 *   care-600 #1660d0 primary actions / links · care-700 hover
 *   care-50/100 white-blue surfaces and selected tints
 *   care-900/950 deep-blue bands · care-ink #0f2747 headings
 * Green is reserved for success states (completed, paid, resolved).
 */
export const pc = {
  navy: "text-care-ink",
  muted: "text-[#64748b]",
  primaryBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-care-600 px-5 text-sm font-bold text-white shadow-[0_1px_2px_rgba(15,39,71,0.12),0_10px_22px_-10px_rgba(22,96,208,0.6)] transition hover:bg-care-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-500 focus-visible:ring-offset-2 disabled:opacity-60",
  secondaryBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-care-200 bg-white px-5 text-sm font-bold text-care-700 transition hover:border-care-300 hover:bg-care-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-500 disabled:opacity-60",
  dangerBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] disabled:opacity-60",
  successBtn:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(5,150,105,0.6)] transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60",
  card: "rounded-2xl border border-[#e2e9f3] bg-white shadow-[0_1px_2px_rgba(15,39,71,0.04),0_12px_32px_-20px_rgba(15,39,71,0.25)]",
  input:
    "mt-1.5 min-h-12 w-full rounded-xl border border-[#d4deeb] bg-white px-4 text-[15px] text-care-ink outline-none transition placeholder:text-[#94a3b8] focus:border-care-600 focus:ring-4 focus:ring-care-600/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:ring-rose-100",
  label: "block text-sm font-semibold text-[#1e293b]",
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
  return <div className="text-[#0f2747]">{children}</div>;
}

export function PcBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full pr-3 text-[13px] font-semibold text-[#64748b] transition hover:text-[#1660d0]"
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
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-care-600">{eyebrow}</p>
        )}
        <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-care-ink sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm leading-6 text-[#64748b]">{description}</p>}
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
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-[#0f2747]">
            {icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eaf2fe] text-[#1660d0]">{icon}</span>
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
      <dt className="shrink-0 text-[#7a8594]">{label}</dt>
      <dd className="text-right font-semibold text-[#0f2747]">{children}</dd>
    </div>
  );
}
