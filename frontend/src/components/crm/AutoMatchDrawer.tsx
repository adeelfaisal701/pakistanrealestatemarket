"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Sparkles,
  Building,
  BedDouble,
  Bath,
  MapPin,
  Send,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CRMLead, AgentPropertyListing } from "@/types/crm";

interface AutoMatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CRMLead | null;
  properties: AgentPropertyListing[];
  onSelectPropertyForWhatsApp: (property: AgentPropertyListing) => void;
}

interface ScoredProperty {
  property: AgentPropertyListing;
  score: number;
  matchReasons: string[];
}

export function AutoMatchDrawer({
  isOpen,
  onClose,
  lead,
  properties,
  onSelectPropertyForWhatsApp,
}: AutoMatchDrawerProps) {
  // Compute matching score
  const matchedProperties = useMemo(() => {
    if (!lead) return [];

    const scored: ScoredProperty[] = properties.map((prop) => {
      let score = 50;
      const matchReasons: string[] = [];

      // 1. Society match
      const leadSocieties = lead.preferredSocieties || [];
      const societyMatched = leadSocieties.some(
        (soc) =>
          prop.society.toLowerCase().includes(soc.toLowerCase()) ||
          soc.toLowerCase().includes(prop.society.toLowerCase())
      );
      if (societyMatched) {
        score += 35;
        matchReasons.push(prop.society);
      }

      // 2. Property type match
      if (prop.propertyType && lead.propertyType) {
        if (prop.propertyType.toLowerCase() === lead.propertyType.toLowerCase()) {
          score += 15;
          matchReasons.push(prop.propertyType);
        }
      } else {
        score += 10;
      }

      // 3. Status active
      if (prop.status === "Active") {
        matchReasons.push("Active");
      }

      const clampedScore = Math.min(score, 99);
      return { property: prop, score: clampedScore, matchReasons };
    });

    return scored.sort((a, b) => b.score - a.score);
  }, [lead, properties]);

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-full sm:max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col h-full">
          {/* Top Header */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-950 to-slate-900 text-white border-b border-emerald-800/40 flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Smart Inventory Matcher</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Auto-Matched Properties</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Matching inventory for <strong className="text-emerald-300">{lead.clientName}</strong>
                </p>
              </div>
              <button
                onClick={onClose}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lead Preferences summary pill */}
            <div className="mt-3 sm:mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Requirement</span>
                <span className="font-semibold text-emerald-300">
                  {lead.requirement} ({lead.propertyType})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Budget Range</span>
                <span className="font-semibold text-white">
                  {lead.budgetMin} – {lead.budgetMax}
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 text-[10px] uppercase mr-1">Preferred:</span>
                {lead.preferredSocieties?.map((soc) => (
                  <span
                    key={soc}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 text-[11px] font-medium truncate max-w-full"
                  >
                    {soc}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {matchedProperties.length} Matching Options
              </span>
              <span className="text-[11px] text-slate-400">Ranked by society & type fit</span>
            </div>

            {matchedProperties.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Building className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-50 flex-shrink-0" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No matching inventory found
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Add a property in {lead.preferredSocieties?.join(", ") || "Lahore"} to pitch to this buyer.
                </p>
                <Link
                  href="/agent/add-property"
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all min-h-[44px]"
                >
                  <PlusCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Add Property Listing</span>
                </Link>
              </div>
            ) : (
              matchedProperties.map(({ property, score, matchReasons }) => (
                <div
                  key={property.id}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all space-y-3"
                >
                  {/* Top Bar with Match Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          score >= 80
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        <TrendingUp className="h-3 w-3 flex-shrink-0" />
                        <span>{score}% Match</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {property.area}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {property.price}
                      </span>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="flex gap-3">
                    {property.imageUrl ? (
                      <div className="relative h-18 w-20 sm:w-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                        <Image
                          src={property.imageUrl}
                          alt={property.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="h-18 w-20 sm:w-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400">
                        <Building className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {property.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{property.society}</span>
                      </div>

                      {property.beds > 0 && (
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{property.beds} Beds</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{property.baths} Baths</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Match Badges & Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {matchReasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-medium flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />
                          <span>{reason}</span>
                        </span>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onSelectPropertyForWhatsApp(property)}
                      className="w-full sm:w-auto min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-sm flex-shrink-0"
                    >
                      <Send className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Pitch on WhatsApp</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-slate-500 truncate mr-2">
              Matches update dynamically
            </span>
            <Button variant="outline" size="sm" onClick={onClose} className="min-h-[38px]">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
