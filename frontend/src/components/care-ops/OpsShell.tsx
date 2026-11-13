"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  ChevronRight,
  ClipboardList,
  CreditCard,
  HardHat,
  LayoutDashboard,
  Layers,
  Menu,
  MessageSquareWarning,
  ReceiptText,
  Route,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const OPS_NAV = [
  { href: "/care-ops", label: "Overview", icon: LayoutDashboard },
  { href: "/care-ops/requests", label: "Requests", icon: ClipboardList },
  { href: "/care-ops/dispatch", label: "Dispatch", icon: Route },
  { href: "/care-ops/technicians", label: "Technicians", icon: HardHat },
  { href: "/care-ops/quotations", label: "Quotations", icon: ReceiptText },
  { href: "/care-ops/payments", label: "Payments", icon: CreditCard },
  { href: "/care-ops/complaints", label: "Complaints", icon: MessageSquareWarning },
  { href: "/care-ops/categories", label: "Categories", icon: Layers },
  { href: "/care-ops/reports", label: "Reports", icon: BarChart3 },
] as const;

const PRIMARY = ["/care-ops", "/care-ops/requests", "/care-ops/dispatch", "/care-ops/technicians"];

function isActive(path: string, href: string) {
  if (href === "/care-ops") return path === "/care-ops";
  return path === href || path.startsWith(`${href}/`);
}

function getAdminName() {
  try {
    const raw = localStorage.getItem("auth_user");
    const user = raw ? (JSON.parse(raw) as { name?: unknown }) : null;
    return typeof user?.name === "string" ? user.name : "";
  } catch {
    return "";
  }
}

/**
 * Property Care Operations workspace for administrators. Fully separate from
 * the Real Estate admin layout; the switcher only links to it.
 */
export function OpsShell({ children }: { children: ReactNode }) {
  const path = usePathname().replace(/^\/property-care-preview/, "");
  const [moreOpen, setMoreOpen] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => setName(getAdminName()), []);
  useEffect(() => setMoreOpen(false), [path]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);
  const current = OPS_NAV.find((item) => isActive(path, item.href));
  const initials = (name || "Admin").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const switcher = (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-[11px] font-bold">
      <Link href="/admin" className="flex min-h-9 items-center justify-center gap-1 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
        <ArrowLeftRight className="h-3.5 w-3.5" /> Real Estate
      </Link>
      <span aria-current="page" className="flex min-h-9 items-center justify-center rounded-lg bg-blue-600 text-white">Property Care</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#08111f] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/5 bg-[#0b1730] lg:flex">
        <Link href="/care-ops" className="flex h-[68px] items-center gap-2.5 px-5">
          <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={36} height={35} className="h-9 w-9 rounded-lg bg-white p-0.5 object-contain" />
          <span className="leading-tight">
            <span className="block text-[15px] font-black">Ghar Safar</span>
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-300">Care Operations</span>
          </span>
        </Link>
        <div className="px-4 pb-3">{switcher}</div>
        <nav aria-label="Property Care operations" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {OPS_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                  active ? "bg-blue-600/20 text-white ring-1 ring-inset ring-blue-500/30" : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px]", active ? "text-blue-300" : "text-slate-500")} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/30 text-xs font-black text-blue-100">{initials}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold text-white">{name || "Administrator"}</span>
            <span className="block text-[10px] text-slate-500">Operations admin</span>
          </span>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#08111f]/90 backdrop-blur lg:ml-[248px]">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/care-ops" className="flex items-center gap-2 lg:hidden">
            <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={32} height={31} className="h-8 w-8 rounded-lg bg-white p-0.5 object-contain" />
            <span className="leading-tight">
              <span className="block text-sm font-black">Care Ops</span>
              <span className="block text-[10px] text-slate-500">{current?.label ?? "Overview"}</span>
            </span>
          </Link>
          <p className="hidden text-sm font-semibold text-slate-300 lg:block">{current?.label ?? "Overview"}</p>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin" className="hidden min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:bg-white/5 sm:inline-flex lg:hidden">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Real Estate admin
            </Link>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/30 text-xs font-black text-blue-100 lg:hidden">{initials}</span>
          </div>
        </div>
      </header>

      <div className="lg:ml-[248px]">
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>
      </div>

      <nav aria-label="Care operations mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1730]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {OPS_NAV.filter((item) => PRIMARY.includes(item.href)).map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-bold", active ? "text-blue-300" : "text-slate-500")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-blue-500/15")}><Icon className="h-5 w-5" /></span>
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="ops-more-sheet"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-bold", moreOpen || (current && !PRIMARY.includes(current.href)) ? "text-blue-300" : "text-slate-500")}
          >
            {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More operations pages">
          <button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-black/60" />
          <section id="ops-more-sheet" className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-white/10 bg-[#0b1730] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-3">{switcher}</div>
            <nav aria-label="More operations pages" className="space-y-1">
              {OPS_NAV.filter((item) => !PRIMARY.includes(item.href)).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={cn("flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold", isActive(path, href) ? "bg-blue-600/20 text-white" : "text-slate-200 hover:bg-white/5")}>
                  <Icon className="h-5 w-5 text-blue-300" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </Link>
              ))}
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}

/** Page header used across the operations workspace. */
export function OpsPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-black tracking-[-0.02em] text-white sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function OpsStat({ label, value, hint, icon, tone = "text-blue-300", href }: { label: string; value: ReactNode; hint?: string; icon: ReactNode; tone?: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-white/5", tone)}>{icon}</span>
        {href && <ChevronRight className="h-4 w-4 text-slate-600" aria-hidden="true" />}
      </div>
      <p className="mt-3 text-[26px] font-black tabular-nums leading-none text-white">{value}</p>
      <p className="mt-1.5 text-xs font-semibold text-slate-400">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </>
  );
  const className = "block rounded-2xl border border-white/5 bg-[#0e1b33] p-4 transition hover:border-blue-500/30";
  return href ? <Link href={href} className={className}>{body}</Link> : <div className={className}>{body}</div>;
}

export function OpsPanel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-white/5 bg-[#0e1b33] p-4 sm:p-5", className)}>
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-white">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function SampleDataNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
      {children}
    </p>
  );
}
