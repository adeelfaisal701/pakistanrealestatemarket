"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  UserCheck,
  Building2,
  ExternalLink,
  Shield,
  Layers,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  pendingAgentsCount?: number;
  pendingPropertiesCount?: number;
}

export function AdminSidebar({
  pendingAgentsCount = 2,
  pendingPropertiesCount = 2,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Overview & Analytics",
      href: "/admin",
      icon: LayoutDashboard,
      description: "Platform health & KPIs",
    },
    {
      name: "Agent Approvals",
      href: "/admin/agents",
      icon: UserCheck,
      badge: pendingAgentsCount > 0 ? `${pendingAgentsCount} Pending` : undefined,
      badgeVariant: "warning",
      description: "Verify local brokers",
    },
    {
      name: "Property Moderation",
      href: "/admin/properties",
      icon: Building2,
      badge: pendingPropertiesCount > 0 ? `${pendingPropertiesCount} Review` : undefined,
      badgeVariant: "danger",
      description: "Approve or block listings",
    },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-slate-950 text-slate-100 border-r border-slate-800 z-30 shadow-2xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-950/50 border border-rose-400/20 flex-shrink-0">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-white">EstatePro</span>
              <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full border border-rose-500/30">
                Super Admin
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Control Central</span>
          </div>
        </div>

        {/* Admin Identity Badge */}
        <div className="px-5 py-4 mx-3 my-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                SA
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-slate-950" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-white truncate">Super Administrator</p>
                <Shield className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">Full Platform Access</p>
            </div>
          </div>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Admin Management
          </div>

          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative min-h-[48px]",
                  isActive
                    ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-950/60 font-semibold"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0",
                    isActive ? "text-white" : "text-slate-400"
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
                            ? "bg-white/20 text-white border-white/30"
                            : item.badgeVariant === "warning"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-[11px] font-normal truncate mt-0.5",
                      isActive ? "text-rose-100" : "text-slate-400"
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}

          <div className="pt-5 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Cross Portals
          </div>

          <Link
            href="/agent"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-all group min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              <Layers className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Agent CRM Portal</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>

          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-all group min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-rose-400 transition-colors flex-shrink-0" />
              <span>Public Marketplace</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>
        </div>

        {/* Security Warning Footer */}
        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/20 text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Strict Moderation</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            All agent approvals require CNIC and phone verification before enabling Level 2 trust badges.
          </p>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight">EstatePro</span>
              <span className="text-[9px] font-bold uppercase bg-rose-500/20 text-rose-400 px-1 py-0.2 rounded border border-rose-500/30">
                Super Admin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/agents"
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-sm transition-all min-h-[38px]"
          >
            <UserCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Approvals</span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (min-height 48px tap targets) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        <Link
          href="/admin"
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors min-h-[48px] min-w-[70px]",
            pathname === "/admin" ? "text-rose-400 font-bold bg-slate-900" : "text-slate-400 hover:text-white"
          )}
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          <span>Overview</span>
        </Link>

        <Link
          href="/admin/agents"
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors min-h-[48px] min-w-[70px]",
            pathname === "/admin/agents" ? "text-rose-400 font-bold bg-slate-900" : "text-slate-400 hover:text-white"
          )}
        >
          <UserCheck className="h-5 w-5 flex-shrink-0" />
          <span>Agents</span>
        </Link>

        <Link
          href="/admin/properties"
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors min-h-[48px] min-w-[70px]",
            pathname === "/admin/properties" ? "text-rose-400 font-bold bg-slate-900" : "text-slate-400 hover:text-white"
          )}
        >
          <Building2 className="h-5 w-5 flex-shrink-0" />
          <span>Properties</span>
        </Link>

        <Link
          href="/"
          target="_blank"
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium text-slate-400 hover:text-white transition-colors min-h-[48px] min-w-[70px]"
        >
          <ExternalLink className="h-5 w-5 flex-shrink-0" />
          <span>Public</span>
        </Link>
      </nav>
    </>
  );
}
