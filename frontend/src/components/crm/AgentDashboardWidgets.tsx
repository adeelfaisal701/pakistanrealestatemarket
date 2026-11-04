"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Eye,
  Megaphone,
  MessageCircle,
  Phone,
  Plus,
  User,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PANEL } from "@/lib/agent-ui";
import {
  AD_RANGE_OPTIONS,
  type AdMetrics,
  type AdRange,
} from "@/lib/agent-dashboard-options";
import { toIntlPhone, useAgentStore } from "@/lib/agent-store";
import { TimeAgo } from "@/components/crm/TimeAgo";
import { AddLeadModal } from "@/components/crm/AgentModals";

export const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Paints a dark canvas behind the page content regardless of the OS theme,
 * so the dashboard always matches the dark design. Other agent pages are
 * unaffected because only pages that render it get the dark background.
 */
export function DarkCanvas({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-[#0a1220] lg:left-72" />
      <div className="relative z-10 text-slate-100">{children}</div>
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-300">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

/* ---------------------------- Small shared bits --------------------------- */

export function RangeSelect({
  value,
  onChange,
}: {
  value: AdRange;
  onChange: (range: AdRange) => void;
}) {
  return (
    <div className="relative">
      <select
        aria-label="Date range"
        value={value}
        onChange={(e) => onChange(e.target.value as AdRange)}
        className="h-10 cursor-pointer appearance-none rounded-lg border border-[#27405f] bg-[#0b1524] pl-4 pr-10 text-sm text-slate-200 outline-none focus:border-emerald-500"
      >
        {AD_RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
    </div>
  );
}

export function AdMetricsLine({ metrics }: { metrics: AdMetrics }) {
  const items: [string, number][] = [
    ["Views", metrics.views],
    ["Reach", metrics.reach],
    ["Calls", metrics.calls],
    ["WhatsApp", metrics.whatsapp],
  ];
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
      {items.map(([label, value], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="text-slate-600">|</span>}
          <span>
            {label}: <strong className="font-semibold text-slate-100">{fmt(value)}</strong>
          </span>
        </React.Fragment>
      ))}
    </p>
  );
}

/* ---------------------------------- Stats --------------------------------- */

const STAT_DEFS = [
  { key: "views", label: "Total Ad Views", icon: Eye, circle: "bg-emerald-500 shadow-emerald-500/30" },
  { key: "reach", label: "People Reached", icon: User, circle: "bg-blue-500 shadow-blue-500/30" },
  { key: "calls", label: "Calls Received", icon: Phone, circle: "bg-violet-600 shadow-violet-600/30" },
  { key: "whatsapp", label: "WhatsApp Clicks", icon: MessageCircle, circle: "bg-orange-500 shadow-orange-500/30" },
] as const;

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_DEFS.map(({ key, label, icon: Icon, circle }) => {
        return (
          <div key={key} className={cn(PANEL, "flex items-center gap-4 p-5")}>
            <div
              className={cn(
                "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full shadow-lg",
                circle
              )}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-300">{label}</p>
              <p className="text-3xl font-bold leading-tight text-white">—</p>
              <p className="mt-0.5 text-xs text-slate-400">Analytics not connected</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Leads table ------------------------------ */

const AVATAR_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500"];

export function LeadsTable() {
  const crmLeads = useAgentStore((s) => s.crmLeads);
  const [addOpen, setAddOpen] = useState(false);

  const latest = useMemo(
    () => [...crmLeads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [crmLeads]
  );

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25";

  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Leads</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-600/30"
          >
            <UserPlus className="h-4 w-4" />
            Add Lead
          </button>
          <Link
            href="/agent/leads"
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            View All Leads
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {latest.length === 0 ? (
        <p className="border-t border-[#1a2a3f] px-5 py-10 text-center text-sm text-slate-400">
          No leads yet. Add your first lead to start tracking inquiries.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-y border-[#1a2a3f] text-slate-300">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Interest</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Time</th>
                <th className="w-10 px-3 py-3" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {latest.map((lead) => {
                const phone = toIntlPhone(lead.clientPhone);
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-[#16243a] transition-colors last:border-b-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                            AVATAR_COLORS[lead.clientName.charCodeAt(0) % AVATAR_COLORS.length]
                          )}
                        >
                          {lead.clientName.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-100">{lead.clientName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{lead.interest ?? lead.propertyType}</td>
                    <td className="px-3 py-3 text-slate-300">{lead.source ?? "Direct"}                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a href={`tel:+${phone}`} className={pill}>
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={pill}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      <TimeAgo iso={lead.createdAt} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href="/agent/leads"
                        aria-label={`Open ${lead.clientName} in leads pipeline`}
                        className="inline-flex text-slate-400 transition-colors hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} />}
    </section>
  );
}

/* ------------------------------ Quick actions ----------------------------- */

const QUICK_ACTIONS = [
  { label: "Create New Ad", href: "/agent/add-property", icon: Megaphone, primary: true },
  { label: "View Leads", href: "/agent/leads", icon: Users, primary: false },
  { label: "Check Ad Performance", href: "/agent#ad-performance", icon: BarChart3, primary: false },
];

export function QuickActions() {
  return (
    <section className={cn(PANEL, "p-5")}>
      <div className="mb-3 flex items-center gap-2.5">
        <Zap className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
      </div>

      <div className="space-y-2.5">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon, primary }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex min-h-[48px] items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
              primary
                ? "border-emerald-500/50 bg-emerald-600/25 text-white hover:bg-emerald-600/35"
                : "border-[#1f3350] bg-[#101d31] text-slate-200 hover:bg-[#15253d]"
            )}
          >
            <Icon className={cn("h-5 w-5 flex-shrink-0", primary ? "text-emerald-300" : "text-slate-300")} />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}
