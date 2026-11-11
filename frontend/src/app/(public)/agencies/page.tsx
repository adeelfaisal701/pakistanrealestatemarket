"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/marketplace/property-card";
import { PropertyConversationChat } from "@/components/marketplace/PropertyConversationChat";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import Navbar from "@/components/marketplace/Navbar";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchFeaturedAgencies,
  fetchPublicAgency,
  type PublicAgency,
  type PublicAgencyProfile,
} from "@/lib/public-directory";
import { fetchPublicPropertiesPage, type PublicPropertiesPage } from "@/lib/public-properties";

const PAGE_SIZE = 6;
const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80";

export default function PublicAgenciesPage() {
  const [agencyName, setAgencyName] = useState("");
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);
  const [agencies, setAgencies] = useState<PublicAgency[]>([]);
  const [listings, setListings] = useState<PublicPropertiesPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState("");
  const [listingsError, setListingsError] = useState("");

  useEffect(() => {
    setAgencyName(new URLSearchParams(window.location.search).get("name")?.trim() ?? "");
  }, []);

  const loadListings = useCallback(async (nextPage: number) => {
    if (!agencyName) return;
    setListingsLoading(true);
    setListingsError("");
    try {
      const result = await fetchPublicPropertiesPage({
        agencyName,
        page: nextPage,
        limit: PAGE_SIZE,
        sortBy: "newest",
      });
      setListings(result);
      setPage(nextPage);
    } catch (requestError: unknown) {
      setListingsError(getApiErrorMessage(requestError));
    } finally {
      setListingsLoading(false);
    }
  }, [agencyName]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setAgency(null);
    setAgencies([]);
    if (agencyName) {
      fetchPublicAgency(agencyName)
        .then((result) => {
          if (active) setAgency(result);
        })
        .catch((requestError: unknown) => {
          if (active) setError(getApiErrorMessage(requestError));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      void loadListings(1);
    } else {
      setListings(null);
      setListingsLoading(false);
      fetchFeaturedAgencies()
        .then((result) => {
          if (active) setAgencies(result);
        })
        .catch((requestError: unknown) => {
          if (active) setError(getApiErrorMessage(requestError));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [agencyName, loadListings]);

  const firstListing = listings?.properties[0];
  const locations = agency
    ? [...new Set([agency.city, ...agency.locations].map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
    : [];
  const officeAddresses = agency
    ? [...new Set([agency.officeAddress, ...(agency.officeAddresses ?? [])].map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
          <ArrowLeft className="h-4 w-4" /> Back to Ghar Safar
        </Link>

        {loading ? (
          <p role="status" className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Loading agency profile…</p>
        ) : error ? (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>
        ) : agencyName && agency ? (
          <>
            {/* Section A: Agency Cover Banner */}
            <section aria-label="Agency Cover Banner" className="relative mt-5 h-48 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-sm sm:h-64 sm:rounded-3xl md:h-72 lg:h-80 dark:border-slate-800">
              <img
                src={agency.coverImageUrl || DEFAULT_COVER_IMAGE}
                alt={`${agency.name} cover banner`}
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_COVER_IMAGE) {
                    e.currentTarget.src = DEFAULT_COVER_IMAGE;
                  }
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-slate-950/10"
              />
            </section>

            {/* Section B: Agency Information Card */}
            <section aria-label="Agency Information" className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:mt-6 sm:rounded-3xl sm:p-7 lg:p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6 min-w-0 flex-1">
                  {/* Agency Logo */}
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:h-28 sm:w-28 dark:border-slate-700 dark:bg-slate-800">
                    {agency.logoUrl ? (
                      <img
                        src={agency.logoUrl}
                        alt={`${agency.name} logo`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-10 w-10 text-emerald-600 sm:h-14 sm:w-14 dark:text-emerald-400" />
                    )}
                  </div>

                  {/* Main Information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-extrabold tracking-tight text-[#071B2B] sm:text-3xl lg:text-4xl dark:text-white break-words">
                        {agency.name}
                      </h1>
                      {agency.isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                          <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                          Verified agency
                        </span>
                      )}
                    </div>

                    {agency.agencyType && (
                      <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {agency.agencyType}
                      </p>
                    )}

                    {/* Metadata Badges */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      {!!locations.length && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          {locations.join(", ")}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        {agency.agentCount} associated {agency.agentCount === 1 ? "agent" : "agents"}
                      </span>
                      {listings && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          {listings.pagination.total} published {listings.pagination.total === 1 ? "listing" : "listings"}
                        </span>
                      )}
                    </div>

                    {/* Complete Agency Address */}
                    {!!officeAddresses.length && (
                      <div className="mt-3 flex items-start gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                        <span className="leading-relaxed">{officeAddresses.join(" · ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5 lg:flex-col lg:w-48 shrink-0">
                  {agency.phone && (
                    <a
                      href={`tel:${agency.phone}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>Call agency</span>
                    </a>
                  )}
                  {agency.phone && (
                    <WhatsAppButton
                      phoneNumber={agency.phone}
                      className="h-11 w-full rounded-xl px-4 text-sm font-semibold shadow-sm transition active:scale-[0.98]"
                    >
                      WhatsApp
                    </WhatsAppButton>
                  )}
                  {agency.email && (
                    <a
                      href={`mailto:${agency.email}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span>Email</span>
                    </a>
                  )}
                  <Link
                    href="/agent/agency-profile"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    <span>Manage agency</span>
                  </Link>
                </div>
              </div>

              {/* Agency Description Section */}
              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    About the agency
                  </h2>
                  {agency.website && (
                    <a
                      href={agency.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span>Visit website</span>
                    </a>
                  )}
                </div>
                {agency.description ? (
                  <p className="mt-2.5 whitespace-pre-line text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                    {agency.description}
                  </p>
                ) : (
                  <p className="mt-2.5 text-sm text-slate-400 dark:text-slate-500 italic">
                    An agency introduction has not been added yet.
                  </p>
                )}
              </div>
            </section>

            {/* Agency Team Section */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-7 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Agency team</p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#071B2B] dark:text-white">Our agents</h2>
                </div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {agency.agentCount} {agency.agentCount === 1 ? "agent" : "agents"}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {agency.agents.map((agent) => (
                  <article key={agent.id} className="flex min-w-0 items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                    <Link href={`/agents/${encodeURIComponent(agent.id)}`} aria-label={`View ${agent.name}'s profile`} className="shrink-0">
                      {agent.avatarUrl ? (
                        <img src={agent.avatarUrl} alt={`${agent.name} profile`} className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/10" loading="lazy" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/10">
                          <UserRound className="h-6 w-6" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/agents/${encodeURIComponent(agent.id)}`} className="flex items-center gap-1 font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                        <span className="truncate">{agent.name}</span>
                        {agent.isVerified && <BadgeCheck aria-label="Verified agent" className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </Link>
                      {agent.city && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{agent.city}</p>}
                      <Link href={`/agents/${encodeURIComponent(agent.id)}`} className="mt-1 inline-block text-xs font-semibold text-emerald-700 dark:text-emerald-300">View profile</Link>
                    </div>
                  </article>
                ))}
                {!agency.agents.length && (
                  <p className="sm:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">
                    No active public agent profiles are currently associated with this agency.
                  </p>
                )}
              </div>
            </section>

            {!!agency.galleryUrls?.length && (
              <section className="mt-6">
                <div className="mb-3"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Agency photos</p><h2 className="mt-1 text-xl font-bold">Gallery</h2></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {agency.galleryUrls.map((url) => <img key={url} src={url} alt={`${agency.name} gallery`} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />)}
                </div>
              </section>
            )}

            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Published listings</p><h2 className="mt-1 text-2xl font-extrabold">{agency.name} properties</h2></div>
                {listings && <p className="text-sm text-slate-500 dark:text-slate-400">{listings.pagination.total} active listings</p>}
              </div>
              {listingsError ? (
                <p role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{listingsError}</p>
              ) : listingsLoading ? (
                <p role="status" className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 dark:bg-slate-900">Loading public listings…</p>
              ) : listings?.properties.length ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {listings.properties.map((property) => (
                      <div key={property.id}>
                        <PropertyCard property={property} />
                        {property.availabilityStatus && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Availability: {property.availabilityStatus.replaceAll("_", " ")}</p>}
                      </div>
                    ))}
                  </div>
                  {listings.pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <Button variant="outline" disabled={page <= 1} onClick={() => void loadListings(page - 1)}>Previous</Button>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {listings.pagination.totalPages}</span>
                      <Button variant="outline" disabled={page >= listings.pagination.totalPages} onClick={() => void loadListings(page + 1)}>Next</Button>
                    </div>
                  )}
                  {firstListing && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <PropertyConversationChat propertyId={firstListing.id} propertyTitle={firstListing.title} coverImage={firstListing.images[0]} location={`${firstListing.location.area}, ${firstListing.location.city}`} price={firstListing.price} availability={firstListing.availabilityStatus ?? "available"} buttonLabel="Chat about listing" />
                      <PropertyConversationChat propertyId={firstListing.id} propertyTitle={firstListing.title} coverImage={firstListing.images[0]} location={`${firstListing.location.area}, ${firstListing.location.city}`} price={firstListing.price} availability={firstListing.availabilityStatus ?? "available"} buttonLabel="Send Enquiry" />
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">No public listings are available for this agency yet.</p>
              )}
            </section>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-3xl font-extrabold">Featured Agencies &amp; Estates</h1>
            {agencies.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {agencies.map((item) => (
                  <Link key={item.name} href={`/agencies?name=${encodeURIComponent(item.name)}`} className="rounded-2xl border border-slate-200 bg-white p-5 font-semibold text-slate-900 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                    <span className="flex items-center gap-3"><Building2 className="h-6 w-6 shrink-0 text-emerald-600" /><span className="min-w-0 truncate">{item.name}</span></span>
                    <span className="mt-2 block text-sm font-normal text-slate-500 dark:text-slate-400">{item.agentCount} {item.agentCount === 1 ? "agent" : "agents"}{item.locations.length ? ` · ${item.locations.join(", ")}` : ""}</span>
                    <span className="mt-3 inline-flex items-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">View Agency <ArrowLeft className="ml-1 h-4 w-4 rotate-180" /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No agency affiliations are available yet.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="grid gap-1 sm:grid-cols-[125px_1fr]"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt><dd className="break-words text-slate-800 dark:text-slate-200">{value}</dd></div>;
}
