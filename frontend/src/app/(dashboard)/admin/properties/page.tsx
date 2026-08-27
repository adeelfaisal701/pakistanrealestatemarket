import React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ShieldAlert, AlertTriangle } from "lucide-react";
import { PropertyModerationGrid } from "@/components/admin/PropertyModerationGrid";
import { INITIAL_MODERATION_PROPERTIES } from "@/lib/admin-mock-data";

export const metadata = {
  title: "Property Moderation & Spam Removal | Super Admin",
  description: "Review, approve, or block submitted property listings across Lahore societies.",
};

export default function AdminPropertiesPage() {
  const pendingCount = INITIAL_MODERATION_PROPERTIES.filter(
    (p) => p.status === "Pending Review"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 mb-2 transition-colors min-h-[30px]"
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Back to Admin Overview</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Property Moderation & Spam Removal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review newly submitted real estate listings across Bahria, DHA, Lake City & Lahore societies before publishing live.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{pendingCount} Pending Moderation</span>
          </div>
        </div>
      </div>

      {/* Main Moderation Grid */}
      <PropertyModerationGrid initialProperties={INITIAL_MODERATION_PROPERTIES} />
    </div>
  );
}
