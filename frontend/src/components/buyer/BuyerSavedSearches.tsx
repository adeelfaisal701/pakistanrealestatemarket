"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, BellOff, MapPin, Search, Trash2 } from "lucide-react";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type AlertFrequency = "instant" | "daily" | "weekly" | "off";

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, string>;
  frequency: AlertFrequency;
  alertsEnabled: boolean;
  matchCount: number;
  createdAt: string;
  lastAlertAt?: string | null;
}

function describe(search: SavedSearch) {
  const filters = search.filters;
  const location = [filters.area, filters.society, filters.block, filters.city]
    .filter(Boolean)
    .join(", ");
  const budget = [
    filters.minPrice && `PKR ${Number(filters.minPrice).toLocaleString()}`,
    filters.maxPrice && `PKR ${Number(filters.maxPrice).toLocaleString()}`,
  ].filter(Boolean).join(" – ");
  const area = [
    filters.minArea && `${filters.minArea} min area`,
    filters.maxArea && `${filters.maxArea} max area`,
  ].filter(Boolean).join(" · ");
  return {
    location: location || "Any location",
    specs: [
      filters.propertyType,
      filters.purpose,
      budget && `Budget ${budget}`,
      area,
      filters.bedrooms && `${filters.bedrooms}+ bedrooms`,
      filters.bathrooms && `${filters.bathrooms}+ bathrooms`,
    ].filter(Boolean),
  };
}

export function BuyerSavedSearches() {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<SavedSearch[]>>("/buyer/saved-searches");
      if (!Array.isArray(response.data.data)) {
        throw new Error("The saved searches response was invalid. Please retry.");
      }
      setItems(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (item: SavedSearch, changes: Partial<SavedSearch>) => {
    setActingId(item.id);
    setError("");
    try {
      await apiClient.patch(`/buyer/saved-searches/${encodeURIComponent(item.id)}`, changes);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const rename = async (item: SavedSearch) => {
    const name = window.prompt("Update saved search name:", item.name)?.trim();
    if (!name || name === item.name) return;
    await update(item, { name });
  };

  const remove = async (item: SavedSearch) => {
    if (!window.confirm(`Delete saved search "${item.name}" and stop its alerts?`)) return;
    setActingId(item.id);
    setError("");
    try {
      await apiClient.delete(`/buyer/saved-searches/${encodeURIComponent(item.id)}`);
      setItems((current) => current.filter((saved) => saved.id !== item.id));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <p className="mb-2 text-xs text-slate-500">Buyer Account / Saved Searches</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Saved Search Alerts</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage saved criteria, matches and notification frequency.</p>
      </header>
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
          <button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading saved searches…</p>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((item) => {
            const details = describe(item);
            const viewParams = new URLSearchParams(item.filters);
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 dark:text-white">{item.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="h-4 w-4 shrink-0" />{details.location}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{details.specs.join(" · ") || "No additional criteria"}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.alertsEnabled && item.frequency !== "off" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {item.alertsEnabled && item.frequency !== "off" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    {item.alertsEnabled && item.frequency !== "off" ? "Alerts on" : "Alerts off"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {item.matchCount} matching properties
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    Frequency
                    <select
                      value={item.frequency}
                      disabled={actingId === item.id}
                      onChange={(event) => void update(item, { frequency: event.target.value as AlertFrequency, alertsEnabled: event.target.value !== "off" })}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="instant">Instant</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="off">Off</option>
                    </select>
                  </label>
                  <span className="text-xs text-slate-500">Created {new Date(item.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs text-slate-500">Last alert {item.lastAlertAt ? new Date(item.lastAlertAt).toLocaleDateString() : "—"}</span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Link href={`/properties?${viewParams.toString()}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">
                      <Search className="h-3.5 w-3.5" />View matches
                    </Link>
                    <Button type="button" size="sm" variant="outline" disabled={actingId === item.id} onClick={() => void rename(item)}>Edit name</Button>
                    <Button type="button" size="sm" variant="danger" disabled={actingId === item.id} onClick={() => void remove(item)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : !error ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <Search className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No saved searches</h2>
          <p className="mt-1 text-sm text-slate-500">Search marketplace listings and save your filters to start alerts.</p>
          <Link href="/properties" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">Search properties</Link>
        </div>
      ) : null}
    </section>
  );
}
