"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  X,
  ChevronRight,
  UserRound,
  Wrench,
} from "lucide-react";
import apiClient, { type ApiEnvelope } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface BuyerProfile {
  name: string;
}

const sections = [
  { href: "/buyer", label: "Dashboard", icon: Home },
  { href: "/buyer/saved-properties", label: "Saved Properties", icon: Heart },
  { href: "/buyer/saved-searches", label: "Saved Searches", icon: Search },
  { href: "/buyer/requirements", label: "My Requirements", icon: ClipboardList },
  { href: "/buyer/maintenance", label: "Property Care", icon: Wrench },
  { href: "/buyer/inquiries", label: "Agent Inquiries", icon: MessageCircle },
  { href: "/buyer/notifications", label: "Notifications", icon: Bell },
  { href: "/buyer/profile", label: "Profile & Preferences", icon: Settings },
];

const MORE_SECTIONS = sections.filter(
  (item) => item.href !== "/buyer" && item.href !== "/buyer/saved-properties" && item.href !== "/buyer/inquiries",
).map((item) => (item.href === "/buyer/profile" ? { ...item, icon: UserRound } : item));

function isActiveRoute(pathname: string, href: string) {
  if (href === "/buyer") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "B";
}

export function BuyerNavigation() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .get<ApiEnvelope<BuyerProfile>>("/buyer/profile")
      .then(({ data }) => {
        if (active) setProfile(data.data);
      })
      .catch(() => {
        if (active) setProfileError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  const handleSignOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("estatepro:auth-changed"));
    window.location.assign("/login");
  };

  const name = profile?.name || "Buyer";
  const nav = (
    <>
      <div className="mb-7 flex items-center gap-2.5 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <House className="h-5 w-5" />
        </span>
        <span className="text-[17px] font-extrabold tracking-tight text-white">
          Estate<span className="text-emerald-400">Pro</span>
        </span>
      </div>

      <div className="mb-7 flex items-center gap-3 rounded-xl border border-[#1c304e] bg-[#0d1b31] p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3551] text-sm font-bold text-emerald-300">
          {getInitials(name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {profileError ? "Profile unavailable" : name}
          </span>
          <span className="mt-0.5 block text-xs text-[#8fa2bd]">Buyer</span>
        </span>
      </div>

      <nav aria-label="Buyer account" className="space-y-1">
        {sections.map(({ href, label, icon: Icon }) => {
          const active = isActiveRoute(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20"
                  : "text-[#aebed5] hover:bg-[#12223b] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-[#aebed5] transition-colors hover:bg-[#12223b] hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </nav>

      <div className="mt-auto pt-6">
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-[#10433e] via-[#10333a] to-[#10243b] p-4">
          <House className="absolute -bottom-3 -right-2 h-16 w-16 text-emerald-300/10" />
          <p className="relative text-sm font-bold leading-5 text-white">
            Find Your Dream Home With Ghar Safar
          </p>
          <Link
            href="/properties"
            className="relative mt-3 inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-[#03221f] hover:bg-emerald-400"
          >
            Explore Homes <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-[#1c304e] bg-[#07152b] px-4 lg:hidden">
        <Link href="/buyer" className="flex items-center gap-2 text-base font-extrabold text-white">
          <House className="h-5 w-5 text-emerald-400" />
          Estate<span className="text-emerald-400">Pro</span>
        </Link>
      </header>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[212px] flex-col border-r border-[#1c304e] bg-[#07152b] px-4 py-5 lg:flex">
        {nav}
      </aside>

      <nav
        aria-label="Buyer mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:hidden"
      >
        <div className="mx-auto grid h-[calc(var(--buyer-mobile-nav-height)-1px)] max-w-2xl grid-cols-5 items-end px-1">
          <Link
            href="/buyer"
            aria-current={pathname === "/buyer" ? "page" : undefined}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              pathname === "/buyer" ? "text-[#08783D]" : "text-slate-500",
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/buyer/saved-properties"
            aria-current={isActiveRoute(pathname, "/buyer/saved-properties") ? "page" : undefined}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              isActiveRoute(pathname, "/buyer/saved-properties") ? "text-[#08783D]" : "text-slate-500",
            )}
          >
            <Heart className="h-5 w-5" />
            <span>Saved</span>
          </Link>
          <Link
            href="/buyer/requirements?create=1"
            aria-label="Add Requirement"
            className="flex h-full flex-col items-center justify-start pt-0.5 text-[10px] font-semibold text-[#08783D]"
          >
            <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#079447] text-white shadow-[0_6px_14px_rgba(7,148,71,0.35)] ring-4 ring-white transition-transform active:scale-95">
              <Plus className="h-7 w-7" />
            </span>
            <span className="mt-0.5 max-w-full text-center text-[9px] leading-[10px]">Add Requirement</span>
          </Link>
          <Link
            href="/buyer/inquiries"
            aria-current={isActiveRoute(pathname, "/buyer/inquiries") ? "page" : undefined}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              isActiveRoute(pathname, "/buyer/inquiries") ? "text-[#08783D]" : "text-slate-500",
            )}
          >
            <MessageCircle className="h-5 w-5" />
            <span>Inquiries</span>
          </Link>
          <button
            type="button"
            aria-label={moreOpen ? "Close More menu" : "Open More menu"}
            aria-expanded={moreOpen}
            aria-controls="buyer-more-menu"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              moreOpen || MORE_SECTIONS.some((item) => isActiveRoute(pathname, item.href))
                ? "text-[#08783D]"
                : "text-slate-500",
            )}
          >
            {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>More</span>
          </button>
        </div>
      </nav>

      <div
        className={cn(
          "fixed inset-0 z-50 transition-[visibility] duration-300 lg:hidden",
          moreOpen ? "visible" : "invisible",
        )}
        role="dialog"
        aria-modal={moreOpen}
        aria-hidden={!moreOpen}
        aria-label="More buyer navigation options"
      >
        <button
          type="button"
          aria-label="Dismiss More menu"
          onClick={() => setMoreOpen(false)}
          tabIndex={moreOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-slate-950/40 opacity-0 transition-opacity duration-300",
            moreOpen && "opacity-100",
          )}
        />
        <section
          id="buyer-more-menu"
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 text-[#101D32] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none",
            moreOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">More</h2>
            <button
              type="button"
              aria-label="Close More menu"
              onClick={() => setMoreOpen(false)}
              tabIndex={moreOpen ? 0 : -1}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="More buyer pages" className="space-y-1">
            {MORE_SECTIONS.map(({ href, label, icon: Icon }) => {
              const active = isActiveRoute(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                  tabIndex={moreOpen ? 0 : -1}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active ? "bg-[#EAF8F1] text-[#08783D]" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active ? "text-[#08783D]" : "text-slate-500")} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              tabIndex={moreOpen ? 0 : -1}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
