"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Phone,
  MessageSquare,
  MessageCircle,
  Sparkles,
  MapPin,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CRMLead, LeadStatus } from "@/types/crm";

interface LeadCardProps {
  lead: CRMLead;
  onStatusChange: (leadId: string, nextStatus: LeadStatus) => void;
  statusSaving?: boolean;
  statusFeedback?: { type: "success" | "error"; message: string };
  onAutoMatch: (lead: CRMLead) => void;
  onWhatsAppPitch: (lead: CRMLead) => void;
}

const STAGES: LeadStatus[] = ["New", "Connected", "Site Visit", "Negotiation", "Closed Won", "Lost"];

export function LeadCard({
  lead,
  onStatusChange,
  statusSaving = false,
  statusFeedback,
  onAutoMatch,
  onWhatsAppPitch,
}: LeadCardProps) {
  const getStageBadgeColor = (status: LeadStatus) => {
    switch (status) {
      case "New":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/90 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Connected":
        return "bg-green-50 text-green-700 dark:bg-green-950/90 dark:text-green-300 border-green-200 dark:border-green-800";
      case "Site Visit":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/90 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "Negotiation":
        return "bg-orange-50 text-orange-700 dark:bg-orange-950/90 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      case "Closed Won":
        return "bg-teal-50 text-teal-700 dark:bg-teal-950/90 dark:text-teal-300 border-teal-200 dark:border-teal-800";
      case "Lost":
        return "bg-red-50 text-red-700 dark:bg-red-950/90 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <>
    <article className="group hidden w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900 sm:flex-row sm:items-stretch sm:p-5 lg:flex">
      {lead.propertyImageUrl ? (
        <img
          src={lead.propertyImageUrl}
          alt=""
          className="h-40 w-full shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-800 sm:h-auto sm:w-40"
        />
      ) : (
        <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 sm:h-auto sm:w-24">
          <Building2 className="h-8 w-8" />
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{lead.clientName}</h3>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {lead.requirement} · {lead.propertyType}
          </span>
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {lead.interest || `${lead.propertyType} · ${lead.requirement}`}
        </p>
        {lead.clientPhone ? (
          <a
            href={`tel:${lead.clientPhone}`}
            className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400"
          >
            <Phone className="h-3 w-3 text-emerald-600" />
            +{lead.clientPhone}
          </a>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">No phone provided</p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            PKR {lead.budgetMin}{lead.budgetMax !== lead.budgetMin ? ` – ${lead.budgetMax}` : ""}
          </span>
          {lead.preferredSocieties?.length > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              {lead.preferredSocieties.join(", ")}
            </span>
          )}
        </div>
        {lead.notes && (
          <p className="whitespace-pre-wrap text-sm leading-5 text-slate-600 dark:text-slate-400">
            {lead.notes}
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onWhatsAppPitch(lead)}
            className="min-h-[38px] gap-1.5 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            onClick={() => onAutoMatch(lead)}
            className="min-h-[38px] gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Match & Share
          </Button>
          {lead.conversationId && (
            <Link
              href={`/agent/calls?conversation=${encodeURIComponent(lead.conversationId)}`}
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-emerald-200 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Open Chat
            </Link>
          )}
        </div>
      </div>

      <aside className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:w-44 sm:flex-col sm:items-end sm:justify-start sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0 dark:border-slate-800">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStageBadgeColor(lead.status)}`}>
          {lead.status}
        </span>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:w-full">
          Lead status
          <select
            aria-label={`Stage for ${lead.clientName}`}
            value={lead.status}
            onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
            disabled={statusSaving}
            className={`min-h-[40px] w-full rounded-lg border bg-white px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-wait disabled:opacity-60 dark:bg-slate-950 ${getStageBadgeColor(lead.status)}`}
          >
            {STAGES.map((status) => (
              <option key={status} value={status} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                {status}
              </option>
            ))}
          </select>
        </label>
        {statusSaving && <p role="status" className="text-xs text-slate-500">Saving…</p>}
        {statusFeedback && (
          <p
            role={statusFeedback.type === "error" ? "alert" : "status"}
            className={`text-right text-xs ${
              statusFeedback.type === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {statusFeedback.message}
          </p>
        )}
      </aside>
    </article>
    <article className="grid w-full grid-cols-[56px_minmax(0,1fr)] gap-x-2.5 gap-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900 lg:hidden">
      {lead.propertyImageUrl ? (
        <img
          src={lead.propertyImageUrl}
          alt=""
          className="col-start-1 row-start-1 h-14 w-14 rounded-lg bg-slate-100 object-cover dark:bg-slate-800"
        />
      ) : (
        <div className="col-start-1 row-start-1 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
          <Building2 className="h-6 w-6" />
        </div>
      )}

      <div className="col-start-2 row-start-1 min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <h3 className="mr-1 min-w-0 break-words text-sm font-bold leading-tight text-slate-900 dark:text-white">
            {lead.clientName}
          </h3>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {lead.requirement}
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {lead.propertyType}
          </span>
        </div>
        <p className="break-words text-xs font-medium leading-4 text-slate-700 dark:text-slate-200">
          {lead.interest || `${lead.propertyType} · ${lead.requirement}`}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          {lead.clientPhone ? (
            <a
              href={`tel:${lead.clientPhone}`}
              className="inline-flex min-h-5 items-center gap-1 font-mono hover:text-emerald-600"
            >
              <Phone className="h-3 w-3 shrink-0 text-emerald-600" />
              <span className="break-all">+{lead.clientPhone}</span>
            </a>
          ) : (
            <span>No phone provided</span>
          )}
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
            <DollarSign className="h-3 w-3 shrink-0 text-emerald-600" />
            {lead.budgetMin === "TBD" || !lead.budgetMin
              ? "Price TBD"
              : `PKR ${lead.budgetMin}${lead.budgetMax !== lead.budgetMin ? ` – ${lead.budgetMax}` : ""}`}
          </span>
        </div>
      </div>

      {(lead.source || lead.notes || lead.preferredSocieties?.length > 0) && (
        <div className="col-span-2 min-w-0 space-y-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          {lead.preferredSocieties?.length > 0 && (
            <p className="flex min-w-0 items-start gap-1">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
              <span className="break-words">{lead.preferredSocieties.join(", ")}</span>
            </p>
          )}
          {(lead.source || lead.notes) && (
            <p className="break-words">
              {lead.source && <span className="font-semibold text-slate-600 dark:text-slate-300">{lead.source}</span>}
              {lead.source && lead.notes && <span> · </span>}
              {lead.notes}
            </p>
          )}
        </div>
      )}

      <div className="col-span-2 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onWhatsAppPitch(lead)}
          className="min-h-11 min-w-0 gap-1 px-1.5 text-[10px] leading-tight"
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="min-w-0 whitespace-normal text-center">WhatsApp</span>
        </Button>
        <Button
          size="sm"
          onClick={() => onAutoMatch(lead)}
          className="min-h-11 min-w-0 gap-1 bg-emerald-600 px-1.5 text-[10px] leading-tight text-white hover:bg-emerald-700"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span className="min-w-0 whitespace-normal text-center">Match &amp; Share</span>
        </Button>
        {lead.conversationId && (
          <Link
            href={`/agent/calls?conversation=${encodeURIComponent(lead.conversationId)}`}
            className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-md border border-emerald-200 px-1.5 text-[10px] font-medium leading-tight text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 whitespace-normal text-center">Open Chat</span>
          </Link>
        )}
      </div>

      <aside className="col-span-2 min-w-0 border-t border-slate-100 pt-2 dark:border-slate-800">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lead Status</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStageBadgeColor(lead.status)}`}>
            {lead.status}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label={`Lead status for ${lead.clientName}`}>
          {STAGES.map((status) => {
            const active = lead.status === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                aria-label={`Set ${lead.clientName} status to ${status}`}
                onClick={() => onStatusChange(lead.id, status)}
                disabled={statusSaving || active}
                className={`min-h-11 shrink-0 rounded-full border px-2.5 text-[10px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                  active
                    ? getStageBadgeColor(status)
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
        {statusSaving && <p role="status" className="mt-1 text-[10px] text-slate-500">Saving…</p>}
        {statusFeedback && (
          <p
            role={statusFeedback.type === "error" ? "alert" : "status"}
            className={`mt-1 break-words text-[10px] ${
              statusFeedback.type === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {statusFeedback.message}
          </p>
        )}
      </aside>
    </article>
    </>
  );
}
