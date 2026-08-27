"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Building2,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentSidebarProps {
  activeInventoryCount?: number;
  totalLeadsCount?: number;
}

export function AgentSidebar({
  activeInventoryCount = 5,
  totalLeadsCount = 12,
}: AgentSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Leads & CRM Pipeline",
      href: "/agent",
      icon: LayoutDashboard,
      badge: totalLeadsCount > 0 ? totalLeadsCount : undefined,
      description: "Pipeline & WhatsApp Leads",
    },
    {
      name: "Add New Property",
      href: "/agent/add-property",
      icon: PlusCircle,
      badge: "Fast Post",
      highlight: true,
      description: "Direct Lahore Listings",
    },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800 z-30 shadow-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-800/80 bg-slate-950/40 flex-shrink-0">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/20 flex-shrink-0">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">EstatePro</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                Agent CRM
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Lahore Property Hub</span>
          </div>
        </div>

        {/* Agent Profile Summary Card */}
        <div className="px-5 py-4 mx-3 my-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center font-bold text-slate-900 shadow-md">
                AA
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-white truncate">Adeel & Associates</p>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              </div>
              <p className="text-xs text-emerald-400/90 font-medium">Verified Lahore Agent</p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
            <span>Active Listings: <strong className="text-white">{activeInventoryCount}</strong></span>
            <span>Leads: <strong className="text-emerald-400">{totalLeadsCount}</strong></span>
          </div>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Agent Dashboard
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative min-h-[46px]",
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0",
                    isActive ? "text-white" : item.highlight ? "text-emerald-400" : "text-slate-400"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0",
                          isActive
                            ? "bg-emerald-700 text-white border-emerald-500/40"
                            : item.highlight
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-[11px] font-normal truncate mt-0.5",
                      isActive ? "text-emerald-100" : "text-slate-400"
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}

          <div className="pt-5 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Tools & Public Site
          </div>

          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
              <span>Public Marketplace</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>
        </div>

        {/* Footer Quick Support Note */}
        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/20 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <span>Fast WhatsApp Close</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Click &apos;Match & WhatsApp&apos; on any lead card to instantly auto-match properties and send verified details.
          </p>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md flex-shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight">EstatePro</span>
              <span className="text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30">
                Agent CRM
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/agent/add-property"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all min-h-[38px]"
          >
            <PlusCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Add Property</span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Fixed Navigation Bar (min-height 48px tap targets) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        <Link
          href="/agent"
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl text-[11px] font-medium transition-colors min-h-[48px] min-w-[70px]",
            pathname === "/agent" ? "text-emerald-400 font-bold bg-slate-800/60" : "text-slate-400 hover:text-white"
          )}
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          <span>Leads CRM</span>
        </Link>

        <Link
          href="/agent/add-property"
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl text-[11px] font-medium transition-colors min-h-[48px] min-w-[70px]",
            pathname === "/agent/add-property"
              ? "text-emerald-400 font-bold bg-slate-800/60"
              : "text-slate-400 hover:text-white"
          )}
        >
          <PlusCircle className="h-5 w-5 flex-shrink-0" />
          <span>Add Listing</span>
        </Link>

        <Link
          href="/"
          target="_blank"
          className="flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl text-[11px] font-medium text-slate-400 hover:text-white transition-colors min-h-[48px] min-w-[70px]"
        >
          <ExternalLink className="h-5 w-5 flex-shrink-0" />
          <span>Marketplace</span>
        </Link>
      </nav>
    </>
  );
}
