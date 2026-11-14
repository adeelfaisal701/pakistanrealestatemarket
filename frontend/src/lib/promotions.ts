import apiClient, { type ApiEnvelope } from "@/lib/api-client";
import { createAnalyticsId } from "@/lib/property-analytics";

/** Sponsored (third-party) campaigns — separate from agents' property ads. */

export type PromoPlacement =
  | "home_featured"
  | "listings_inline"
  | "property_detail_content"
  | "property_detail_similar"
  | "projects_section"
  | "agencies_section";

export type PromoDevice = "mobile" | "desktop";
export type PromoStatus = "draft" | "active" | "paused" | "archived";
export type PromoEffectiveStatus = "draft" | "scheduled" | "live" | "expired" | "paused" | "archived";
export type PromoEventType = "impression" | "click" | "video_view" | "video_complete";
export type PromoPackage =
  | "homepage_featured"
  | "listings_sponsored"
  | "property_details"
  | "video_promotion"
  | "multi_placement"
  | "premium";

export interface PromoMedia {
  kind: "image" | "video";
  url: string;
  posterUrl?: string;
  alt?: string;
}

export interface ServedCampaign {
  id: string;
  title: string;
  companyName: string;
  logoUrl: string;
  description: string;
  ctaText: string;
  destinationUrl: string;
  media: PromoMedia[];
  videoMaxSeconds: number;
}

export interface ServeResponse {
  placement: PromoPlacement;
  enabled: boolean;
  campaigns: ServedCampaign[];
  listingsInterval: number;
  listingsMaxPerPage: number;
}

export interface PromoContext {
  city?: string;
  propertyType?: string;
  purpose?: string;
}

export const PLACEMENT_LABELS: Record<PromoPlacement, string> = {
  home_featured: "Homepage — below Popular Locations",
  listings_inline: "Property listings — between cards",
  property_detail_content: "Property details — after description",
  property_detail_similar: "Property details — before Similar Properties",
  projects_section: "Our Projects section",
  agencies_section: "Agencies section",
};

export const PACKAGE_LABELS: Record<PromoPackage, string> = {
  homepage_featured: "Homepage Featured",
  listings_sponsored: "Listings Sponsored Placement",
  property_details: "Property Details",
  video_promotion: "Video Promotion",
  multi_placement: "Multi-Placement Campaign",
  premium: "Premium Campaign",
};

export const PROPERTY_TYPES = ["House", "Flat", "Upper Portion", "Lower Portion", "Plot", "Commercial"] as const;
export const PURPOSES = ["Sale", "Rent"] as const;

/** Resolves API-relative media URLs ("/api/v1/...") exactly like other media. */
export function promoMediaUrl(url?: string): string {
  return url ?? "";
}

export function currentDevice(): PromoDevice {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

/** Anonymous random id (no personal data), shared with property analytics. */
function visitorId(): string {
  const key = "prm_analytics_visitor";
  try {
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = createAnalyticsId();
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return createAnalyticsId();
  }
}

const serveCache = new Map<string, Promise<ServeResponse>>();

export function fetchPromotions(placement: PromoPlacement, context: PromoContext = {}): Promise<ServeResponse> {
  const params: Record<string, string> = { placement, device: currentDevice() };
  if (context.city?.trim()) params.city = context.city.trim();
  if (context.propertyType) params.propertyType = context.propertyType;
  if (context.purpose) params.purpose = context.purpose;
  const key = JSON.stringify(params);
  const cached = serveCache.get(key);
  if (cached) return cached;
  const request = apiClient
    .get<ApiEnvelope<ServeResponse>>("/promotions/serve", { params })
    .then((response) => response.data.data)
    .catch((error: unknown) => {
      serveCache.delete(key);
      throw error;
    });
  serveCache.set(key, request);
  return request;
}

/** Fire-and-forget analytics; never blocks navigation or throws. */
export function trackPromotion(campaignId: string, type: PromoEventType, placement: PromoPlacement) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ campaignId, type, placement, device: currentDevice(), visitorId: visitorId() });
  const base = (apiClient.defaults.baseURL ?? "/api/v1").replace(/\/+$/, "");
  const url = `${base}/promotions/events`;
  try {
    if (typeof navigator.sendBeacon === "function" && /^\//.test(base)) {
      // Same-origin beacon survives the page change on click.
      if (navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "omit",
  }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface PromoTotals {
  impressions: number;
  uniqueImpressions: number;
  clicks: number;
  videoViews: number;
  videoCompletions: number;
}

export interface AdminCampaign {
  id: string;
  title: string;
  companyName: string;
  logoUrl: string;
  media: PromoMedia[];
  destinationUrl: string;
  ctaText: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  status: PromoStatus;
  effectiveStatus: PromoEffectiveStatus;
  devices: PromoDevice[];
  placements: PromoPlacement[];
  targeting: { cities: string[]; propertyTypes: string[]; purposes: string[] };
  priority: number;
  displayOrder: number;
  videoMaxSeconds: number;
  package: PromoPackage | null;
  createdAt: string;
  updatedAt: string;
  totals: PromoTotals;
}

export type CampaignPayload = Omit<AdminCampaign, "id" | "effectiveStatus" | "createdAt" | "updatedAt" | "totals">;

export interface PromoSettings {
  listingsInterval: number;
  listingsMaxPerPage: number;
  enabledPlacements: PromoPlacement[];
}

interface RateRow extends PromoTotals {
  ctr: number;
  completionRate: number;
}

export interface PromoAnalytics {
  days: number;
  since: string;
  totals: RateRow;
  daily: Array<RateRow & { day: string }>;
  placements: Array<RateRow & { placement: PromoPlacement }>;
  devices: Array<RateRow & { device: PromoDevice }>;
  campaigns: Array<RateRow & { id: string; title: string; companyName: string }>;
}

const unwrap = <T,>(request: Promise<{ data: ApiEnvelope<T> }>) => request.then((response) => response.data.data);

export const adminPromotions = {
  list: (params: { search?: string; status?: string; placement?: string } = {}) =>
    unwrap(apiClient.get<ApiEnvelope<AdminCampaign[]>>("/admin/promotions", { params })),
  get: (id: string) => unwrap(apiClient.get<ApiEnvelope<AdminCampaign>>(`/admin/promotions/${id}`)),
  create: (payload: CampaignPayload) => unwrap(apiClient.post<ApiEnvelope<AdminCampaign>>("/admin/promotions", payload)),
  update: (id: string, payload: CampaignPayload) =>
    unwrap(apiClient.put<ApiEnvelope<AdminCampaign>>(`/admin/promotions/${id}`, payload)),
  duplicate: (id: string) => unwrap(apiClient.post<ApiEnvelope<AdminCampaign>>(`/admin/promotions/${id}/duplicate`)),
  setStatus: (id: string, status: PromoStatus) =>
    unwrap(apiClient.patch<ApiEnvelope<AdminCampaign>>(`/admin/promotions/${id}/status`, { status })),
  remove: (id: string) => unwrap(apiClient.delete<ApiEnvelope<{ id: string }>>(`/admin/promotions/${id}`)),
  analytics: (params: { campaignId?: string; days?: number } = {}) =>
    unwrap(apiClient.get<ApiEnvelope<PromoAnalytics>>("/admin/promotions/analytics", { params })),
  settings: () => unwrap(apiClient.get<ApiEnvelope<PromoSettings>>("/admin/promotions/settings")),
  saveSettings: (settings: PromoSettings) =>
    unwrap(apiClient.put<ApiEnvelope<PromoSettings>>("/admin/promotions/settings", settings)),
  upload: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return unwrap(
      apiClient.post<ApiEnvelope<{ kind: "image" | "video"; url: string; contentType: string; size: number }>>(
        "/admin/promotions/media",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
          },
        },
      ),
    );
  },
};
