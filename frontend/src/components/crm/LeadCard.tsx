"use client";

import React from "react";
import {
  Phone,
  MessageSquare,
  Sparkles,
  MapPin,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CRMLead, LeadStatus } from "@/types/crm";

interface LeadCardProps {
  lead: CRMLead;
  onStatusChange: (leadId: string, nextStatus: LeadStatus) => void;
  onAutoMatch: (lead: CRMLead) => void;
  onWhatsAppPitch: (lead: CRMLead) => void;
}

const STAGES: LeadStatus[] = ["New", "Contacted", "Site Visit", "Negotiation", "Closed"];

export function LeadCard({
  lead,
  onStatusChange,
  onAutoMatch,
  onWhatsAppPitch,
}: LeadCardProps) {
  const getStageBadgeColor = (status: LeadStatus) => {
    switch (status) {
      case "New":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/90 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Contacted":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/90 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "Site Visit":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/90 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Negotiation":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "Closed":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/90 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all duration-200 space-y-3 w-full">
      {/* Header: Name, Requirement & Status selector */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-full">
              {lead.clientName}
            </h4>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
              {lead.requirement} • {lead.propertyType}
            </span>
          </div>
          <a
            href={`tel:${lead.clientPhone}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 mt-1 font-mono transition-colors min-h-[24px]"
          >
            <Phone className="h-3 w-3 text-emerald-600 flex-shrink-0" />
            <span>+{lead.clientPhone}</span>
          </a>
        </div>

        {/* Stage Mover Selector */}
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
          className={`text-xs font-semibold rounded-xl px-2 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors flex-shrink-0 min-h-[34px] ${getStageBadgeColor(
            lead.status
          )}`}
        >
          {STAGES.map((s) => (
            <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Budget Pill */}
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          Budget:
        </span>
        <span className="font-extrabold text-slate-900 dark:text-emerald-400 truncate ml-2">
          PKR {lead.budgetMin} – {lead.budgetMax}
        </span>
      </div>

      {/* Preferred Societies Chips */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
          Preferred Societies:
        </span>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {lead.preferredSocieties?.map((soc) => (
            <span
              key={soc}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 truncate max-w-full"
            >
              <MapPin className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">{soc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Notes if available */}
      {lead.notes && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50/50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50 line-clamp-2">
          &ldquo;{lead.notes}&rdquo;
        </p>
      )}

      {/* Bottom Action Buttons: min-height 38px for touch */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onWhatsAppPitch(lead)}
          className="flex-1 text-xs gap-1.5 min-h-[38px] border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 px-2"
        >
          <MessageSquare className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span>WhatsApp</span>
        </Button>

        <Button
          size="sm"
          onClick={() => onAutoMatch(lead)}
          className="flex-1 text-xs gap-1.5 min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300 flex-shrink-0" />
          <span>Match & Share</span>
        </Button>
      </div>
    </div>
  );
}
