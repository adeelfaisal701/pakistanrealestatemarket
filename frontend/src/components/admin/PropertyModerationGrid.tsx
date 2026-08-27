"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Check,
  Search,
  Building,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
  Ban,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePropertyStore } from "@/lib/property-store";
import type { ModerationProperty } from "@/types/admin";

interface PropertyModerationGridProps {
  initialProperties?: ModerationProperty[];
}

export function PropertyModerationGrid({
  initialProperties,
}: PropertyModerationGridProps) {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Connect to global reactive property store
  const moderationProperties = usePropertyStore((state) => state.moderationProperties);
  const makePropertyLive = usePropertyStore((state) => state.makePropertyLive);
  const blockProperty = usePropertyStore((state) => state.blockProperty);
  const deleteProperty = usePropertyStore((state) => state.deleteProperty);

  const filteredProperties = useMemo(() => {
    return moderationProperties.filter((prop) => {
      const matchesStatus =
        statusFilter === "All" || prop.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.society.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.agentName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [moderationProperties, statusFilter, searchQuery]);

  const pendingCount = moderationProperties.filter((p) => p.status === "Pending Review").length;
  const liveCount = moderationProperties.filter((p) => p.status === "Live").length;
  const blockedCount = moderationProperties.filter((p) => p.status === "Blocked").length;

  return (
    <div className="space-y-6">
      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search listings by title, society, or poster agency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
            {[
              { label: "All", count: moderationProperties.length },
              { label: "Live", count: liveCount },
              { label: "Pending Review", count: pendingCount },
              { label: "Blocked", count: blockedCount },
            ].map(({ label, count }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(label)}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[38px] flex items-center gap-1.5 ${
                  statusFilter === label
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-300">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Post-Moderation Notice */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <span><strong>Post-Moderation Active:</strong> Listings from verified agents go Live instantly. Admins can block or remove spam below anytime.</span>
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Total Listings: {moderationProperties.length}
          </span>
        </div>
      </div>

      {/* Moderation Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredProperties.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
            <Building className="h-10 w-10 text-slate-400 mx-auto mb-3 flex-shrink-0" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              No listings found
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              No property items match your current moderation filter.
            </p>
          </div>
        ) : (
          filteredProperties.map((property) => {
            const isPending = property.status === "Pending Review";
            const isLive = property.status === "Live";
            const isBlocked = property.status === "Blocked";

            return (
              <div
                key={property.id}
                className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Property Image & Status Badges */}
                  <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {property.imageUrl ? (
                      <Image
                        src={property.imageUrl}
                        alt={property.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Building className="h-8 w-8" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                    {/* Top Status Tag */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {isLive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md">
                          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                          <span>Live On Marketplace</span>
                        </span>
                      )}
                      {isBlocked && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-md">
                          <Ban className="h-3 w-3 flex-shrink-0" />
                          <span>Blocked / Spam</span>
                        </span>
                      )}

                      {property.area && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/60 text-white backdrop-blur-sm">
                          {property.area}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3">
                      <span className="text-xl font-black text-white drop-shadow-md">
                        {property.price}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2">
                      {property.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{property.society}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Posted by:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate ml-2">
                        {property.agentName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => makePropertyLive(property.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold min-h-[40px] gap-1 shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Make Live</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => blockProperty(property.id)}
                        className="flex-1 text-xs font-bold min-h-[40px] gap-1"
                      >
                        <Ban className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Block</span>
                      </Button>
                    </>
                  )}

                  {isLive && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => blockProperty(property.id)}
                        className="flex-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-h-[40px] border-rose-200 dark:border-rose-800/60 font-bold"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                        <span>Block Listing</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteProperty(property.id)}
                        className="min-h-[40px] text-slate-400 hover:text-rose-600 px-3"
                      >
                        <Trash2 className="h-4 w-4 flex-shrink-0" />
                      </Button>
                    </>
                  )}

                  {isBlocked && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => makePropertyLive(property.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold min-h-[40px] gap-1"
                      >
                        <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Restore to Live</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteProperty(property.id)}
                        className="min-h-[40px] text-xs px-3"
                      >
                        <Trash2 className="h-4 w-4 flex-shrink-0" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
