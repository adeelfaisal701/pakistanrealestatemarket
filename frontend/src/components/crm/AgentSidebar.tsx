"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  Home,
  Megaphone,
  MessageCircle,
  Phone,
  PlusCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/lib/agent-store";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

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
  { name: "Client Requirements", shortName: "Requests", icon: ClipboardList, href: "/agent/requirements" },
];

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/agent") return pathname === "/agent";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgentSidebar() {
  const pathname = usePathname();
  const newLeads = useAgentStore((s) => s.crmLeads.filter((l) => l.status === "New").length);
  const [unreadConversations, setUnreadConversations] = useState<number | null>(null);
  const [unreadChatError, setUnreadChatError] = useState("");
  const requestVersion = useRef(0);

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

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="z-30 hidden border-r border-[#16243a] bg-[#08101d] text-slate-100 lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        {/* Brand */}
        <div className="flex h-20 flex-shrink-0 items-center gap-3 border-b border-[#16243a] px-6">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-900/40">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">EstatePro</span>
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

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#16243a] bg-[#08101d]/95 px-4 text-white backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-md">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-white">EstatePro</span>
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

      {/* Mobile Bottom Navigation (48px tap targets) */}
      <nav
        aria-label="Agent navigation (mobile)"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around overflow-x-auto border-t border-[#16243a] bg-[#08101d]/95 px-1 py-2 shadow-2xl backdrop-blur-md lg:hidden"
      >
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
                "relative flex min-h-[48px] min-w-[52px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium transition-colors",
                active ? "bg-white/5 font-bold text-emerald-400" : "text-slate-400 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.shortName}</span>
              {count > 0 && (
                <span className="absolute right-2 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
              {item.badgeKey === "unreadConversations" && unreadChatError && (
                <span
                  title={`Unread chat count unavailable: ${unreadChatError}`}
                  aria-label="Unread chat count unavailable"
                  className="absolute right-2 top-1 h-2 w-2 rounded-full bg-amber-400"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
