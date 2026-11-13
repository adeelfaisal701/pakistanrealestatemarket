"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Building2,
  ChevronRight,
  ClipboardList,
  Headphones,
  Home,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  MessageCircle,
  Phone,
  Plus,
  PlusCircle,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/lib/agent-store";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { useAgentIdentity } from "@/hooks/use-agent-identity";
import { clearAgentDashboardData } from "@/lib/agent-session-data";

type BadgeKey = "newLeads" | "unreadConversations";

interface NavItem {
  name: string;
  shortName: string;
  icon: React.ElementType;
  href: string;
  badgeKey?: BadgeKey;
}

const NAVIGATION: NavItem[] = [
  { name: "Dashboard", shortName: "Home", icon: Home, href: "/agent" },
  { name: "My Ads", shortName: "Ads", icon: Megaphone, href: "/agent/ads" },
  { name: "Leads", shortName: "Leads", icon: Users, href: "/agent/leads", badgeKey: "newLeads" },
  { name: "Calls & Messages", shortName: "Calls", icon: Phone, href: "/agent/calls", badgeKey: "unreadConversations" },
  { name: "Listings", shortName: "Listings", icon: Building2, href: "/agent/listings" },
  { name: "Agency Profile", shortName: "Agency", icon: Building2, href: "/agent/agency-profile" },
  { name: "Client Requirements", shortName: "Requests", icon: ClipboardList, href: "/agent/requirements" },
];

const MORE_NAVIGATION = NAVIGATION.filter((item) =>
  ["/agent/leads", "/agent/listings", "/agent/agency-profile", "/agent/requirements"].includes(item.href),
);

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/agent") return pathname === "/agent";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgentSidebar() {
  const pathname = usePathname();
  const isMobileDashboard = pathname === "/agent";
  const newLeads = useAgentStore((s) => s.crmLeads.filter((l) => l.status === "New").length);
  const identity = useAgentIdentity();
  const [unreadConversations, setUnreadConversations] = useState<number | null>(null);
  const [unreadChatError, setUnreadChatError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileNotificationsOpen, setMobileNotificationsOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const requestVersion = useRef(0);
  const mobileMenuRef = useRef<HTMLElement | null>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement | null>(null);
  const isMorePage = MORE_NAVIGATION.some((item) => isItemActive(pathname, item.href));

  const loadUnreadConversations = useCallback(async () => {
    const currentRequestVersion = ++requestVersion.current;
    try {
      const response = await apiClient.get<ApiEnvelope<{ count: number }>>(
        "/messages/agent/unread-count",
      );
      if (currentRequestVersion === requestVersion.current) {
        setUnreadConversations(response.data.data.count);
        setUnreadChatError("");
      }
    } catch (requestError) {
      if (currentRequestVersion === requestVersion.current) {
        setUnreadChatError(getApiErrorMessage(requestError));
      }
    }
  }, []);

  useEffect(() => {
    void loadUnreadConversations();
    const timer = window.setInterval(() => void loadUnreadConversations(), 15_000);
    const handleAuthChange = () => {
      requestVersion.current += 1;
      setUnreadConversations(null);
      void loadUnreadConversations();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "auth_user" || event.key === "auth_token") {
        handleAuthChange();
      }
    };
    window.addEventListener("estatepro:auth-changed", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("estatepro:auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadUnreadConversations]);

  const badges: Record<BadgeKey, number> = {
    newLeads,
    unreadConversations: unreadConversations ?? 0,
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const mobileViewport = window.matchMedia("(max-width: 1023px)");
    if (!mobileViewport.matches) return;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      mobileMenuCloseRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    mobileViewport.addEventListener("change", handleViewportChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      mobileViewport.removeEventListener("change", handleViewportChange);
      if (mobileViewport.matches && mobileMenuTriggerRef.current?.isConnected) {
        mobileMenuTriggerRef.current.focus();
      }
    };
  }, [mobileMenuOpen]);
  useEffect(() => setAvatarFailed(false), [identity.avatarUrl]);

  const handleSignOut = () => {
    clearAgentDashboardData(
      localStorage,
      useAgentStore.getState().clearAccountData,
    );
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("estatepro:auth-changed"));
    window.location.assign("/login");
  };

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="z-30 hidden border-r border-[#16243a] bg-[#08101d] text-slate-100 lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        {/* Brand */}
        <div className="flex h-20 flex-shrink-0 items-center gap-3 border-b border-[#16243a] px-6">
          <Image
            src="/images/ghar-safar-logo.png"
            alt="Ghar Safar logo"
            width={48}
            height={46}
            className="h-11 w-11 flex-shrink-0 object-contain"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">Ghar Safar</span>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                Agent CRM
              </span>
            </div>
            <span className="text-xs text-slate-400">Lahore Property Hub</span>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Agent navigation" className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);
            const count = item.badgeKey ? badges[item.badgeKey] : 0;

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[48px] items-center gap-3.5 rounded-xl border px-4 py-3 text-[15px] font-medium transition-colors",
                  active
                    ? "border-emerald-500/30 bg-gradient-to-r from-emerald-600/35 to-emerald-600/10 text-white"
                    : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-emerald-400" : "text-slate-400")} />
                <span className="flex-1">{item.name}</span>
                {count > 0 && (
                  <span
                    aria-label={`${count} new`}
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
                {item.badgeKey === "unreadConversations" && unreadChatError && (
                  <span
                    title={`Unread chat count unavailable: ${unreadChatError}`}
                    aria-label="Unread chat count unavailable"
                    className="h-2 w-2 rounded-full bg-amber-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Fast WhatsApp Close */}
        <div className="flex-shrink-0 p-4">
          <Link
            href="/agent/leads"
            className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 transition-colors hover:bg-emerald-500/15"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <MessageCircle className="h-6 w-6 text-white" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-emerald-400">Fast WhatsApp Close</span>
              <span className="block text-xs text-slate-300">Click to chat with leads</span>
            </span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
          </Link>
        </div>
      </aside>

      {/* Mobile CRM header */}
      {isMobileDashboard && (
      <header className="sticky top-0 z-40 flex h-[calc(72px+env(safe-area-inset-top))] items-center justify-between border-b border-[#16243a] bg-[#08101d] px-5 pt-[env(safe-area-inset-top)] text-white shadow-sm shadow-slate-950/20 md:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/images/ghar-safar-logo.png"
            alt="Ghar Safar logo"
            width={40}
            height={39}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[17px] font-bold tracking-tight text-white">
              Ghar Safar
            </span>
            <span className="block text-[11px] font-medium text-slate-400">Agent CRM</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={
              (unreadConversations ?? 0) > 0
                ? `Notifications, ${unreadConversations} unread conversations`
                : "Notifications"
            }
            aria-expanded={mobileNotificationsOpen}
            onClick={() => {
              setMobileNotificationsOpen((open) => !open);
              setMobileMenuOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10"
          >
            <span className="relative">
              <Bell className="h-5 w-5" />
              {(unreadConversations ?? 0) > 0 && (
                <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unreadConversations && unreadConversations > 9
                    ? "9+"
                    : String(unreadConversations ?? 0)}
                </span>
              )}
            </span>
          </button>
          <Link
            href="/agent/agency-profile"
            aria-label="Open profile"
            aria-current={isItemActive(pathname, "/agent/agency-profile") ? "page" : undefined}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF7F2] text-xs font-bold text-[#008F68] ring-1 ring-white/15"
          >
            {identity.avatarUrl && !avatarFailed
              ? (
                <img
                  src={identity.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              )
              : identity.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("") || "A"}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08101d] bg-[#00C98B]" />
          </Link>
        </div>
      </header>
      )}

      {mobileNotificationsOpen && (
        <div className="fixed right-3.5 top-[5rem] z-50 w-[min(18rem,calc(100vw-1.75rem))] rounded-xl border border-[#20334D] bg-[#101F35] p-4 text-sm text-slate-300 shadow-xl md:hidden">
          <p className="font-semibold text-white">Notifications</p>
          {(unreadConversations ?? 0) > 0 ? (
            <Link
              href="/agent/calls"
              onClick={() => setMobileNotificationsOpen(false)}
              className="mt-2 flex min-h-10 items-center justify-between gap-2 rounded-lg bg-[#14243B] px-3 text-xs text-[#9CAFC5]"
            >
              <span>{unreadConversations} unread conversation{unreadConversations === 1 ? "" : "s"}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <p className="mt-1">Agent notifications are not available yet.</p>
          )}
        </div>
      )}

      <nav
        aria-label="Agent mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:hidden"
      >
        <div className="mx-auto grid h-[calc(var(--agent-mobile-nav-height)-1px)] max-w-2xl grid-cols-5 items-end px-1">
          <Link
            href="/agent"
            aria-current={isItemActive(pathname, "/agent") ? "page" : undefined}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              isItemActive(pathname, "/agent") ? "text-[#08783D]" : "text-slate-500",
            )}
          >
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/agent/calls"
            aria-current={isItemActive(pathname, "/agent/calls") ? "page" : undefined}
            className={cn(
              "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              isItemActive(pathname, "/agent/calls") ? "text-[#08783D]" : "text-slate-500",
            )}
          >
            <Phone className="h-5 w-5" />
            <span>Calls</span>
            {(unreadConversations ?? 0) > 0 && (
              <span className="absolute left-1/2 top-2 ml-1.5 flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {(unreadConversations ?? 0) > 9 ? "9+" : unreadConversations}
              </span>
            )}
          </Link>
          <Link
            href="/agent/add-property"
            aria-label="Add Listing"
            aria-current={isItemActive(pathname, "/agent/add-property") ? "page" : undefined}
            className="flex h-full flex-col items-center justify-start pt-0.5 text-[10px] font-semibold text-[#08783D]"
          >
            <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#079447] text-white shadow-[0_6px_14px_rgba(7,148,71,0.35)] ring-4 ring-white transition-transform active:scale-95">
              <Plus className="h-7 w-7" />
            </span>
            <span className="mt-0.5">Add Listing</span>
          </Link>
          <Link
            href="/agent/ads"
            aria-current={isItemActive(pathname, "/agent/ads") ? "page" : undefined}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              isItemActive(pathname, "/agent/ads") ? "text-[#08783D]" : "text-slate-500",
            )}
          >
            <Megaphone className="h-5 w-5" />
            <span>My Ads</span>
          </Link>
          <button
            ref={mobileMenuTriggerRef}
            type="button"
            aria-label={mobileMenuOpen ? "Close More menu" : "Open More menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="agent-more-menu"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setMobileNotificationsOpen(false);
            }}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
              mobileMenuOpen || isMorePage ? "text-[#08783D]" : "text-slate-500",
            )}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>More</span>
          </button>
        </div>
      </nav>

      <div
        className={cn(
          "fixed inset-0 z-50 transition-[visibility] duration-300 lg:hidden",
          mobileMenuOpen ? "visible" : "invisible",
        )}
        role="dialog"
        aria-modal={mobileMenuOpen}
        aria-hidden={!mobileMenuOpen}
        aria-label="More navigation options"
      >
        <button
          type="button"
          aria-label="Dismiss More menu"
          onClick={() => setMobileMenuOpen(false)}
          tabIndex={mobileMenuOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-slate-950/40 opacity-0 transition-opacity duration-300",
            mobileMenuOpen && "opacity-100",
          )}
        />
        <section
          ref={mobileMenuRef}
          id="agent-more-menu"
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 text-[#101D32] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none",
            mobileMenuOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">More</h2>
            <button
              ref={mobileMenuCloseRef}
              type="button"
              aria-label="Close More menu"
              onClick={() => setMobileMenuOpen(false)}
              tabIndex={mobileMenuOpen ? 0 : -1}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="More agent pages" className="space-y-1">
            {MORE_NAVIGATION.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(pathname, item.href);
              const count = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-[#EAF8F1] text-[#08783D]"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active ? "text-[#08783D]" : "text-slate-500")} />
                  <span className="flex-1">{item.href === "/agent/leads" ? "Leads" : item.name}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-[#079447] px-2 py-0.5 text-xs font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-2">
            <a
              href="mailto:support@zameenconnect.pk"
              tabIndex={mobileMenuOpen ? 0 : -1}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Headphones className="h-5 w-5 shrink-0 text-slate-500" />
              <span className="flex-1">Contact Support</span>
              <Mail className="h-4 w-4 text-slate-400" />
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              tabIndex={mobileMenuOpen ? 0 : -1}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign out
            </button>
          </div>
        </section>
      </div>

      {/* Existing tablet navigation */}
      {isMobileDashboard && (
      <header className="sticky top-0 z-40 hidden h-16 items-center justify-between border-b border-[#16243a] bg-[#08101d]/95 px-4 text-white backdrop-blur-md md:flex lg:hidden">
        <div className="flex items-center gap-2.5">
          <Image
            src="/images/ghar-safar-logo.png"
            alt="Ghar Safar logo"
            width={40}
            height={39}
            className="h-9 w-9 flex-shrink-0 object-contain"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-white">Ghar Safar</span>
            <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-1 text-[9px] font-bold uppercase text-emerald-400">
              Agent CRM
            </span>
          </div>
        </div>

        <Link
          href="/agent/add-property"
          className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-500"
        >
          <PlusCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Create New Ad</span>
        </Link>
      </header>
      )}

    </>
  );
}
