"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";
import type { ExactCoordinates } from "./ExactLocationMap";

const ExactLocationMap = dynamic(() => import("./ExactLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
  ),
});

interface ShareExactLocationControlProps {
  propertyId: string;
  propertyTitle: string;
  status: string;
}

interface ManagedLocation extends ExactCoordinates {
  address: string;
}

interface LocationShare {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface ShareResponse {
  id: string;
  shareUrl: string;
  expiresAt: string;
}

function isValidCoordinates(
  coordinates: Partial<ExactCoordinates>,
): coordinates is ExactCoordinates {
  return (
    typeof coordinates.latitude === "number" &&
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    typeof coordinates.longitude === "number" &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

function formatExpiry(value: string): string {
  return new Date(value).toLocaleString();
}

export function ShareExactLocationControl({
  propertyId,
  propertyTitle,
  status,
}: ShareExactLocationControlProps) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<ManagedLocation>({
    latitude: Number.NaN,
    longitude: Number.NaN,
    address: "",
  });
  const [hasEntrance, setHasEntrance] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [shares, setShares] = useState<LocationShare[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadManagementData = async () => {
    setOpen(true);
    setError("");
    setLoading(true);
    try {
      const [locationResponse, sharesResponse] = await Promise.all([
        apiClient.get<
          ApiEnvelope<{ location: ManagedLocation | null }>
        >(`/properties/${propertyId}/private-location`),
        apiClient.get<ApiEnvelope<LocationShare[]>>(
          `/properties/${propertyId}/location-shares`,
        ),
      ]);
      const savedLocation = locationResponse.data.data.location;
      if (savedLocation && isValidCoordinates(savedLocation)) {
        setLocation(savedLocation);
        setHasEntrance(true);
      } else {
        setLocation({
          latitude: Number.NaN,
          longitude: Number.NaN,
          address: "",
        });
        setHasEntrance(false);
      }
      setShares(sharesResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndShare = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!isValidCoordinates(location)) {
      setError("Select a valid entrance location on the map.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.put<ApiEnvelope<{ saved: boolean }>>(
        `/properties/${propertyId}/private-location`,
        location,
      );
      const response = await apiClient.post<ApiEnvelope<ShareResponse>>(
        `/properties/${propertyId}/location-shares`,
        { recipientEmail: recipientEmail.trim() },
      );
      const createdShare = response.data.data;
      setShareUrl(createdShare.shareUrl);
      const sharesResponse = await apiClient.get<ApiEnvelope<LocationShare[]>>(
        `/properties/${propertyId}/location-shares`,
      );
      setShares(sharesResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    setError("");
    setLoading(true);
    try {
      await apiClient.delete(
        `/properties/${propertyId}/location-shares/${shareId}`,
      );
      setShares((current) =>
        current.map((share) =>
          share.id === shareId
            ? { ...share, revokedAt: new Date().toISOString() }
            : share,
        ),
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      setError("Could not copy the link. Select and copy it manually.");
    }
  };

  const openWhatsApp = () => {
    const message = `Hello, here is the private location link for your property visit: ${shareUrl}. Please sign in with the invited buyer account to view authorized directions.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (status !== "published") {
    return (
      <p className="text-xs text-slate-500">
        Exact location sharing is available after this listing is published.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void loadManagementData()}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-500/50 px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10 max-lg:min-h-11 max-lg:w-full max-lg:border-[#CBD5E1] max-lg:bg-white max-lg:text-emerald-700 max-lg:hover:bg-emerald-50"
      >
        Share Exact Location
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`location-share-title-${propertyId}`}
            className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={`location-share-title-${propertyId}`}
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Share Exact Location
                </h2>
                <p className="mt-1 text-sm text-slate-500">{propertyTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close location sharing"
              >
                Close
              </button>
            </header>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                {error}
              </p>
            )}

            {loading && !hasEntrance && !shareUrl ? (
              <p role="status" className="py-8 text-center text-sm text-slate-500">
                Loading secure location settings…
              </p>
            ) : (
              <form onSubmit={handleSaveAndShare} className="mt-5 space-y-4">
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  The entrance is private. The link only works for the selected registered buyer account and expires automatically.
                </div>
                <ExactLocationMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  onChange={(coordinates) => {
                    setLocation((current) => ({ ...current, ...coordinates }));
                    setHasEntrance(true);
                  }}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Latitude
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      required
                      value={Number.isFinite(location.latitude) ? location.latitude : ""}
                      onChange={(event) =>
                        setLocation((current) => ({
                          ...current,
                          latitude:
                            event.target.value === ""
                              ? Number.NaN
                              : Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Longitude
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      required
                      value={Number.isFinite(location.longitude) ? location.longitude : ""}
                      onChange={(event) =>
                        setLocation((current) => ({
                          ...current,
                          longitude:
                            event.target.value === ""
                              ? Number.NaN
                              : Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Private entrance instructions (optional)
                  <input
                    type="text"
                    maxLength={300}
                    value={location.address}
                    onChange={(event) =>
                      setLocation((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Gate, block, or entrance details"
                  />
                </label>
                <label className="block space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Invited buyer account email
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={recipientEmail}
                    onChange={(event) => setRecipientEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="buyer@example.com"
                  />
                  <span className="block font-normal text-slate-500">
                    The buyer must have a registered account and sign in to open the link.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Save entrance and create private link"}
                </button>
              </form>
            )}

            {shareUrl && (
              <div className="mt-5 space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Link created. It is bound to the invited buyer account.
                </p>
                <input
                  readOnly
                  aria-label="Private location link"
                  value={shareUrl}
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs text-slate-700 dark:border-emerald-800 dark:bg-slate-950 dark:text-slate-200"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyShareLink()}
                    className="min-h-10 rounded-lg border border-emerald-700 px-3 text-xs font-semibold text-emerald-800 dark:border-emerald-400 dark:text-emerald-200"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={openWhatsApp}
                    className="min-h-10 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Review in WhatsApp
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  WhatsApp opens a draft for you to review and send. Delivery is not automatic.
                </p>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Existing location links
              </h3>
              {shares.length === 0 ? (
                <p className="text-xs text-slate-500">No links have been created.</p>
              ) : (
                <ul className="space-y-2">
                  {shares.map((share) => {
                    const expired = Date.parse(share.expiresAt) <= Date.now();
                    const status = share.revokedAt
                      ? "Revoked"
                      : expired
                        ? "Expired"
                        : "Active";
                    return (
                      <li
                        key={share.id}
                        className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center"
                      >
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{status}</span>
                          <span className="ml-2">
                            Expires {formatExpiry(share.expiresAt)}
                          </span>
                        </div>
                        {status === "Active" && (
                          <button
                            type="button"
                            onClick={() => void handleRevoke(share.id)}
                            disabled={loading}
                            className="min-h-9 rounded-lg border border-red-300 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            Revoke
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
