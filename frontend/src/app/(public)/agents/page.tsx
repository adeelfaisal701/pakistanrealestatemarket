"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Navbar from "@/components/marketplace/Navbar";
import { fetchPublicAgents, type PublicAgent } from "@/lib/public-directory";
import { getApiErrorMessage } from "@/lib/api-client";

export default function AgentsDirectoryPage() {
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchPublicAgents()
      .then((data) => {
        if (active) setAgents(data);
      })
      .catch((err: unknown) => {
        if (active) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((agent) => {
      if (agent.city?.trim()) {
        set.add(agent.city.trim());
      }
    });
    return Array.from(set).sort();
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      if (verifiedOnly && !agent.isVerified) return false;
      if (selectedCity !== "all" && agent.city?.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = agent.name?.toLowerCase().includes(query);
        const agencyMatch = agent.agencyName?.toLowerCase().includes(query);
        const cityMatch = agent.city?.toLowerCase().includes(query);
        if (!nameMatch && !agencyMatch && !cityMatch) return false;
      }
      return true;
    });
  }, [agents, searchQuery, selectedCity, verifiedOnly]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Ghar Safar
        </Link>

        {/* Page Header */}
        <header className="mt-5 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Verified Real Estate Experts
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#071B2B] sm:text-4xl lg:text-5xl dark:text-white">
            Find Your Real Estate Agent
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            Connect with verified real estate specialists and property consultants across Pakistan.
            Find local market experts to guide your journey to buy, sell, or rent properties.
          </p>
        </header>

        {/* Search & Filter Toolbar */}
        <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by agent name, agency, or city..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* City Filter */}
            {cities.length > 0 && (
              <div className="sm:w-48">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-medium text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="Filter by city"
                >
                  <option value="all">All Cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Verified Only Toggle */}
            <button
              type="button"
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition sm:text-sm ${
                verifiedOnly
                  ? "border-[#008F68] bg-[#EAF7F2] text-[#008F68] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <BadgeCheck className="h-4 w-4" />
              <span>Verified Only</span>
            </button>
          </div>

          {/* Active Results Summary */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:text-sm dark:border-slate-800 dark:text-slate-400">
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200">{filteredAgents.length}</strong>{" "}
              {filteredAgents.length === 1 ? "registered agent" : "registered agents"}
            </span>

            {(searchQuery || selectedCity !== "all" || verifiedOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity("all");
                  setVerifiedOnly(false);
                }}
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Agents Listing Content */}
        <section aria-label="Agents List" className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div
                  key={item}
                  className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="h-20 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-4 h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="mt-5 h-10 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
            >
              <p className="font-semibold">Unable to load agents directory</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : filteredAgents.length ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredAgents.map((agent) => (
                <article
                  key={agent.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <div className="flex flex-col items-center text-center">
                    {/* Agent Avatar */}
                    <Link
                      href={`/agents/${encodeURIComponent(agent.id)}`}
                      className="relative block"
                      aria-label={`View ${agent.name}'s profile`}
                    >
                      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-500/20 bg-emerald-50 shadow-sm transition group-hover:scale-105 dark:bg-emerald-950/40">
                        {agent.avatarUrl ? (
                          <img
                            src={agent.avatarUrl}
                            alt={`${agent.name} profile`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <UserRound className="h-9 w-9 text-emerald-600 dark:text-emerald-300" />
                        )}
                      </div>
                    </Link>

                    {/* Verification Badge */}
                    {agent.isVerified && (
                      <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        Verified Agent
                      </span>
                    )}

                    {/* Agent Name */}
                    <Link
                      href={`/agents/${encodeURIComponent(agent.id)}`}
                      className="mt-2 block w-full truncate text-base font-bold text-[#071B2B] hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
                    >
                      {agent.name}
                    </Link>

                    {/* Agency Name */}
                    {agent.agencyName && (
                      <Link
                        href={`/agencies?name=${encodeURIComponent(agent.agencyName)}`}
                        className="mt-1 flex w-full items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300"
                        title={agent.agencyName}
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{agent.agencyName}</span>
                      </Link>
                    )}

                    {/* Location */}
                    {agent.city && (
                      <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{agent.city}</span>
                      </p>
                    )}
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <Link
                      href={`/agents/${encodeURIComponent(agent.id)}`}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {agent.phone && (
                      <a
                        href={`tel:${agent.phone}`}
                        aria-label={`Call ${agent.name}`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <UserRound className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
              <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                No matching agents found
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {searchQuery || selectedCity !== "all" || verifiedOnly
                  ? "Try adjusting your search criteria or resetting filters."
                  : "No public agent profiles are available at this time."}
              </p>
              {(searchQuery || selectedCity !== "all" || verifiedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCity("all");
                    setVerifiedOnly(false);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

