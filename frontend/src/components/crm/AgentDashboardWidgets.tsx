"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Eye,
  Megaphone,
  MessageCircle,
  Phone,
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

/** Keeps the CRM desktop canvas dark and allows each screen to select its mobile surface. */
export function DarkCanvas({
  children,
  mobileTheme = "light",
}: {
  children: React.ReactNode;
  mobileTheme?: "light" | "dark";
}) {
  const mobileCanvas =
    mobileTheme === "dark" ? "max-md:bg-[#071B2B]" : "max-md:bg-white";
  const mobileText =
    mobileTheme === "dark" ? "max-md:text-white" : "max-md:text-[#101D32]";

  return (
    <>
      <div aria-hidden="true" className={cn("fixed inset-0 z-0 bg-[#0a1220] lg:left-72", mobileCanvas)} />
      <div className={cn("relative z-10 text-slate-100", mobileText)}>{children}</div>
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
        <h1 className="text-3xl font-bold tracking-tight text-white max-md:text-[#071B2B]">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-300 max-md:text-[#64748B]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

/* ---------------------------- Small shared bits --------------------------- */

export function RangeSelect({
  value,
  onChange,
  mobileTheme = "light",
}: {
  value: AdRange;
  onChange: (range: AdRange) => void;
  mobileTheme?: "light" | "dark";
}) {
  const mobileSelect =
    mobileTheme === "dark"
      ? "max-md:h-9 max-md:border-[#27465A] max-md:bg-[#071B2B] max-md:pl-3 max-md:pr-8 max-md:text-xs max-md:text-white"
      : "max-md:h-9 max-md:border-[#E2E8F0] max-md:bg-[#F8FAFC] max-md:pl-10 max-md:pr-9 max-md:text-xs max-md:text-[#101D32]";
  const mobileChevron =
    mobileTheme === "dark" ? "max-md:text-slate-300" : "max-md:text-[#64748B]";

  return (
    <div className="relative">
      <select
        aria-label="Date range"
        value={value}
        onChange={(e) => onChange(e.target.value as AdRange)}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-lg border border-[#27405f] bg-[#0b1524] pl-4 pr-10 text-sm text-slate-200 outline-none focus:border-emerald-500",
          mobileSelect,
        )}
      >
        {AD_RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <CalendarDays className={cn(
        "pointer-events-none absolute left-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-emerald-400",
        mobileTheme === "dark"
          ? "max-md:hidden"
          : "max-md:block max-md:text-[#17643B]",
      )} />
      <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300", mobileChevron)} />
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
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 max-md:text-[#64748B]">
      {items.map(([label, value], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="text-slate-600">|</span>}
          <span>
            {label}:             <strong className="font-semibold text-slate-100 max-md:text-[#101D32]">{fmt(value)}</strong>
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
    <section className={cn(PANEL, "overflow-hidden max-md:rounded-[22px] max-md:border-[#E3ECE9] max-md:bg-white max-md:shadow-[0_8px_24px_rgba(16,54,45,0.06)]")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 max-md:px-3.5 max-md:py-3">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-emerald-400 max-md:h-4 max-md:w-4 max-md:text-[#08783D]" />
          <h2 className="text-lg font-semibold text-white max-md:text-sm max-md:text-[#101D32]">
            <span className="hidden md:inline">Leads</span>
            <span className="md:hidden">Recent Leads</span>
          </h2>
        </div>
        <div className="flex items-center gap-4 max-md:gap-1">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="hidden items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-600/30 md:inline-flex"
          >
            <UserPlus className="h-4 w-4" />
            Add Lead
          </button>
          <button
            type="button"
            aria-label="Add lead"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8E7E1] bg-[#F2F9F5] text-[#08783D] md:hidden"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <Link
            href="/agent/leads"
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300 max-md:min-h-9 max-md:text-xs max-md:text-[#08783D]"
          >
            <span className="hidden md:inline">View All Leads</span>
            <span className="md:hidden">View All</span>
            <ArrowRight className="h-4 w-4 max-md:h-3.5 max-md:w-3.5" />
          </Link>
        </div>
      </div>

      {latest.length === 0 ? (
        <p className="border-t border-[#1a2a3f] px-5 py-10 text-center text-sm text-slate-400 max-md:border-[#E7EFEB] max-md:px-3 max-md:py-6 max-md:text-xs max-md:text-[#64748B]">
          No leads yet. Add your first lead to start tracking inquiries.
        </p>
      ) : (
        <div className="hidden overflow-x-auto md:block">
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

      {latest.length > 0 && (
        <ul className="space-y-2 border-t border-[#E7EFEB] p-3 md:hidden">
          {latest.slice(0, 3).map((lead) => {
            const phone = toIntlPhone(lead.clientPhone);
            return (
              <li key={lead.id} className="rounded-xl border border-[#E3ECE9] bg-[#F8FBF9] p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                      AVATAR_COLORS[lead.clientName.charCodeAt(0) % AVATAR_COLORS.length],
                    )}
                  >
                    {lead.clientName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[#101D32]">{lead.clientName}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-[#64748B]">
                      {lead.interest ?? lead.propertyType}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-[#64748B]">
                    <TimeAgo iso={lead.createdAt} />
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="max-w-[45%] truncate rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-600">
                    {lead.source ?? "Direct"}
                  </span>
                  {phone ? (
                    <span className="flex gap-1.5">
                      <a
                        href={`tel:+${phone}`}
                        aria-label={`Call ${lead.clientName}`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#D8E7E1] bg-white px-2 text-[10px] font-semibold text-[#1C2A3D]"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`WhatsApp ${lead.clientName}`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-800"
                      >
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </a>
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#64748B]">No contact number</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
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
