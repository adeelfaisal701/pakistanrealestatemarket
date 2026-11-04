"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useBuyerSavedProperties } from "./BuyerSavedPropertiesProvider";

export function SavePropertyButton({
  propertyId,
  compact = false,
}: {
  propertyId: string;
  compact?: boolean;
}) {
  const { propertyIds, loading, toggle } = useBuyerSavedProperties();
  const [saving, setSaving] = useState(false);
  const saved = propertyIds.has(propertyId);

  const handleClick = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await toggle(propertyId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={saving}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved properties" : "Save property"}
      title={saved ? "Remove from saved properties" : "Save property"}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${
        compact ? "w-10 p-0" : "px-3 text-sm"
      }`}
    >
      <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : ""} ${loading ? "opacity-60" : ""}`} />
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}
