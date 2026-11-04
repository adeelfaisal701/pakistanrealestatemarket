"use client";

import { useState } from "react";
import { BellPlus } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/lib/api-client";

export function SaveSearchButton({
  filters,
}: {
  filters: Record<string, string>;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setMessage("");
    setError("");
    const token = localStorage.getItem("auth_token");
    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    const name = window.prompt("Give this saved search a name:")?.trim();
    if (!name) return;

    setSaving(true);
    try {
      await apiClient.post("/buyer/saved-searches", {
        name,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value.trim()),
        ),
        frequency: "instant",
      });
      setMessage(`Saved "${name}" with instant alerts.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
      >
        <BellPlus className="h-4 w-4" />
        {saving ? "Saving…" : "Save Search Alert"}
      </button>
      {message && <span role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{message}</span>}
      {error && <span role="alert" className="text-xs text-red-600 dark:text-red-300">{error}</span>}
    </div>
  );
}
