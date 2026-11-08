import React from "react";
import { DollarSign, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { formatPKR } from "@/lib/utils";
import type { Lead } from "@/types";

export interface LeadCardProps {
  lead: Lead;
  onStatusChange?: (leadId: string, newStatus: Lead["status"]) => void;
}

export function LeadCard({ lead }: LeadCardProps) {
  const statusBadgeVariant = {
    new: "warning",
    contacted: "secondary",
    site_visit_scheduled: "default",
    negotiation: "warning",
    closed_won: "success",
    lost: "danger",
  } as const;

  return (
    <Card className="p-4 space-y-3 hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
            {lead.clientName}
          </h4>
          <p className="text-xs text-slate-500">{lead.clientPhone}</p>
        </div>
        <Badge variant={statusBadgeVariant[lead.status] || "default"}>
          {lead.status.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </div>

      {lead.propertyTitle && (
        <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500">Property: </span>
          {lead.propertyTitle}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        {lead.budget && (
          <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{formatPKR(lead.budget)}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-[11px]">
          <Clock className="h-3 w-3" />
          <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
        <WhatsAppButton
          phoneNumber={lead.clientPhone}
          message={`Salam ${lead.clientName}, regarding your property query on ZameenConnect...`}
          size="sm"
          className="w-full text-xs"
        />
      </div>
    </Card>
  );
}
