"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Heart, MapPin, Trash2 } from "lucide-react";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";
import { formatLandArea, formatPKR } from "@/lib/utils";
import { useBuyerSavedProperties } from "./BuyerSavedPropertiesProvider";
import type { MarketplaceProperty } from "@/types/marketplace";

interface SavedProperty {
  propertyId: string;
  savedAt: string;
  property: MarketplaceProperty;
}

interface SavedPropertyPage {
  items: SavedProperty[];
  total: number;
}

function availabilityLabel(property: MarketplaceProperty) {
  if (property.status === "removed") return "Removed";
  if (property.status === "sold" || property.availabilityStatus === "sold") return "Sold";
  if (property.status === "rented" || property.availabilityStatus === "rented") return "Rented";
  if (property.availabilityStatus && property.availabilityStatus !== "available") {
    return property.availabilityStatus.replaceAll("_", " ");
  }
  return "Available";
}

export function BuyerSavedProperties() {
  const [sort, setSort] = useState("recent");
  const [items, setItems] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toggle } = useBuyerSavedProperties();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<SavedPropertyPage>>(
        "/buyer/saved-properties",
        { params: { sort } },
      );
      setItems(response.data.data.items);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (item: SavedProperty) => {
    if (!window.confirm(`Remove "${item.property.title}" from saved properties?`)) return;
    const success = await toggle(item.propertyId);
    if (success) setItems((current) => current.filter((saved) => saved.propertyId !== item.propertyId));
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs text-slate-500">Buyer Account / Saved Properties</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Saved Properties</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your saved listings and their current availability.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Sort by
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="recent">Recently saved</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
          <button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading saved properties…</p>
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const property = item.property;
            const availability = availabilityLabel(property);
            return (
              <article key={item.propertyId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="grid sm:grid-cols-[180px_minmax(0,1fr)]">
                  {property.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={property.images[0]} alt={property.title} className="h-40 w-full bg-slate-100 object-cover sm:h-full" />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 sm:h-full">No property image</div>
                  )}
                  <div className="flex min-w-0 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-emerald-700 dark:text-emerald-300">{formatPKR(property.price)}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        availability === "Available"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}>{availability}</span>
                    </div>
                    <h2 className="line-clamp-2 font-semibold text-slate-900 dark:text-white">{property.title}</h2>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {property.location.area}, {property.location.city}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {property.propertyType} · {property.purpose} · {formatLandArea(property.areaSize, property.areaUnit)}
                    </p>
                    <p className="mt-auto text-[11px] text-slate-500">
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Link href={`/property/${encodeURIComponent(property.id)}`} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">
                        View Details
                      </Link>
                      <button type="button" onClick={() => void remove(item)} aria-label={`Remove ${property.title} from saved`} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:border-red-300 hover:text-red-700 dark:border-slate-700 dark:text-slate-300">
                        <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : !error ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <Heart className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No saved properties yet</h2>
          <p className="mt-1 text-sm text-slate-500">Save a listing from the marketplace to keep it here.</p>
          <Link href="/properties" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">Browse properties</Link>
        </div>
      ) : null}
    </section>
  );
}
