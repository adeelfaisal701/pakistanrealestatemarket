"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyCard } from "@/components/marketplace/property-card";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchPublicPropertiesPage } from "@/lib/public-properties";
import type { MarketplaceProperty } from "@/types/marketplace";
import type { PaginationMeta } from "@/types";
import { SaveSearchButton } from "@/components/buyer/SaveSearchButton";

const PAGE_SIZE = 20;

interface SearchFields {
  purpose: string;
  city: string;
  keyword: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  areaUnit: string;
  bedrooms: string;
  feature: string;
  sortBy: string;
}

const EMPTY_FIELDS: SearchFields = {
  purpose: "",
  city: "",
  keyword: "",
  propertyType: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  areaUnit: "",
  bedrooms: "",
  feature: "",
  sortBy: "newest",
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
    minArea: query.get("minArea") ?? "",
    maxArea: query.get("maxArea") ?? "",
    areaUnit: query.get("areaUnit") ?? "",
    bedrooms: query.get("bedrooms") ?? "",
    feature: query.get("feature") ?? "",
    sortBy: query.get("sortBy") ?? "newest",
  };
}

function makeSearchUrl(filters: SearchFields, page: number) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  query.set("page", String(page));
  query.set("limit", String(PAGE_SIZE));
  return `/properties?${query.toString()}`;
}

export default function PropertiesCatalogPage() {
  const router = useRouter();
  const [fields, setFields] = useState<SearchFields>(EMPTY_FIELDS);
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const requestId = useRef(0);

  const loadProperties = async (filters: SearchFields, page: number) => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await fetchPublicPropertiesPage({
        page,
        limit: PAGE_SIZE,
        city: filters.city || undefined,
        area: filters.keyword || undefined,
        purpose: filters.purpose || undefined,
        propertyType: filters.propertyType || undefined,
        minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
        minArea: filters.minArea ? Number(filters.minArea) : undefined,
        maxArea: filters.maxArea ? Number(filters.maxArea) : undefined,
        areaUnit: filters.areaUnit || undefined,
        bedrooms: filters.bedrooms ? Number(filters.bedrooms) : undefined,
        feature: filters.feature || undefined,
        sortBy: filters.sortBy || "newest",
      });
      if (currentRequestId !== requestId.current) return;
      const lastPage = Math.max(result.pagination.totalPages, 1);
      if (page > lastPage) {
        router.replace(makeSearchUrl(filters, lastPage));
        setPagination({ ...result.pagination, page: lastPage });
        void loadProperties(filters, lastPage);
        return;
      }
      setProperties(result.properties);
      setPagination(result.pagination);
    } catch (requestError) {
      if (currentRequestId !== requestId.current) return;
      setError(getApiErrorMessage(requestError));
      setProperties([]);
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlFields = getFieldsFromUrl();
      const page = Math.max(1, Number(params.get("page")) || 1);
      setFields(urlFields);
      setPagination((current) => ({ ...current, page }));
      void loadProperties(urlFields, page);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      requestId.current += 1;
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.replace(makeSearchUrl(fields, 1));
    setPagination((current) => ({ ...current, page: 1 }));
    void loadProperties(fields, 1);
  };

  const updateField = (field: keyof SearchFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    const clearedFields = { ...EMPTY_FIELDS };
    setFields(clearedFields);
    setFiltersOpen(false);
    router.replace(makeSearchUrl(clearedFields, 1));
    setPagination((current) => ({ ...current, page: 1 }));
    void loadProperties(clearedFields, 1);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    router.push(makeSearchUrl(fields, page));
    setPagination((current) => ({ ...current, page }));
    void loadProperties(fields, page);
  };

  const searchSummary = [
    fields.city || fields.keyword
      ? [fields.city, fields.keyword].filter(Boolean).join(" · ")
      : "All locations",
    fields.purpose === "Sale" ? "For sale" : fields.purpose === "Rent" ? "For rent" : "Sale or rent",
    fields.propertyType || "Any property type",
  ].join(" · ");

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Ghar Safar Marketplace</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-700 sm:text-3xl">
            Properties for Sale &amp; Rent in Pakistan
          </h1>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,29,50,0.04),0_8px_24px_-16px_rgba(16,29,50,0.18)]">
          <div className="min-w-0">
            <p className="text-xs font-bold text-ink-700">Search summary</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{searchSummary}</p>
          </div>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="property-search-filters"
            onClick={() => setFiltersOpen((open) => !open)}
            className="min-h-10 shrink-0 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-600 hover:text-white"
          >
            {filtersOpen ? "Hide Filters" : "Filters"}
          </button>
        </div>
        {filtersOpen && <form
          id="property-search-filters"
          onSubmit={(event) => {
            handleSearch(event);
            setFiltersOpen(false);
          }}
          className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,29,50,0.04),0_8px_24px_-16px_rgba(16,29,50,0.18)] min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
        >
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Purpose
            <select
              value={fields.purpose}
              onChange={(event) => updateField("purpose", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
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
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Area or society
            <input
              value={fields.keyword}
              onChange={(event) => updateField("keyword", event.target.value)}
              placeholder="Any area"
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Property type
            <select
              value={fields.propertyType}
              onChange={(event) => updateField("propertyType", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
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
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
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
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-start-2 xl:col-start-5">
            Max price (PKR)
            <input
              type="number"
              min="0"
              value={fields.maxPrice}
              onChange={(event) => updateField("maxPrice", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Min area
            <input
              type="number"
              min="0"
              value={fields.minArea}
              onChange={(event) => updateField("minArea", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Max area
            <input
              type="number"
              min="0"
              value={fields.maxArea}
              onChange={(event) => updateField("maxArea", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Area unit
            <select
              value={fields.areaUnit}
              onChange={(event) => updateField("areaUnit", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            >
              <option value="">Any unit</option>
              {["Marla", "Kanal", "SqFt", "SqYd"].map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Bedrooms
            <select
              value={fields.bedrooms}
              onChange={(event) => updateField("bedrooms", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Sort by
            <select
              value={fields.sortBy}
              onChange={(event) => updateField("sortBy", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700 max-xl:h-12"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="featured">Featured first</option>
            </select>
          </label>
          <div className="flex items-end gap-2 min-[430px]:col-span-2 md:col-span-3 xl:col-span-6">
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 flex-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 max-xl:h-12"
            >
              Clear Filters
            </button>
            <button
              type="submit"
              className="h-10 flex-1 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 max-xl:h-12"
            >
              Apply / Search
            </button>
          </div>
        </form>}
      </header>

      <section aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 text-sm text-slate-500 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Search Results</h2>
            {loading
              ? <p>Loading listings…</p>
              : <p>{pagination.total} matching properties · Page {pagination.page} of {pagination.totalPages}</p>}
          </div>
          <SaveSearchButton filters={{
            purpose: fields.purpose,
            city: fields.city,
            area: fields.keyword,
            propertyType: fields.propertyType,
            minPrice: fields.minPrice,
            maxPrice: fields.maxPrice,
            minArea: fields.minArea,
            maxArea: fields.maxArea,
            areaUnit: fields.areaUnit,
            bedrooms: fields.bedrooms,
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
              onClick={() => void loadProperties(fields, pagination.page)}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : properties.length ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
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
        {!loading && !error && pagination.totalPages > 1 && (
          <nav aria-label="Property result pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                aria-current={page === pagination.page ? "page" : undefined}
                className={`min-h-10 min-w-10 rounded-lg px-3 text-sm font-semibold ${
                  page === pagination.page
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
