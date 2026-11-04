"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyCard } from "@/components/marketplace/property-card";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchPublicProperties } from "@/lib/public-properties";
import type { MarketplaceProperty } from "@/types/marketplace";
import { SaveSearchButton } from "@/components/buyer/SaveSearchButton";

interface SearchFields {
  purpose: string;
  city: string;
  keyword: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  feature: string;
}

const EMPTY_FIELDS: SearchFields = {
  purpose: "",
  city: "",
  keyword: "",
  propertyType: "",
  minPrice: "",
  maxPrice: "",
  feature: "",
};

function getFieldsFromUrl(): SearchFields {
  const query = new URLSearchParams(window.location.search);
  return {
    purpose: query.get("purpose") ?? "",
    city: query.get("city") ?? "",
    keyword: query.get("keyword") ?? query.get("area") ?? "",
    propertyType: query.get("propertyType") ?? "",
    minPrice: query.get("minPrice") ?? "",
    maxPrice: query.get("maxPrice") ?? "",
    feature: query.get("feature") ?? "",
  };
}

export default function PropertiesCatalogPage() {
  const router = useRouter();
  const [fields, setFields] = useState<SearchFields>(EMPTY_FIELDS);
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProperties = async (filters: SearchFields) => {
    setLoading(true);
    setError("");
    try {
      const results = await fetchPublicProperties({
        limit: 100,
        city: filters.city || undefined,
        area: filters.keyword || undefined,
        purpose: filters.purpose || undefined,
        propertyType: filters.propertyType || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        feature: filters.feature || undefined,
      });
      setProperties(results);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlFields = getFieldsFromUrl();
    setFields(urlFields);
    void loadProperties(urlFields);
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();
    Object.entries(fields).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    router.replace(`/properties${query.size ? `?${query.toString()}` : ""}`);
    void loadProperties(fields);
  };

  const updateField = (field: keyof SearchFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Properties for Sale &amp; Rent in Pakistan
        </h1>
        <form
          onSubmit={handleSearch}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-6"
        >
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Purpose
            <select
              value={fields.purpose}
              onChange={(event) => updateField("purpose", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
            >
              <option value="">Sale or rent</option>
              <option value="Sale">For sale</option>
              <option value="Rent">For rent</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            City
            <input
              value={fields.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="Any city"
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Area or society
            <input
              value={fields.keyword}
              onChange={(event) => updateField("keyword", event.target.value)}
              placeholder="Any area"
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Property type
            <select
              value={fields.propertyType}
              onChange={(event) => updateField("propertyType", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
            >
              <option value="">Any type</option>
              {["House", "Flat", "Upper Portion", "Lower Portion", "Plot", "Commercial"].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Feature
            <select
              value={fields.feature}
              onChange={(event) => updateField("feature", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
            >
              <option value="">Any feature</option>
              <option value="rooms:tvLounges">TV lounge</option>
              <option value="rooms:kitchens">Main kitchen</option>
              <option value="outdoor:lawnGardens">Lawn / garden</option>
              <option value="outdoor:openParking">Open parking</option>
              <option value="interior:centralAc">Central AC</option>
              <option value="interior:solarSystem">Solar system</option>
              <option value="community:gatedCommunity">Gated community</option>
              <option value="community:swimmingPool">Swimming pool</option>
              <option value="nearby:school">Nearby school</option>
              <option value="nearby:hospital">Nearby hospital</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Min price (PKR)
            <input
              type="number"
              min="0"
              value={fields.minPrice}
              onChange={(event) => updateField("minPrice", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="h-10 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Search
            </button>
          </div>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-start-2 lg:col-start-5">
            Max price (PKR)
            <input
              type="number"
              min="0"
              value={fields.maxPrice}
              onChange={(event) => updateField("maxPrice", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
            />
          </label>
        </form>
      </header>

      <section aria-live="polite">
        <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3 text-sm text-slate-500 dark:border-slate-800">
          <span>
            {loading ? "Loading listings…" : `${properties.length} published properties`}
          </span>
          <SaveSearchButton filters={{
            purpose: fields.purpose,
            city: fields.city,
            area: fields.keyword,
            propertyType: fields.propertyType,
            minPrice: fields.minPrice,
            maxPrice: fields.maxPrice,
            feature: fields.feature,
          }} />
        </div>
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            Loading published properties…
          </p>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadProperties(fields)}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : properties.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 dark:text-white">No published properties found</h2>
            <p className="mt-2 text-sm text-slate-500">Try changing your search filters.</p>
          </div>
        )}
      </section>
    </main>
  );
}
