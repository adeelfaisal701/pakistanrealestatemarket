import React from "react";
import Link from "next/link";
import {
  PlusCircle,
  TrendingUp,
  Users,
  Building,
  DollarSign,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeadPipeline } from "@/components/crm/LeadPipeline";
import { INITIAL_CRM_LEADS, INITIAL_AGENT_PROPERTIES } from "@/lib/crm-mock-data";

export default function AgentCrmPipelinePage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
              Lahore Real Estate Desk
            </span>
            <span className="text-xs text-slate-400 font-medium">• Live Pipeline</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1.5">
            Agent CRM & Leads Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track buyer inquiries, auto-match inventory, and send 1-tap WhatsApp pitches with Lahore societies.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/agent/add-property" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md shadow-emerald-600/30">
              <PlusCircle className="h-4 w-4 flex-shrink-0" />
              <span>Post New Listing</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              Total Inquiries
            </span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 sm:mt-2">
            {INITIAL_CRM_LEADS.length}
          </div>
          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-emerald-600 font-semibold mt-1">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span>+2 new today</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              Site Visits
            </span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 sm:mt-2">
            3
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium truncate">Scheduled this week</p>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              Active Inventory
            </span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2">
            {INITIAL_AGENT_PROPERTIES.length}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium truncate">Auto-Match ready</p>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              Pipeline Value
            </span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 sm:mt-2">
            18.5 Cr
          </div>
          <p className="text-[11px] sm:text-xs text-emerald-600 font-semibold mt-1 truncate">Negotiation active</p>
        </Card>
      </div>

      {/* Main CRM Kanban Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Buyer Pipeline</span>
              <span className="text-xs font-normal text-slate-500">(New &rarr; Closed)</span>
            </h2>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline-block">
            Auto-Match inventory against preferred societies with 1 click
          </span>
        </div>

        <LeadPipeline
          initialLeads={INITIAL_CRM_LEADS}
          properties={INITIAL_AGENT_PROPERTIES}
        />
      </div>
    </div>
  );
}
