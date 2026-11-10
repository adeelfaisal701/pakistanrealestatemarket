import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AddPropertyForm } from "@/components/crm/AddPropertyForm";

export const metadata = {
  title: "Add New Property Listing | Ghar Safar Agent",
  description: "Post a verified property listing in Lahore societies with instant CRM auto-match.",
};

export default function AddPropertyPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div>
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 mb-2 transition-colors min-h-[30px]"
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Back to Leads Pipeline</span>
          </Link>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Add New Property Listing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Publish verified inventory across Bahria Town, DHA, Lake City, and top Lahore societies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span>Server submission · admin review required</span>
          </div>
        </div>
      </div>

      {/* Add Property Form */}
      <AddPropertyForm />
    </div>
  );
}
