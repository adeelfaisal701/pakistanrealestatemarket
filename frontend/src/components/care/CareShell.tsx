"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  BookOpenCheck,
  ChevronRight,
  ClipboardList,
  CreditCard,
  History,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Plus,
  ReceiptText,
  X,
} from "lucide-react";
import apiClient, { type ApiEnvelope } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const CARE_NAV = [
  { href: "/care", label: "Overview", icon: LayoutDashboard },
  { href: "/care/requests", label: "My Requests", icon: ClipboardList },
  { href: "/care/new", label: "New Request", icon: Plus },
  { href: "/care/quotations", label: "Quotations", icon: ReceiptText },
  { href: "/care/payments", label: "Payments", icon: CreditCard },
  { href: "/care/history", label: "Maintenance History", icon: History },
  { href: "/care/passport", label: "Property Care Passport", icon: BookOpenCheck },
  { href: "/care/complaints", label: "Complaints", icon: MessageSquareWarning },
  { href: "/care/notifications", label: "Notifications", icon: Bell },
] as const;

const MORE = CARE_NAV.filter((item) => !["/care", "/care/requests", "/care/new", "/care/history"].includes(item.href));

function useCleanPath() {
  return usePathname().replace(/^\/property-care-preview/, "");
}

function isActive(path: string, href: string) {
  if (href === "/care") return path === "/care";
  return path === href || path.startsWith(`${href}/`);
}

function signOut() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  window.dispatchEvent(new Event("estatepro:auth-changed"));
  window.location.assign("/property-care/login");
}

/**
 * Dedicated customer workspace for Ghar Safar Property Care. Independent of
 * the Real Estate buyer dashboard layout (which is reused only via its
 * unchanged access guard in the route layout).
 */
export function CareShell({ children }: { children: ReactNode }) {
  const path = useCleanPath();
  const [name, setName] = useState<string>("");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .get<ApiEnvelope<{ name: string }>>("/buyer/profile")
      .then(({ data }) => { if (active) setName(data.data.name); })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => setMoreOpen(false), [path]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const initials = (name || "Customer").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f9ff] text-[#0f2747]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-[#e2e9f3] bg-white lg:flex">
        <Link href="/care" className="flex h-[72px] items-center gap-2.5 border-b border-[#edf2f8] px-5">
          <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={38} height={37} className="h-9 w-9 object-contain" />
          <span className="leading-tight">
            <span className="block text-[17px] font-black tracking-[-0.03em]">Ghar Safar</span>
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1660d0]">Property Care</span>
          </span>
        </Link>
        <nav aria-label="Property Care" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {CARE_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                  active ? "bg-[#eaf2fe] text-[#1660d0]" : "text-[#475569] hover:bg-[#f5f8fd] hover:text-[#0f2747]",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-[#1660d0]" : "text-[#94a3b8]")} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-[#edf2f8] p-3">
          <Link href="/buyer" className="flex min-h-11 items-center gap-3 rounded-xl border border-[#e2e9f3] px-3 text-sm font-semibold text-[#475569] hover:bg-[#f5f8fd]">
            <ArrowLeftRight className="h-4 w-4 text-[#94a3b8]" /> Ghar Safar home
          </Link>
          <button type="button" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#475569] hover:bg-rose-50 hover:text-rose-700">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[#e2e9f3] bg-white/90 backdrop-blur lg:ml-[260px]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/care" className="flex items-center gap-2 lg:hidden">
            <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={34} height={33} className="h-8 w-8 object-contain" />
            <span className="leading-tight">
              <span className="block text-[15px] font-black tracking-[-0.03em]">Ghar Safar</span>
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#1660d0]">Property Care</span>
            </span>
          </Link>
          <p className="hidden text-sm text-[#64748b] lg:block">
            Welcome back{name ? <>, <span className="font-bold text-[#0f2747]">{name.split(" ")[0]}</span></> : ""}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/care/new" className="hidden min-h-10 items-center gap-1.5 rounded-xl bg-[#1660d0] px-4 text-sm font-bold text-white shadow-[0_6px_16px_rgba(22,96,208,0.25)] hover:bg-[#114fb0] sm:inline-flex">
              <Plus className="h-4 w-4" /> New request
            </Link>
            <Link href="/care/notifications" aria-label="Notifications" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#475569] hover:bg-[#f5f9ff]">
              <Bell className="h-5 w-5" />
            </Link>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1660d0] to-[#0b2c5f] text-xs font-black text-white" title={name}>
              {initials}
            </span>
          </div>
        </div>
      </header>

      <div className="lg:ml-[260px]">
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Property Care mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2e9f3] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,39,71,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-end">
          {[
            { href: "/care", label: "Home", icon: House },
            { href: "/care/requests", label: "Requests", icon: ClipboardList },
          ].map(({ href, label, icon: Icon }) => (
            <BottomLink key={href} href={href} label={label} active={isActive(path, href)}><Icon className="h-5 w-5" /></BottomLink>
          ))}
          <Link href="/care/new" aria-label="New request" className="flex h-full flex-col items-center justify-start pt-0.5 text-[10px] font-bold text-[#1660d0]">
            <span className="-mt-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#1660d0] text-white shadow-[0_8px_18px_rgba(22,96,208,0.35)] ring-4 ring-white transition active:scale-95">
              <Plus className="h-6 w-6" />
            </span>
            <span className="mt-0.5">New</span>
          </Link>
          <BottomLink href="/care/history" label="History" active={isActive(path, "/care/history")}><History className="h-5 w-5" /></BottomLink>
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="care-more-sheet"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn("flex h-full flex-col items-center justify-center gap-1 text-[10px] font-bold", moreOpen || MORE.some((item) => isActive(path, item.href)) ? "text-[#1660d0]" : "text-[#94a3b8]")}
          >
            {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More Property Care pages">
          <button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-[#0b2c5f]/40" />
          <section id="care-more-sheet" className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d2ddec]" />
            <nav aria-label="More pages" className="space-y-1">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={cn("flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold", isActive(path, href) ? "bg-[#eaf2fe] text-[#1660d0]" : "text-[#1e293b] hover:bg-[#f5f8fd]")}>
                  <Icon className="h-5 w-5 text-[#1660d0]" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-[#a7b0bc]" />
                </Link>
              ))}
              <Link href="/buyer" className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold text-[#1e293b] hover:bg-[#f5f8fd]">
                <ArrowLeftRight className="h-5 w-5 text-[#1660d0]" /> <span className="flex-1">Ghar Safar home</span>
              </Link>
              <button type="button" onClick={signOut} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-semibold text-rose-700 hover:bg-rose-50">
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}

function BottomLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[10px] font-bold transition", active ? "text-[#1660d0]" : "text-[#94a3b8]")}>
      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-[#eaf2fe]")}>{children}</span>
      {label}
    </Link>
  );
}
