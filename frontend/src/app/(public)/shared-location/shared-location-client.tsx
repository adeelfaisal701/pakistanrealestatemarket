"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";

const ExactLocationMap = dynamic(
  () => import("@/components/crm/ExactLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
    ),
  },
);

interface AuthorizedLocation {
  property: {
    title: string;
    city: string;
    area: string;
    agent: {
      name?: string;
      phone?: string;
      agencyName?: string;
    };
  };
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

const invalidLinkMessage =
  "This link is invalid, expired, revoked, or was issued for a different account. Ask the agent to create a new link.";

function readShareToken(): string {
  const fragment = window.location.hash.slice(1);
  const token = new URLSearchParams(fragment).get("token");
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) return token;
  return sessionStorage.getItem("pending_private_location_token") ?? "";
}

function clearShareTokenFromAddressBar() {
  window.history.replaceState(null, "", window.location.pathname);
}

export default function SharedLocationClient() {
  const [location, setLocation] = useState<AuthorizedLocation | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = readShareToken();
    if (!token) {
      setError(invalidLinkMessage);
      setLoading(false);
      return;
    }

    if (!localStorage.getItem("auth_token")) {
      sessionStorage.setItem("pending_private_location_token", token);
      setNeedsSignIn(true);
      setLoading(false);
      return;
    }

    let active = true;
    sessionStorage.setItem("pending_private_location_token", token);
    clearShareTokenFromAddressBar();
    apiClient
      .post<ApiEnvelope<AuthorizedLocation>>(
        "/properties/private-location/access",
        { token },
      )
      .then((response) => {
        if (active) {
          setLocation(response.data.data);
          sessionStorage.removeItem("pending_private_location_token");
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          const status = (
            requestError as { response?: { status?: number } }
          )?.response?.status;
          setError(status === 404 ? invalidLinkMessage : getApiErrorMessage(requestError));
          if (status === 404) {
            sessionStorage.removeItem("pending_private_location_token");
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p role="status" className="text-center text-sm text-slate-500">
          Verifying private location access…
        </p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <MapPin className="mx-auto h-9 w-9 text-emerald-600" />
          <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
            Sign in to view this private location
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This link is restricted to the buyer account invited by the property agent.
          </p>
          <Link
            href="/login?returnTo=%2Fshared-location"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Sign in to continue
          </Link>
        </section>
      </main>
    );
  }

  if (error || !location) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Private location unavailable
          </h1>
          <p role="alert" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {error || invalidLinkMessage}
          </p>
          <Link
            href="/properties"
            className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Browse properties
          </Link>
        </section>
      </main>
    );
  }

  const { latitude, longitude } = location.location;
  const coordinates = `${latitude},${longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}&travelmode=driving`;
  const fallbackMapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(latitude))}&mlon=${encodeURIComponent(String(longitude))}#map=18/${encodeURIComponent(String(latitude))}/${encodeURIComponent(String(longitude))}`;
  const phone = location.property.agent.phone?.replace(/[^0-9]/g, "");
  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hello, I have difficulty locating the entrance for ${location.property.title}.`)}`
    : "";

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:py-12">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Authorized property visit
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          {location.property.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Approximate area: {location.property.area}, {location.property.city}
        </p>
        {location.location.address && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Entrance instructions: {location.location.address}
          </p>
        )}
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <ExactLocationMap
          latitude={latitude}
          longitude={longitude}
          readOnly
        />
        <div className="flex flex-wrap gap-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Get Directions
          </a>
          <a
            href={fallbackMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Open in OpenStreetMap
          </a>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 dark:border-emerald-400 dark:text-emerald-200"
            >
              Contact agent
            </a>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Directions are provided by Google Maps and depend on its current road data. Check local access restrictions and follow site instructions. OpenStreetMap map tiles may be unavailable; use the directions links as alternatives.
        </p>
      </section>
    </main>
  );
}
