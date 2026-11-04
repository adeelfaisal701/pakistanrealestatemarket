"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bath,
  Bed,
  ClipboardList,
  House,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";
import { SavePropertyButton } from "@/components/buyer/SavePropertyButton";
import { formatLandArea, formatPKR } from "@/lib/utils";
import type { MarketplaceProperty } from "@/types/marketplace";

interface BuyerOverview {
  savedProperties: number;
}

interface BuyerProfile {
  name: string;
  preferences: {
    preferredCity: string;
    preferredLocations: string[];
  };
}

interface RecommendationPage {
  items: MarketplaceProperty[];
  personalized: boolean;
}

interface SavedSearch {
  id: string;
}

interface BuyerRequirement {
  id: string;
}

function RecommendedPropertyCard({
  property,
}: {
  property: MarketplaceProperty;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#1d304d] bg-[#0d1b31] shadow-lg shadow-black/20">
      <div className="relative aspect-[1.55] overflow-hidden bg-[#14243d]">
        {property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            <House className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase text-white shadow">
          For {property.purpose}
        </span>
        <div className="absolute right-3 top-3">
          <SavePropertyButton propertyId={property.id} compact />
        </div>
      </div>

      <div className="space-y-2.5 p-3">
        <h3 className="truncate text-sm font-bold text-white" title={property.title}>
          {property.title}
        </h3>
        <p className="flex items-center gap-1 text-xs text-[#b8c7df]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{property.location.area}, {property.location.city}</span>
        </p>
        <p className="border-b border-[#1a2c46] pb-2 text-base font-extrabold text-emerald-400">
          {formatPKR(property.price)}
        </p>
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#c2cee0]">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <House className="h-3.5 w-3.5" />
            {formatLandArea(property.areaSize, property.areaUnit)}
          </span>
          {property.features?.bedrooms != null && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Bed className="h-3.5 w-3.5" />
              {property.features.bedrooms} Beds
            </span>
          )}
          {property.features?.bathrooms != null && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Bath className="h-3.5 w-3.5" />
              {property.features.bathrooms} Baths
            </span>
          )}
        </div>
        <Link
          href={`/property/${encodeURIComponent(property.id)}`}
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#334968] text-xs font-semibold text-slate-100 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10"
        >
          View Details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function BuyerDashboard() {
  const [overview, setOverview] = useState<BuyerOverview | null>(null);
  const [savedSearchCount, setSavedSearchCount] = useState<number | null>(null);
  const [requirementCount, setRequirementCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        overviewResponse,
        savedSearchResponse,
        requirementsResponse,
        profileResponse,
        recommendationResponse,
      ] = await Promise.all([
        apiClient.get<ApiEnvelope<BuyerOverview>>("/buyer/overview"),
        apiClient.get<ApiEnvelope<SavedSearch[]>>("/buyer/saved-searches"),
        apiClient.get<ApiEnvelope<BuyerRequirement[]>>("/requirements/buyer"),
        apiClient.get<ApiEnvelope<BuyerProfile>>("/buyer/profile"),
        apiClient.get<ApiEnvelope<RecommendationPage>>("/buyer/recommendations"),
      ]);
      if (
        !Array.isArray(savedSearchResponse.data.data) ||
        !Array.isArray(requirementsResponse.data.data) ||
        !Array.isArray(recommendationResponse.data.data.items)
      ) {
        throw new Error("The buyer dashboard response was invalid. Please retry.");
      }
      setOverview(overviewResponse.data.data);
      setSavedSearchCount(savedSearchResponse.data.data.length);
      setRequirementCount(requirementsResponse.data.data.length);
      setProfile(profileResponse.data.data);
      setRecommendations({
        ...recommendationResponse.data.data,
        items: recommendationResponse.data.data.items.slice(0, 3),
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setOverview(null);
      setSavedSearchCount(null);
      setRequirementCount(null);
      setProfile(null);
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const location =
    profile?.preferences.preferredCity ||
    profile?.preferences.preferredLocations[0] ||
    "Location not set";

  const summary = [
    {
      label: "Saved Properties",
      description: "Your saved listings",
      count: overview?.savedProperties,
      href: "/buyer/saved-properties",
      icon: House,
      color: "bg-emerald-600 text-white shadow-emerald-900/40",
    },
    {
      label: "Saved Searches",
      description: "Your search alerts",
      count: savedSearchCount,
      href: "/buyer/saved-searches",
      icon: Search,
      color: "bg-violet-600 text-white shadow-violet-900/40",
    },
    {
      label: "My Requirements",
      description: "Your requirements",
      count: requirementCount,
      href: "/buyer/requirements",
      icon: ClipboardList,
      color: "bg-blue-600 text-white shadow-blue-900/40",
    },
  ];

  return (
    <div className="min-h-full space-y-6 text-slate-100">
      <header
        className="relative min-h-[148px] overflow-hidden rounded-2xl bg-[#07152b] bg-cover bg-center px-6 py-6 sm:px-8"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(5,16,34,.88) 0%, rgba(5,16,34,.72) 45%, rgba(5,16,34,.48) 100%), url('/images/buyer-dashboard-house.png')",
        }}
      >
        <div className="relative z-10 flex min-h-[100px] flex-wrap items-start justify-between gap-5">
          <div className="pt-1">
            <p className="mb-1 text-sm font-semibold text-emerald-400">Welcome Back,</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {profile?.name || "Buyer"}
              <span aria-hidden="true" className="ml-2">👋</span>
            </h1>
            <p className="mt-2 text-sm text-[#b8c7df]">
              Find and manage your property preferences in one place.
            </p>
          </div>
          <Link
            href="/buyer/profile"
            aria-label={`Selected location: ${location}. Edit location preferences`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#273b5b] bg-[#0b1930]/90 px-4 text-sm font-semibold text-white hover:border-emerald-500"
          >
            <MapPin className="h-4 w-4 fill-current" />
            {location}
            <span className="ml-1 text-slate-400">⌄</span>
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <section aria-label="Buyer account summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map(({ label, description, count, href, icon: Icon, color }) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-[116px] items-center gap-4 rounded-2xl border border-[#1c304e] bg-[#0d1b31]/95 p-4 shadow-lg shadow-black/20 transition-colors hover:border-emerald-500/60 sm:p-5"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg ${color}`}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-white">
                  {loading ? "—" : count ?? 0}
                </span>
              </span>
              <span className="block truncate text-sm font-semibold text-white">{label}</span>
              <span className="mt-1 block text-xs text-[#aebed5]">{description}</span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a2b46] text-slate-200">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-[#1c304e] bg-[#0a182d]/95 p-4 shadow-xl shadow-black/20 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Star className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Recommended Properties</h2>
              <p className="mt-1 text-xs text-[#aebed5]">
                Properties that match your preferences.
              </p>
            </div>
          </div>
          <Link
            href="/properties"
            className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Browse All Properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <p role="status" className="rounded-xl border border-[#1c304e] p-10 text-center text-sm text-[#aebed5]">
            Loading recommended properties…
          </p>
        ) : recommendations?.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.items.map((property) => (
              <RecommendedPropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : !error ? (
          <div className="rounded-xl border border-dashed border-[#263b5b] p-10 text-center text-sm text-[#aebed5]">
            No recommended properties are available right now.
          </div>
        ) : null}
      </section>
    </div>
  );
}
