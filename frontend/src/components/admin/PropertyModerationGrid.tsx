"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building,
  Check,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

type PropertyStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "rejected"
  | "sold"
  | string;

interface AdminProperty {
  id: string;
  title: string;
  description: string;
  purpose: "Sale" | "Rent";
  propertyType: string;
  price: number;
  areaSize: number;
  areaUnit: string;
  location: { city: string; area: string };
  features?: { bedrooms?: number; bathrooms?: number; parkingSpaces?: number };
  images: string[];
  status: PropertyStatus;
  advertisementStatus?: string | null;
  inventoryStatus?: string;
  adminHidden?: boolean;
  adminRemoved?: boolean;
  adminFlagged?: boolean;
  createdAt: string;
  moderationNotes?: string;
  agent: {
    id: string;
    name: string;
    phone: string;
    agencyName?: string;
    isVerified: boolean;
  } | null;
}

interface PropertyCounts {
  total: number;
  pending_approval: number;
  published: number;
  rejected: number;
  draft: number;
  sold: number;
  [status: string]: number;
}

interface AdminPropertiesResponse {
  items: AdminProperty[];
  counts: PropertyCounts;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 30;

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending_approval", label: "Pending Review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
  { value: "sold", label: "Sold" },
] as const;

function statusLabel(status: string) {
  const known: Record<string, string> = {
    pending_approval: "Pending Review",
    published: "Published",
    rejected: "Rejected",
    draft: "Draft",
    sold: "Sold",
  };
  return known[status] ?? `Other: ${status || "unknown"}`;
}

function formatPrice(price: number) {
  return `PKR ${new Intl.NumberFormat("en-PK").format(price)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PropertyModerationGrid({ initialSearch = "" }: { initialSearch?: string }) {
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [counts, setCounts] = useState<PropertyCounts | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actingId, setActingId] = useState("");
  const [unavailableImages, setUnavailableImages] = useState<Set<string>>(new Set());

  const markImageUnavailable = (url: string) => {
    setUnavailableImages((current) => new Set(current).add(url));
  };

  const loadProperties = useCallback(async (nextPage: number, status: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<AdminPropertiesResponse>>(
        "/admin/properties",
        {
          params: {
            page: nextPage,
            limit: PAGE_SIZE,
            ...(status !== "all" ? { status } : {}),
            ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
            ...(propertyTypeFilter ? { propertyType: propertyTypeFilter } : {}),
            ...(purposeFilter ? { purpose: purposeFilter } : {}),
            ...(inventoryFilter ? { inventoryStatus: inventoryFilter } : {}),
            ...(fromDate ? { fromDate: new Date(`${fromDate}T00:00:00`).toISOString() } : {}),
            ...(toDate ? { toDate: new Date(`${toDate}T23:59:59.999`).toISOString() } : {}),
          },
        },
      );
      const result = response.data.data;
      setProperties(result.items);
      setCounts(result.counts);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setProperties([]);
      setCounts(null);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, inventoryFilter, propertyTypeFilter, purposeFilter, searchQuery, toDate]);

  useEffect(() => {
    void loadProperties(page, statusFilter);
  }, [loadProperties, page, statusFilter]);

  const filteredProperties = properties;

  const moderate = async (property: AdminProperty, status: "published" | "rejected") => {
    const moderationNotes =
      status === "rejected"
        ? window.prompt("Enter the reason for rejecting this listing:")?.trim()
        : undefined;
    if (status === "rejected" && !moderationNotes) return;
    if (!window.confirm(
      status === "published"
        ? `Approve and publish "${property.title}"?`
        : `Reject "${property.title}" with this reason?\n\n${moderationNotes}`,
    )) return;

    setActingId(property.id);
    setActionError("");
    try {
      await apiClient.patch(`/admin/properties/${property.id}/moderate`, {
        status,
        ...(moderationNotes ? { moderationNotes } : {}),
      });
      await loadProperties(page, statusFilter);
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const moderateAction = async (
    property: AdminProperty,
    action: "hide" | "unpublish" | "restore" | "flag" | "remove",
  ) => {
    const needsReason = ["hide", "flag", "remove"].includes(action);
    const reason = needsReason
      ? window.prompt(`Enter a reason to ${action} this property:`)?.trim()
      : "";
    if (needsReason && !reason) return;
    const warning = action === "remove"
      ? "This hides the property and ends its linked advertisement. The original property record, images, analytics, leads, and messages are retained."
      : `Confirm that you want to ${action} this property?`;
    if (!window.confirm(`${warning}\n\n${property.title}`)) return;
    setActingId(property.id);
    setActionError("");
    try {
      await apiClient.patch(`/admin/properties/${property.id}/action`, {
        action,
        ...(reason ? { reason } : {}),
      });
      await loadProperties(page, statusFilter);
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const deletePermanently = async (property: AdminProperty) => {
    const reason = window.prompt("Enter the permanent-deletion reason:")?.trim();
    if (!reason) return;
    const confirmation = window.prompt('Type "DELETE PROPERTY" to confirm:')?.trim();
    if (confirmation !== "DELETE PROPERTY") return;
    if (!window.confirm(`Permanently delete "${property.title}"? This is blocked when leads or conversations are linked. Images and analytics are retained.`)) return;
    setActingId(property.id);
    setActionError("");
    try {
      await apiClient.delete(`/admin/properties/${property.id}`, {
        data: { reason, confirmation },
      });
      await loadProperties(page, statusFilter);
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const countForStatus = (status: string) => {
    if (!counts) return "—";
    if (status === "all") return counts.total ?? total;
    return counts[status] ?? 0;
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          {actionError}
        </p>
      )}

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search this page by title, area, or agent..."
              value={searchQuery}
              onChange={(event) => {
                setPage(1);
                setSearchQuery(event.target.value);
              }}
              className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadProperties(page, statusFilter)}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-xs text-slate-400">
            Type
            <select value={propertyTypeFilter} onChange={(event) => { setPage(1); setPropertyTypeFilter(event.target.value); }} className="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm text-white">
              <option value="">All types</option>
              {["House", "Flat", "Upper Portion", "Lower Portion", "Plot", "Commercial"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Purpose
            <select value={purposeFilter} onChange={(event) => { setPage(1); setPurposeFilter(event.target.value); }} className="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm text-white">
              <option value="">Sale or rent</option><option value="Sale">Sale</option><option value="Rent">Rent</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Inventory
            <select value={inventoryFilter} onChange={(event) => { setPage(1); setInventoryFilter(event.target.value); }} className="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm text-white">
              <option value="">All availability</option>{["available", "sold", "rented", "reserved", "unavailable"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Listed from
            <input type="date" value={fromDate} onChange={(event) => { setPage(1); setFromDate(event.target.value); }} className="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm text-white" />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Listed to
            <input type="date" value={toDate} onChange={(event) => { setPage(1); setToDate(event.target.value); }} className="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm text-white" />
          </label>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-3">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPage(1);
                setStatusFilter(value);
              }}
              aria-pressed={statusFilter === value}
              className={`inline-flex min-h-[38px] flex-shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-bold ${
                statusFilter === value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {label}
              <span className="rounded-full bg-black/20 px-1.5 py-0.5">
                {value === "all" ? counts?.total ?? "—" : countForStatus(value)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {counts ? `Database total: ${counts.total} · pending: ${counts.pending_approval ?? 0} · published: ${counts.published ?? 0} · rejected: ${counts.rejected ?? 0}` : "Loading database totals…"}
          </span>
          <span>
            {total > 0
              ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
              : "No matching records"}
          </span>
        </div>
      </section>

      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 py-12 text-center text-sm text-slate-400">
          Loading property records from the server…
        </p>
      ) : error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-10 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>
          <Button
            type="button"
            onClick={() => void loadProperties(page, statusFilter)}
            className="mt-4 bg-rose-600 text-white hover:bg-rose-700"
          >
            Retry
          </Button>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-14 text-center">
          <Building className="mx-auto h-10 w-10 text-slate-500" />
          <h2 className="mt-3 text-base font-semibold text-white">
            {total === 0 ? "No property records" : "No listings match this search"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {total === 0
              ? "The database contains no properties for this filter."
              : "Try another search or status filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((property) => {
            const isPending = property.status === "pending_approval";
            return (
              <article key={property.id} className="flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
                {property.images[0] && !unavailableImages.has(property.images[0]) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="h-44 w-full bg-slate-800 object-cover"
                    onError={() => markImageUnavailable(property.images[0])}
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-slate-800 text-slate-500">
                    <ImageIcon className="h-8 w-8" />
                    <span className="ml-2 text-sm">
                      {property.images[0] ? "Image unavailable" : "No listing image"}
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-white">{formatPrice(property.price)}</p>
                    <h2 className="mt-1 line-clamp-2 min-h-11 font-semibold text-slate-100">{property.title}</h2>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      isPending ? "bg-amber-500/15 text-amber-300" :
                      property.status === "published" ? "bg-emerald-500/15 text-emerald-300" :
                      property.status === "rejected" ? "bg-rose-500/15 text-rose-300" :
                      "bg-slate-700 text-slate-300"
                    }`}>
                      {statusLabel(property.status)}
                    </span>
                  </div>
                  {(property.adminHidden || property.adminRemoved || property.adminFlagged) && (
                    <div className="flex flex-wrap gap-1">
                      {property.adminHidden && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-300">Hidden</span>}
                      {property.adminRemoved && <span className="rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300">Removed</span>}
                      {property.adminFlagged && <span className="rounded-full bg-orange-500/15 px-2 py-1 text-[10px] font-semibold text-orange-300">Flagged</span>}
                    </div>
                  )}
                  <p className="flex items-center gap-1.5 text-sm text-slate-400">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-rose-400" />
                    {property.location.area}, {property.location.city}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <span>{property.purpose} · {property.propertyType}</span>
                    <span>{property.areaSize} {property.areaUnit}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                      Inventory: {property.inventoryStatus ?? "unknown"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 ${
                      property.advertisementStatus === "published"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : property.advertisementStatus === "pending_review"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-slate-800 text-slate-300"
                    }`}>
                      Ad: {property.advertisementStatus?.replaceAll("_", " ") ?? "none"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Agent: {property.agent?.name ?? "Unknown agent"}
                    {property.agent?.agencyName ? ` · ${property.agent.agencyName}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">Submitted {formatDate(property.createdAt)}</p>

                  <details className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                      Inspect real listing details ({property.images.length} {property.images.length === 1 ? "image" : "images"})
                    </summary>
                    <div className="mt-3 space-y-3">
                      <p className="whitespace-pre-wrap text-sm text-slate-300">{property.description}</p>
                      <p className="text-xs text-slate-400">
                        Bedrooms: {property.features?.bedrooms ?? "—"} · Bathrooms: {property.features?.bathrooms ?? "—"} · Parking: {property.features?.parkingSpaces ?? "—"}
                      </p>
                      {property.moderationNotes && (
                        <p className="text-xs text-amber-300">Moderation note: {property.moderationNotes}</p>
                      )}
                      {property.images.length > 1 && (
                        <div className="grid grid-cols-3 gap-2">
                          {property.images.slice(1).map((image, index) => (
                            unavailableImages.has(image) ? (
                              <div
                                key={`${property.id}-${index}`}
                                className="flex h-20 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-400"
                              >
                                Image unavailable
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={`${property.id}-${index}`}
                                src={image}
                                alt={`${property.title} image ${index + 2}`}
                                className="h-20 w-full rounded-lg object-cover"
                                onError={() => markImageUnavailable(image)}
                              />
                            )
                          ))}
                        </div>
                      )}
                      <p className="break-all text-[10px] text-slate-600">Property ID: {property.id}</p>
                    </div>
                  </details>

                  {isPending && (
                    <div className="mt-auto flex gap-2 border-t border-slate-800 pt-4">
                      <Button
                        type="button"
                        disabled={actingId === property.id}
                        onClick={() => void moderate(property, "published")}
                        className="flex-1 gap-1 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={actingId === property.id}
                        onClick={() => void moderate(property, "rejected")}
                        className="flex-1 gap-1"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {!isPending && property.status === "published" && !property.adminHidden && !property.adminRemoved && (
                    <p className="mt-auto flex items-center gap-1 border-t border-slate-800 pt-4 text-xs text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> Publicly published
                    </p>
                  )}
                  {!isPending && property.status === "rejected" && (
                    <p className="mt-auto flex items-center gap-1 border-t border-slate-800 pt-4 text-xs text-rose-300">
                      <Clock className="h-4 w-4" /> Rejected; not shown on public listings
                    </p>
                  )}
                  {!property.adminRemoved && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                      {property.adminHidden ? (
                        <Button type="button" size="sm" variant="outline" disabled={actingId === property.id} onClick={() => void moderateAction(property, "restore")}>Restore visibility</Button>
                      ) : property.status === "published" ? (
                        <>
                          <Button type="button" size="sm" variant="outline" disabled={actingId === property.id} onClick={() => void moderateAction(property, "hide")}>Hide</Button>
                          <Button type="button" size="sm" variant="outline" disabled={actingId === property.id} onClick={() => void moderateAction(property, "unpublish")}>Unpublish ad</Button>
                        </>
                      ) : null}
                      {!property.adminFlagged && (
                        <Button type="button" size="sm" variant="outline" disabled={actingId === property.id} onClick={() => void moderateAction(property, "flag")}>Flag</Button>
                      )}
                      <Button type="button" size="sm" variant="danger" disabled={actingId === property.id} onClick={() => void moderateAction(property, "remove")}>Remove</Button>
                    </div>
                  )}
                  {property.adminRemoved && (
                    <div className="border-t border-slate-800 pt-4">
                      <Button type="button" size="sm" variant="danger" disabled={actingId === property.id} onClick={() => void deletePermanently(property)}>
                        Delete permanently
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
