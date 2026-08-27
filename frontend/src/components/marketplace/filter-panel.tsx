"use client";

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface FilterPanelProps {
  onFilterChange?: (filters: Record<string, any>) => void;
}

export function FilterPanel({ onFilterChange }: FilterPanelProps) {
  return (
    <Card className="p-5 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-base">
          <Filter className="h-4 w-4 text-emerald-600" />
          <span>Filters</span>
        </div>
        <button
          type="button"
          className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Property Type
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {["House", "Flat", "Plot", "Upper Portion", "Lower Portion", "Commercial"].map((t) => (
            <button
              key={t}
              type="button"
              className="px-3 py-2 text-left rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Area Unit & Size */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Area Size (Marla / Kanal)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-1/2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-transparent"
          />
          <input
            type="number"
            placeholder="Max"
            className="w-1/2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-transparent"
          />
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Price Range (PKR)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min Price"
            className="w-1/2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-transparent"
          />
          <input
            type="number"
            placeholder="Max Price"
            className="w-1/2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-transparent"
          />
        </div>
      </div>

      <Button className="w-full text-xs font-semibold">Apply Filters</Button>
    </Card>
  );
}
