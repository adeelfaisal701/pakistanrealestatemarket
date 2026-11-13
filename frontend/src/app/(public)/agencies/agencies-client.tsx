"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Home,
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
import { agencyPath, agentPath } from "@/lib/seo/slug";

const PAGE_SIZE = 6;
const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80";

export default function PublicAgenciesPage({
  initialAgencyName,
  initialAgency,
  initialAgencies,
}: {
  initialAgencyName?: string;
  /** Profile fetched on the server so the page is rendered for search engines. */
  initialAgency?: PublicAgencyProfile;
  /** Directory (featured agencies) fetched on the server. */
  initialAgencies?: PublicAgency[];
}) {
  // `/agencies/<slug>` passes the resolved name; legacy `?name=` URLs still work.
  const [agencyName, setAgencyName] = useState(initialAgencyName ?? "");
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(initialAgency ?? null);
  const [agencies, setAgencies] = useState<PublicAgency[]>(initialAgencies ?? []);
  const [listings, setListings] = useState<PublicPropertiesPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!initialAgency && !initialAgencies);
  const initialConsumed = useRef(false);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState("");
  const [listingsError, setListingsError] = useState("");

  useEffect(() => {
    if (initialAgencyName) return;
    setAgencyName(new URLSearchParams(window.location.search).get("name")?.trim() ?? "");
  }, [initialAgencyName]);

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
    // First run with server-provided data: keep it (profile → only load listings).
    const firstRun = !initialConsumed.current;
    initialConsumed.current = true;
    const reuseDirectory = firstRun && !agencyName && Boolean(initialAgencies);
    const reuseInitial =
      reuseDirectory || (firstRun && Boolean(initialAgency) && agencyName === initialAgencyName);
    if (!reuseInitial) {
      setLoading(true);
      setError("");
      setAgency(null);
      setAgencies([]);
    }
    if (agencyName) {
      if (!reuseInitial) {
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
      }
      void loadListings(1);
    } else {
      setListings(null);
      setListingsLoading(false);
      if (reuseDirectory) return () => {
        active = false;
      };
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
    // initialAgency is a one-time seed for the first render only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Navbar showPostButton={false} />
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
            {/* Unified Agency Profile Card: Facebook / WhatsApp Business Style */}
            <section aria-label="Agency Profile" className="relative mt-5 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Full-width Cover Photo Banner */}
              <div className="relative h-52 w-full overflow-hidden bg-slate-900 sm:h-64 md:h-72">
                <img
                  src={agency.coverImageUrl || DEFAULT_COVER_IMAGE}
                  alt={`${agency.name} cover`}
                  className="h-full w-full object-cover object-center"
                  onError={(e) => {
                    if (e.currentTarget.src !== DEFAULT_COVER_IMAGE) {
                      e.currentTarget.src = DEFAULT_COVER_IMAGE;
                    }
                  }}
                />
              </div>

              {/* Information Card Body with Overlapping Circular Logo */}
              <div className="relative bg-white px-5 pb-6 pt-0 sm:px-8 sm:pb-8 dark:bg-slate-900">
                {/* Header Row: Circular Logo + Agency Name & Category */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
                  {/* Overlapping Circular Agency Logo */}
                  <div className="-mt-14 relative z-20 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3.5px] border-[#008F68] bg-white p-1.5 shadow-lg sm:-mt-20 sm:h-36 sm:w-36 sm:p-2 dark:bg-slate-800">
                    {agency.logoUrl ? (
                      <img
                        src={agency.logoUrl}
                        alt={`${agency.name} logo`}
                        className="h-full w-full rounded-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-12 w-12 text-[#008F68] sm:h-16 sm:w-16" />
                    )}
                  </div>

                  {/* Agency Name, Verification Badge & Category */}
                  <div className="min-w-0 flex-1 pt-1 sm:pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-[#071B2B] sm:text-3xl dark:text-white break-words">
                        {agency.name}
                      </h1>
                      {agency.isVerified && (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#008F68] text-white shadow-sm" title="Verified agency">
                          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {agency.agencyType && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EAF7F2] px-3 py-1 text-xs sm:text-sm font-semibold text-[#008F68] dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Home className="h-3.5 w-3.5 shrink-0" />
                        <span>{agency.agencyType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location and Statistics Row */}
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                  {!!locations.length && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-[#008F68]" />
                      <span>{locations.join(", ")}</span>
                    </span>
                  )}
                  {!!locations.length && (
                    <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0 text-[#008F68]" />
                    <span>{agency.agentCount} Associated {agency.agentCount === 1 ? "Agent" : "Agents"}</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 shrink-0 text-[#008F68]" />
                    <span>{listings ? listings.pagination.total : 0} Published Listings</span>
                  </span>
                </div>

                {/* Complete Agency Address */}
                {!!officeAddresses.length && (
                  <div className="mt-3 flex items-start gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#008F68]" />
                    <span className="leading-relaxed">{officeAddresses.join(" · ")}</span>
                  </div>
                )}

                {/* Agency Description */}
                {agency.description && (
                  <>
                    <div className="my-4 border-t border-slate-100 dark:border-slate-800" />
                    <p className="text-sm sm:text-base font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {agency.description}
                    </p>
                  </>
                )}

                {/* Action Buttons: Exact 3-Buttons Layout */}
                <div className="mt-5 space-y-2.5">
                  {/* Row 1: Call Agency (100% full width, dark black / deep navy background, white phone icon and text) */}
                  {agency.phone && (
                    <a
                      href={`tel:${agency.phone}`}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#071B2B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B2538] active:scale-[0.99] dark:bg-slate-950 dark:hover:bg-slate-800"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-white" />
                      <span>Call Agency</span>
                    </a>
                  )}

                  {/* Row 2: WhatsApp (50%) & Email (50%) Side by Side */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* WhatsApp: brand green background, white WhatsApp icon and text */}
                    {agency.phone && (
                      <WhatsAppButton
                        phoneNumber={agency.phone}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#008F68] hover:bg-[#007555] px-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]"
                      >
                        WhatsApp
                      </WhatsAppButton>
                    )}

                    {/* Email: white background, green border, green email icon and text */}
                    {agency.email && (
                      <a
                        href={`mailto:${agency.email}`}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#008F68] bg-white px-4 text-sm font-semibold text-[#008F68] shadow-sm transition hover:bg-[#EAF7F2] active:scale-[0.99] dark:bg-transparent dark:hover:bg-emerald-950/30"
                      >
                        <Mail className="h-4 w-4 shrink-0 text-[#008F68]" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>
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
                    <Link href={agentPath(agent)} aria-label={`View ${agent.name}'s profile`} className="shrink-0">
                      {agent.avatarUrl ? (
                        <img src={agent.avatarUrl} alt={`${agent.name} profile`} className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/10" loading="lazy" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/10">
                          <UserRound className="h-6 w-6" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={agentPath(agent)} className="flex items-center gap-1 font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                        <span className="truncate">{agent.name}</span>
                        {agent.isVerified && <BadgeCheck aria-label="Verified agent" className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </Link>
                      {agent.city && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{agent.city}</p>}
                      <Link href={agentPath(agent)} className="mt-1 inline-block text-xs font-semibold text-emerald-700 dark:text-emerald-300">View profile</Link>
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
                  <Link key={item.name} href={agencyPath(item.name)} className="rounded-2xl border border-slate-200 bg-white p-5 font-semibold text-slate-900 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
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
