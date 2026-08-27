"use client";

import React from "react";
import { LeadCard } from "@/components/crm/lead-card";
import type { Lead, LeadStatus } from "@/types";

export interface PipelineBoardProps {
  leads?: Lead[];
}

const STAGES: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "New Leads", color: "border-blue-500" },
  { key: "contacted", label: "Contacted", color: "border-amber-500" },
  { key: "site_visit_scheduled", label: "Site Visits", color: "border-emerald-500" },
  { key: "negotiation", label: "Negotiation", color: "border-purple-500" },
  { key: "closed_won", label: "Closed / Deals", color: "border-green-600" },
];

export function PipelineBoard({ leads = [] }: PipelineBoardProps) {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1000px]">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.status === stage.key);

          return (
            <div
              key={stage.key}
              className="flex-1 bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col min-w-[240px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full border-2 ${stage.color}`} />
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    {stage.label}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-full font-bold text-slate-600 dark:text-slate-400">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Leads List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                {stageLeads.length > 0 ? (
                  stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
