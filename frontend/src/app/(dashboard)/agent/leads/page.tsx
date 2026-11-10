import React from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadPipeline } from "@/components/crm/LeadPipeline";

export const metadata = {
  title: "Leads Pipeline | Ghar Safar Agent CRM",
  description: "Track buyer inquiries, auto-match inventory, and send 1-tap WhatsApp pitches.",
};

// This is the original CRM Kanban pipeline page, moved here from /agent so the
// /agent route can host the new dashboard.
export default function AgentLeadsPipelinePage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
              Lahore Real Estate Desk
            </span>
            <span className="text-xs text-slate-400 font-medium">• Agent Pipeline</span>
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

        <LeadPipeline />
      </div>
    </div>
  );
}
