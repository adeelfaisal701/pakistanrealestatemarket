"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  AlertCircle,
  ArrowDownWideNarrow,
  Building2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  RotateCcw,
  Search,
} from "lucide-react";
import { DarkCanvas } from "@/components/crm/AgentDashboardWidgets";
import { ShareExactLocationControl } from "@/components/crm/ShareExactLocationControl";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { PANEL } from "@/lib/agent-ui";

type InventoryStatus =
  | "available"
  | "sold"
  | "rented"
  | "reserved"
  | "unavailable";

type AdvertisementStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "paused"
  | "ended";

type SortOrder = "newest" | "oldest" | "price-low" | "price-high";

interface ApiProperty {
  _id: string;
  title: string;
  price: number;
  location: { area: string; city: string };
  areaSize: number;
  areaUnit: string;
  purpose: string;
  propertyType: string;
  images?: string[];
  status: string;
  inventoryStatus?: InventoryStatus;
  advertisementId?: string | null;
  advertisementStatus?: AdvertisementStatus | null;
  advertisementNotes?: string | null;
  agentArchived?: boolean;
  createdAt: string;
}

interface InventoryStatusResponse {
  inventoryStatus: InventoryStatus;
  status: string;
}

const INVENTORY_STATUSES: InventoryStatus[] = [
  "available",
  "sold",
  "rented",
  "reserved",
  "unavailable",
];

const INVENTORY_LABELS: Record<InventoryStatus, string> = {
  available: "Available",
  sold: "Sold",
  rented: "Rented",
  reserved: "Reserved",
  unavailable: "Unavailable",
};

const ADVERTISEMENT_LABELS: Record<AdvertisementStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  published: "Published",
  rejected: "Rejected",
  paused: "Paused",
  ended: "Ended",
};

const INVENTORY_BADGE_STYLES: Record<InventoryStatus, string> = {
  available: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  sold: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  rented: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  reserved: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  unavailable: "border-rose-500/25 bg-rose-500/10 text-rose-300",
};

const ADVERTISEMENT_BADGE_STYLES: Record<AdvertisementStatus, string> = {
  draft: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  pending_review: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  published: "border-blue-500/25 bg-blue-500/10 text-blue-300",
  rejected: "border-rose-500/25 bg-rose-500/10 text-rose-300",
  paused: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  ended: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-[#263951] bg-[#0b1524] px-3 text-sm text-slate-100 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

function formatPrice(price: number): string {
  return `PKR ${new Intl.NumberFormat("en-PK").format(price)}`;
}

function getInventoryStatus(listing: ApiProperty): InventoryStatus {
  const status = listing.inventoryStatus ?? listing.status;
  switch (status) {
    case "available":
    case "sold":
    case "rented":
    case "reserved":
    case "unavailable":
      return status;
    default:
      return "available";
  }
}

function PropertyCover({ listing }: { listing: ApiProperty }) {
  const [failed, setFailed] = useState(false);
  const cover = listing.images?.[0];

  if (!cover || failed) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center bg-[#111e2f] text-slate-500 sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-44">
        <div className="flex flex-col items-center gap-2">
          {cover ? (
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          ) : (
            <ImageIcon className="h-7 w-7" aria-hidden="true" />
          )}
          <span className="text-xs">{cover ? "Image unavailable" : "No property photo"}</span>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cover}
      alt={`${listing.title} property`}
      className="aspect-[16/10] w-full bg-[#111e2f] object-cover sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-44"
      onError={() => setFailed(true)}
    />
  );
}

export default function AgentListingsPage() {
  const [listings, setListings] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [advertisingId, setAdvertisingId] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [search, setSearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<ApiProperty[]>>(
        "/properties/agent/my-listings",
      );
      setListings(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const propertyTypes = useMemo(
    () => [...new Set(listings.map((listing) => listing.propertyType).filter(Boolean))].sort(),
    [listings],
  );
  const purposes = useMemo(
    () => [...new Set(listings.map((listing) => listing.purpose).filter(Boolean))].sort(),
    [listings],
  );

  const visibleListings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return listings
      .filter((listing) => {
        const status = getInventoryStatus(listing);
        const matchesSearch =
          !term ||
          listing.title.toLocaleLowerCase().includes(term) ||
          listing.location.area.toLocaleLowerCase().includes(term) ||
          listing.location.city.toLocaleLowerCase().includes(term) ||
          listing._id.toLocaleLowerCase().includes(term);
        return (
          matchesSearch &&
          (inventoryFilter === "all" || status === inventoryFilter) &&
          (propertyTypeFilter === "all" || listing.propertyType === propertyTypeFilter) &&
          (purposeFilter === "all" || listing.purpose === purposeFilter)
        );
      })
      .sort((left, right) => {
        if (sortOrder === "oldest") {
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        }
        if (sortOrder === "price-low") return left.price - right.price;
        if (sortOrder === "price-high") return right.price - left.price;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [inventoryFilter, listings, propertyTypeFilter, purposeFilter, search, sortOrder]);

  const archiveListing = async (listing: ApiProperty) => {
    if (!window.confirm(
      `Archive "${listing.title}"? It will disappear from public search and active advertising will end. Leads, conversations, saved-property references, analytics, photos, and the property record will be preserved.`,
    )) {
      return;
    }
    setDeletingId(listing._id);
    setActionError("");
    try {
      await apiClient.delete<ApiEnvelope<{ archived: boolean; propertyId: string }>>(
        `/properties/${encodeURIComponent(listing._id)}`,
        { data: { confirmation: "ARCHIVE PROPERTY" } },
      );
      setListings((current) =>
        current.map((item) =>
          item._id === listing._id
            ? { ...item, agentArchived: true, advertisementStatus: "ended" }
            : item,
        ),
      );
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setDeletingId("");
    }
  };

  const restoreListing = async (listing: ApiProperty) => {
    if (!window.confirm(`Restore "${listing.title}" to your active inventory? It will not be published automatically.`)) {
      return;
    }
    setDeletingId(listing._id);
    setActionError("");
    try {
      await apiClient.patch<ApiEnvelope<{ archived: boolean; propertyId: string }>>(
        `/properties/${encodeURIComponent(listing._id)}/archive`,
        { confirmation: "RESTORE PROPERTY" },
      );
      setListings((current) =>
        current.map((item) =>
          item._id === listing._id ? { ...item, agentArchived: false } : item,
        ),
      );
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setDeletingId("");
    }
  };

  const sendToLive = async (listing: ApiProperty) => {
    setAdvertisingId(listing._id);
    setActionError("");
    try {
      await apiClient.post(
        `/properties/${encodeURIComponent(listing._id)}/advertisement`,
      );
      await loadListings();
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setAdvertisingId("");
    }
  };

  const updateInventoryStatus = async (
    listing: ApiProperty,
    status: InventoryStatus,
  ) => {
    setUpdatingStatusId(listing._id);
    setActionError("");
    try {
      const response = await apiClient.patch<
        ApiEnvelope<InventoryStatusResponse>
      >(
        `/properties/${encodeURIComponent(listing._id)}/inventory-status`,
        { status },
      );
      const savedStatus = response.data.data.inventoryStatus;
      if (!INVENTORY_STATUSES.includes(savedStatus)) {
        throw new Error("The server returned an invalid inventory status.");
      }
      setListings((current) =>
        current.map((item) =>
          item._id === listing._id
            ? { ...item, inventoryStatus: savedStatus, status: response.data.data.status }
            : item,
        ),
      );
      try {
        const latestListings = await apiClient.get<ApiEnvelope<ApiProperty[]>>(
          "/properties/agent/my-listings",
        );
        setListings(latestListings.data.data);
      } catch (refreshError) {
        setActionError(
          `Inventory status was saved, but the latest advertisement status could not be refreshed: ${getApiErrorMessage(refreshError)}`,
        );
      }
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setUpdatingStatusId("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setInventoryFilter("all");
    setPropertyTypeFilter("all");
    setPurposeFilter("all");
    setSortOrder("newest");
  };

  return (
    <DarkCanvas>
      <div className="space-y-6 pb-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">My Listings</h1>
              {!loading && !error && (
                <span className="inline-flex h-7 items-center rounded-full border border-[#2b405b] bg-[#101c2c] px-2.5 text-xs font-semibold text-slate-300">
                  {listings.length} {listings.length === 1 ? "property" : "properties"}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Manage your complete property inventory in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void loadListings()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#2a3d56] bg-[#0d1828] px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-[#3a526f] hover:bg-[#132238] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/agent/add-property"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-950/25 transition-colors hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add Listing
            </Link>
          </div>
        </header>

        {actionError && (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {actionError}
          </p>
        )}

        {!loading && !error && listings.length > 0 && (
          <section className={`${PANEL} p-4 sm:p-5`} aria-label="Search and filter listings">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <label className="relative sm:col-span-2 xl:col-span-2">
                <span className="sr-only">Search listings</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, location or property ID"
                  className={`${FIELD_CLASS} pl-10`}
                />
              </label>
              <label>
                <span className="sr-only">Filter by inventory status</span>
                <span className="relative block">
                  <select
                    aria-label="Filter by inventory status"
                    value={inventoryFilter}
                    onChange={(event) => setInventoryFilter(event.target.value)}
                    className={`${FIELD_CLASS} appearance-none pr-9`}
                  >
                    <option value="all">All inventory statuses</option>
                    {INVENTORY_STATUSES.map((status) => (
                      <option key={status} value={status}>{INVENTORY_LABELS[status]}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
              <label>
                <span className="sr-only">Filter by property type</span>
                <span className="relative block">
                  <select
                    aria-label="Filter by property type"
                    value={propertyTypeFilter}
                    onChange={(event) => setPropertyTypeFilter(event.target.value)}
                    className={`${FIELD_CLASS} appearance-none pr-9`}
                  >
                    <option value="all">All property types</option>
                    {propertyTypes.map((propertyType) => (
                      <option key={propertyType} value={propertyType}>{propertyType}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
              <label>
                <span className="sr-only">Filter by purpose</span>
                <span className="relative block">
                  <select
                    aria-label="Filter by purpose"
                    value={purposeFilter}
                    onChange={(event) => setPurposeFilter(event.target.value)}
                    className={`${FIELD_CLASS} appearance-none pr-9`}
                  >
                    <option value="all">Sale and rent</option>
                    {purposes.map((purpose) => (
                      <option key={purpose} value={purpose}>For {purpose.toLowerCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
              <label className="sm:col-span-2 xl:col-span-2">
                <span className="sr-only">Sort listings</span>
                <span className="relative block">
                  <ArrowDownWideNarrow className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select
                    aria-label="Sort listings"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                    className={`${FIELD_CLASS} appearance-none pl-10 pr-9`}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </span>
              </label>
              <div className="flex min-h-11 items-center justify-between gap-3 sm:col-span-2 xl:col-span-3 xl:justify-end">
                <p className="text-sm text-slate-400" aria-live="polite">
                  Showing <span className="font-semibold text-slate-200">{visibleListings.length}</span> of{" "}
                  <span className="font-semibold text-slate-200">{listings.length}</span> properties
                </p>
                {(search || inventoryFilter !== "all" || propertyTypeFilter !== "all" || purposeFilter !== "all") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-10 rounded-lg px-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className={`${PANEL} flex min-h-64 flex-col items-center justify-center gap-3 p-8`}>
            <LoaderCircle className="h-7 w-7 animate-spin text-emerald-400" />
            <p role="status" className="text-sm text-slate-400">Loading your properties…</p>
          </div>
        ) : error ? (
          <div className={`${PANEL} flex flex-col items-center gap-4 px-5 py-12 text-center`}>
            <AlertCircle className="h-9 w-9 text-rose-300" />
            <p role="alert" className="max-w-xl text-sm text-rose-200">{error}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void loadListings()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#2a3d56] px-4 text-sm font-semibold text-slate-100 hover:bg-white/5"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className={`${PANEL} flex flex-col items-center gap-3 px-5 py-14 text-center`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#263951] bg-[#111e2f]">
              <Building2 className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your inventory starts here</h2>
              <p className="mt-1 max-w-md text-sm text-slate-400">
                Add a property to manage its details, availability and advertising workflow.
              </p>
            </div>
            <Link
              href="/agent/add-property"
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add your first listing
            </Link>
          </div>
        ) : visibleListings.length === 0 ? (
          <div className={`${PANEL} flex flex-col items-center gap-3 px-5 py-12 text-center`}>
            <Search className="h-8 w-8 text-slate-500" />
            <div>
              <h2 className="font-semibold text-white">No matching properties</h2>
              <p className="mt-1 text-sm text-slate-400">Try a different search or clear the selected filters.</p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-10 rounded-lg px-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="space-y-4" aria-label="Property listings">
            {visibleListings.map((listing) => {
              const inventoryStatus = getInventoryStatus(listing);
              const hasAdvertisement = Boolean(listing.advertisementId);
              const advertisementHref = listing.advertisementId
                ? `/agent/ads#advertisement-${encodeURIComponent(listing.advertisementId)}`
                : "/agent/ads";
              const advertisementStatus = listing.advertisementStatus;
              const canSendToLive =
                !listing.agentArchived &&
                (!hasAdvertisement || ["rejected", "ended"].includes(advertisementStatus ?? "")) &&
                (["available", "draft", "rejected"].includes(listing.status) ||
                  ["rejected", "ended"].includes(advertisementStatus ?? ""));

              return (
                <li
                  key={listing._id}
                  className={`${PANEL} overflow-hidden transition-colors hover:border-[#2a405d]`}
                >
                  <article className="grid grid-cols-1 lg:grid-cols-[minmax(190px,230px)_minmax(0,1fr)_minmax(220px,260px)]">
                    <div className="overflow-hidden lg:p-3 lg:pr-0">
                      <div className="overflow-hidden lg:h-full lg:rounded-xl">
                        <PropertyCover listing={listing} />
                      </div>
                    </div>

                    <div className="min-w-0 px-4 pb-4 pt-3 sm:px-5 lg:px-6 lg:py-5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <span>ID {listing._id}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {new Date(listing.createdAt).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <h2 className="mt-2 break-words text-lg font-semibold leading-snug text-white sm:text-xl">
                        {listing.title}
                      </h2>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300">
                        <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="truncate">{listing.location.area}, {listing.location.city}</span>
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-[#1d2c40] py-3 sm:grid-cols-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Property type</p>
                          <p className="mt-1 truncate text-sm font-medium text-slate-200">{listing.propertyType}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Purpose</p>
                          <p className="mt-1 text-sm font-medium text-slate-200">For {listing.purpose.toLowerCase()}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Area</p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-200">
                            <Ruler className="h-3.5 w-3.5 text-slate-500" />
                            {listing.areaSize} {listing.areaUnit}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xl font-bold tracking-tight text-emerald-300">
                        {formatPrice(listing.price)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-[#1d2c40] bg-[#0a1422]/70 p-4 sm:px-5 lg:border-l lg:border-t-0 lg:p-5">
                      <div className="space-y-2.5">
                        {listing.agentArchived && (
                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Record status
                            </p>
                            <span className="inline-flex min-h-7 items-center rounded-lg border border-slate-500/30 bg-slate-500/10 px-2.5 text-xs font-semibold text-slate-300">
                              Archived
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Inventory status
                          </p>
                          <span className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 text-xs font-semibold ${INVENTORY_BADGE_STYLES[inventoryStatus]}`}>
                            {INVENTORY_LABELS[inventoryStatus]}
                          </span>
                        </div>
                        {hasAdvertisement && advertisementStatus && (
                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Advertisement status
                            </p>
                            <span className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 text-xs font-semibold ${ADVERTISEMENT_BADGE_STYLES[advertisementStatus]}`}>
                              {ADVERTISEMENT_LABELS[advertisementStatus]}
                            </span>
                          </div>
                        )}
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-slate-400">
                          Update availability
                        </span>
                        <span className="relative block">
                          <select
                            aria-label={`Inventory status for ${listing.title}`}
                            value={inventoryStatus}
                            disabled={listing.agentArchived || updatingStatusId === listing._id}
                            onChange={(event) =>
                              void updateInventoryStatus(
                                listing,
                                event.target.value as InventoryStatus,
                              )
                            }
                            className="h-10 w-full appearance-none rounded-lg border border-[#2a3d56] bg-[#0b1524] pl-3 pr-9 text-sm text-slate-100 outline-none transition-colors focus:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
                          >
                            {INVENTORY_STATUSES.map((status) => (
                              <option key={status} value={status}>{INVENTORY_LABELS[status]}</option>
                            ))}
                          </select>
                          {updatingStatusId === listing._id ? (
                            <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-400" />
                          ) : (
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                          )}
                        </span>
                      </label>

                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <Link
                          href={`/agent/listings/${encodeURIComponent(listing._id)}/edit`}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#2a3d56] px-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            void (listing.agentArchived
                              ? restoreListing(listing)
                              : archiveListing(listing))
                          }
                          disabled={deletingId === listing._id}
                          className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            listing.agentArchived
                              ? "border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10"
                              : "border-rose-900/50 text-rose-300 hover:bg-rose-950/30"
                          }`}
                        >
                          {deletingId === listing._id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : listing.agentArchived ? (
                            <RotateCcw className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                          {deletingId === listing._id
                            ? listing.agentArchived ? "Restoring" : "Archiving"
                            : listing.agentArchived ? "Restore" : "Archive"}
                        </button>
                        {hasAdvertisement && (
                          <Link
                            href={advertisementHref}
                            className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-500/25 bg-blue-500/5 px-3 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-500/10"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Advertisement
                          </Link>
                        )}
                        {canSendToLive && (
                          <button
                            type="button"
                            onClick={() => void sendToLive(listing)}
                            disabled={advertisingId === listing._id}
                            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white shadow-md shadow-emerald-950/20 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {advertisingId === listing._id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : hasAdvertisement ? (
                              <RefreshCw className="h-4 w-4" />
                            ) : (
                              <Megaphone className="h-4 w-4" />
                            )}
                            {advertisingId === listing._id
                              ? "Submitting…"
                              : hasAdvertisement
                                ? "Resubmit for review"
                                : "Send to Live"}
                          </button>
                        )}
                        {listing.status === "published" && (
                          <div className="col-span-2">
                            <ShareExactLocationControl
                              propertyId={listing._id}
                              propertyTitle={listing.title}
                              status={listing.status}
                            />
                          </div>
                        )}
                      </div>

                      {listing.advertisementNotes && advertisementStatus === "rejected" && (
                        <p className="rounded-lg border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs leading-relaxed text-rose-200">
                          <span className="font-semibold">Review reason:</span>{" "}
                          {listing.advertisementNotes}
                        </p>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DarkCanvas>
  );
}
