import axios from "axios";
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
  /** Media URLs whose files are missing from server storage (need re-uploading). */
  missingMedia?: string[];
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

export interface PromoUploadResult {
  kind: "image" | "video";
  url: string;
  contentType: string;
  size: number;
}

export type PromoUploadFailure =
  | "cancelled"
  | "stalled"
  | "offline"
  | "network"
  | "too-large"
  | "rejected"
  | "session"
  | "rate-limited"
  | "storage"
  | "server"
  | "invalid-response";

/** An upload failure with a message an administrator can act on. */
export class PromoUploadError extends Error {
  constructor(
    message: string,
    readonly reason: PromoUploadFailure,
  ) {
    super(message);
    this.name = "PromoUploadError";
  }
}

/**
 * Uploads have their own limits instead of the 15 s timeout used for normal API
 * calls: an upload may take minutes on a slow connection, so it is only aborted
 * when no progress is reported for UPLOAD_STALL_MS, or after UPLOAD_MAX_MS.
 */
export const UPLOAD_STALL_MS = 60_000;
export const UPLOAD_MAX_MS = 30 * 60_000;

/**
 * Media files are sent from the browser straight to the backend API (never
 * through the Next.js/Vercel proxy, whose request-body limits are far below
 * the 60 MB video limit). The absolute base is resolved in next.config.ts.
 */
export function mediaUploadUrl(): string {
  const base = (process.env.MEDIA_UPLOAD_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    throw new PromoUploadError("Media uploads are not configured on this site. Contact the site administrator.", "server");
  }
  return `${base}/admin/promotions/media`;
}

function serverMessage(data: unknown): string | undefined {
  const message = (data as { message?: unknown } | undefined)?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message && message !== "Internal server error" ? message : undefined;
}

export function describeUploadError(
  error: unknown,
  context: { stalled?: boolean; cancelled?: boolean; started?: boolean } = {},
): PromoUploadError {
  if (error instanceof PromoUploadError) return error;
  if (context.cancelled) return new PromoUploadError("Upload cancelled.", "cancelled");
  if (context.stalled) {
    return new PromoUploadError(
      `The upload stopped making progress for ${UPLOAD_STALL_MS / 1000} seconds. Check your internet connection and try again.`,
      "stalled",
    );
  }
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_CANCELED") return new PromoUploadError("Upload cancelled.", "cancelled");
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new PromoUploadError("The upload took too long and was stopped. Check your connection and try again.", "stalled");
    }
    const status = error.response?.status;
    const message = serverMessage(error.response?.data);
    if (!error.response) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return new PromoUploadError("You appear to be offline. Reconnect to the internet and try the upload again.", "offline");
      }
      // Nothing was sent: the server is down, unreachable, or refused this site (CORS).
      if (!context.started) {
        return new PromoUploadError(
          "The media server could not be reached. It may be temporarily unavailable, or not configured to accept uploads from this site. Please try again shortly; if it keeps failing, contact the site administrator.",
          "network",
        );
      }
      return new PromoUploadError("The upload was interrupted by a network error. Check your connection and try again.", "network");
    }
    if (status === 413) return new PromoUploadError(message ?? "This file is larger than allowed (images 10 MB, videos 60 MB).", "too-large");
    if (status === 400 || status === 415 || status === 422) {
      return new PromoUploadError(message ?? "The server rejected this file. Use a JPG, PNG or WebP image, or an MP4 or WebM video.", "rejected");
    }
    if (status === 401 || status === 403) return new PromoUploadError("Your admin session has expired. Sign in again, then retry the upload.", "session");
    if (status === 429) return new PromoUploadError("Too many uploads in a short time. Wait a minute, then try again.", "rate-limited");
    if (status === 507) return new PromoUploadError("Media storage on the server is full. The file was not saved — contact the site administrator.", "storage");
    if (status === 503) {
      return new PromoUploadError(
        message && message !== "Media storage is not writable." ? message : "Media storage on the server is unavailable or not writable. The file was not saved — contact the site administrator.",
        "storage",
      );
    }
    if (status === 502 || status === 504) return new PromoUploadError("The media server could not be reached. Please try again shortly.", "network");
    return new PromoUploadError("The server could not store this file. Please try again; if it keeps failing, contact the site administrator.", "server");
  }
  return new PromoUploadError("The upload failed unexpectedly. Please try again.", "server");
}

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
  /**
   * Uploads one campaign media file with upload-specific limits (see
   * UPLOAD_STALL_MS / UPLOAD_MAX_MS) and optional cancellation. Throws a
   * PromoUploadError with an actionable message on failure.
   */
  upload: async (file: File, onProgress?: (percent: number) => void, signal?: AbortSignal): Promise<PromoUploadResult> => {
    const form = new FormData();
    form.append("file", file);
    const target = mediaUploadUrl();
    const controller = new AbortController();
    let stalled = false;
    let started = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        stalled = true;
        controller.abort();
      }, UPLOAD_STALL_MS);
    };
    const cancel = () => controller.abort();
    if (signal?.aborted) throw new PromoUploadError("Upload cancelled.", "cancelled");
    signal?.addEventListener("abort", cancel);
    armWatchdog();
    try {
      // Absolute URL: the shared client still attaches the admin bearer token,
      // but the request goes directly to the backend instead of the proxy.
      const response = await apiClient.post<ApiEnvelope<PromoUploadResult>>(target, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: UPLOAD_MAX_MS,
        signal: controller.signal,
        onUploadProgress: (event) => {
          armWatchdog();
          if (event.loaded > 0) started = true;
          if (onProgress && event.total) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        },
      });
      const result = response.data?.data;
      if (!result || (result.kind !== "image" && result.kind !== "video") || typeof result.url !== "string" || !result.url.startsWith("/")) {
        throw new PromoUploadError("The server returned an unexpected response, so the file could not be attached. Please try again.", "invalid-response");
      }
      return result;
    } catch (error) {
      throw describeUploadError(error, { stalled, started, cancelled: Boolean(signal?.aborted) && !stalled });
    } finally {
      if (watchdog) clearTimeout(watchdog);
      signal?.removeEventListener("abort", cancel);
    }
  },
};
