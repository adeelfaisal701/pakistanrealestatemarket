"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BadgeCheck,
  Bed,
  Building2,
  CheckCircle2,
  House,
  Mail,
  MapPin,
  MessageCircle,
  Menu,
  Phone,
  Search,
  Shield,
  Star,
  UserRound,
  X,
} from "lucide-react";
import Navbar from "@/components/marketplace/Navbar";
import { PropertyCard } from "@/components/marketplace/property-card";
import { PropertyConversationChat } from "@/components/marketplace/PropertyConversationChat";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { SavePropertyButton } from "@/components/buyer/SavePropertyButton";
import { TrackedCallLink } from "@/components/marketplace/TrackedCallLink";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchPublicAgent, type PublicAgent } from "@/lib/public-directory";
import { fetchPublicPropertiesPage, type PublicPropertiesPage } from "@/lib/public-properties";
import { formatLandArea, formatPKR } from "@/lib/utils";
import { normalizeInternationalPhone } from "@/lib/phone";
import { agencyPath, propertyPath } from "@/lib/seo/slug";

const PAGE_SIZE = 6;
type ProfileTab = "overview" | "listings" | "reviews";

function MobileProfileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-1.5 px-3">
        <Link href="/" aria-label="Ghar Safar home" className="flex min-w-0 shrink items-center gap-1.5">
          <Image
            src="/images/ghar-safar-logo.png"
            alt="Ghar Safar logo"
            width={34}
            height={33}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="truncate text-[17px] font-extrabold tracking-tight text-slate-900">
            Ghar Safar
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/properties"
            aria-label="Search properties"
            className="flex h-10 w-9 items-center justify-center rounded-lg text-slate-800 hover:bg-slate-100"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/agent/add-property"
            className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-700 px-2.5 text-[11px] font-bold text-white"
          >
            Post Free Listing
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-800 hover:bg-slate-100"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="space-y-1 border-t border-slate-100 px-3 py-2">
          <Link href="/properties?purpose=Sale" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">Buy properties</Link>
          <Link href="/properties?purpose=Rent" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">Rent properties</Link>
          <Link href="/login" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700">Sign in</Link>
        </nav>
      )}
    </header>
  );
}

function availabilityLabel(status?: string) {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export default function PublicAgentProfilePage({
  agentId,
  initialAgent,
}: {
  agentId: string;
  /** Profile fetched on the server so the page is rendered for search engines. */
  initialAgent?: PublicAgent;
}) {
  const id = agentId;
  const [agent, setAgent] = useState<PublicAgent | null>(initialAgent?.id === agentId ? initialAgent : null);
  const [listings, setListings] = useState<PublicPropertiesPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(initialAgent?.id !== agentId);
  const initialConsumed = useRef(false);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState("");
  const [listingsError, setListingsError] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  const loadListings = useCallback(async (nextPage: number) => {
    setListingsLoading(true);
    setListingsError("");
    try {
      const result = await fetchPublicPropertiesPage({
        agentId: id,
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
  }, [id]);

  useEffect(() => {
    let active = true;
    // First run with the server-provided profile: keep it, only load listings.
    const reuseInitial = initialAgent?.id === id && !initialConsumed.current;
    initialConsumed.current = true;
    if (!reuseInitial) {
      setLoading(true);
      setError("");
      fetchPublicAgent(id)
        .then((result) => {
          if (active) setAgent(result);
        })
        .catch((requestError: unknown) => {
          if (active) setError(getApiErrorMessage(requestError));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    void loadListings(1);
    return () => {
      active = false;
    };
    // initialAgent is a one-time seed for the first render only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadListings]);

  const firstListing = listings?.properties[0];
  const agentPhone = agent?.phone
    ? normalizeInternationalPhone(agent.phone)
    : undefined;
  const hasPublicPhone = Boolean(agentPhone);
  const listingCount = listingsLoading ? null : listings?.pagination.total ?? 0;
  const trustIndicators = [
    ...(agent?.isVerified ? ["Verified Ghar Safar agent"] : []),
    ...(hasPublicPhone ? ["Public contact details available"] : []),
    ...((listingCount ?? 0) > 0 ? [`${listingCount} published ${listingCount === 1 ? "listing" : "listings"}`] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <MobileProfileHeader />
      <div className="hidden md:block">
        <Navbar />
      </div>
      <main className="md:hidden">
        {loading ? (
          <p role="status" className="m-4 rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Loading agent profile…</p>
        ) : error ? (
          <p role="alert" className="m-4 rounded-2xl bg-red-50 p-6 text-sm text-red-700">{error}</p>
        ) : agent ? (
          <>
            <section className="relative isolate overflow-hidden bg-slate-950 text-white">
              <div
                aria-hidden="true"
                className="agent-profile-mobile-hero absolute inset-0 z-0 bg-cover bg-center"
              />
              <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/85 via-slate-950/65 to-slate-950/45" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="relative z-20 mx-auto max-w-lg px-4 pb-5 pt-5">
                <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-white/85">
                  <ArrowLeft className="h-4 w-4" /> Marketplace
                </Link>
                <div className="flex items-center gap-3">
                  <div className="relative h-[94px] w-[94px] shrink-0">
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt={`${agent.name} profile`}
                        className="h-full w-full rounded-full border-[3px] border-white object-cover shadow-lg"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-white bg-emerald-100 text-emerald-800 shadow-lg">
                        <UserRound className="h-11 w-11" />
                      </span>
                    )}
                    {agent.isVerified && (
                      <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white" aria-label="Verified Agent">
                        <BadgeCheck className="h-6 w-6" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="break-words text-[21px] font-extrabold leading-tight tracking-tight">{agent.name}</h1>
                    {agent.isVerified && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                        <BadgeCheck className="h-4 w-4" /> Verified Agent
                      </span>
                    )}
                    {agent.agencyName && (
                      <Link
                        href={agencyPath(agent.agencyName)}
                        className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white hover:underline"
                      >
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{agent.agencyName}</span>
                      </Link>
                    )}
                  </div>
                </div>
                {agent.agencyAddress && (
                  <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-white/95">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{agent.agencyAddress}{agent.city ? `, ${agent.city}` : ""}</span>
                  </p>
                )}
                <div className="mt-5 grid grid-cols-3 gap-2 [&>button]:!gap-1 [&>button]:!px-1 [&>button]:!text-[10px] [&>button>svg]:h-3.5 [&>button>svg]:w-3.5">
                  {agentPhone ? (
                    firstListing ? (
                      <TrackedCallLink
                        propertyId={firstListing.id}
                        href={`tel:+${agentPhone}`}
                        className="inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-emerald-600 px-1 text-[11px] font-bold text-white shadow-sm"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Call Agent</span>
                      </TrackedCallLink>
                    ) : (
                      <a href={`tel:+${agentPhone}`} className="inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-emerald-600 px-1 text-[11px] font-bold text-white shadow-sm">
                        <Phone className="h-4 w-4" />
                        <span>Call Agent</span>
                      </a>
                    )
                  ) : (
                    <button type="button" disabled className="inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-emerald-800/80 px-1 text-[11px] font-bold text-white/70">
                      <Phone className="h-4 w-4" /><span>Call Agent</span>
                    </button>
                  )}
                  {firstListing ? (
                    <>
                      <PropertyConversationChat
                        propertyId={firstListing.id}
                        propertyTitle={firstListing.title}
                        coverImage={firstListing.images[0]}
                        location={`${firstListing.location.area}, ${firstListing.location.city}`}
                        price={firstListing.price}
                        availability={firstListing.availabilityStatus ?? "available"}
                        buttonLabel="Chat"
                      />
                      <PropertyConversationChat
                        propertyId={firstListing.id}
                        propertyTitle={firstListing.title}
                        coverImage={firstListing.images[0]}
                        location={`${firstListing.location.area}, ${firstListing.location.city}`}
                        price={firstListing.price}
                        availability={firstListing.availabilityStatus ?? "available"}
                        buttonLabel="Send Enquiry"
                      />
                    </>
                  ) : (
                    <>
                      <button type="button" disabled className="inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-white px-1 text-[11px] font-bold text-slate-400">
                        <Mail className="h-4 w-4" /><span>Chat</span>
                      </button>
                      <button type="button" disabled className="inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-white px-1 text-[11px] font-bold text-slate-400">
                        <Mail className="h-4 w-4" /><span>Send Enquiry</span>
                      </button>
                    </>
                  )}
                </div>
                {!firstListing && (
                  <p className="mt-2 text-center text-[10px] text-white/75">Chat and enquiry are available from an active listing.</p>
                )}
              </div>
            </section>

            <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
              <div role="tablist" aria-label="Agent profile sections" className="mx-auto grid max-w-lg grid-cols-3 px-3">
                {([
                  ["overview", "Overview"],
                  ["listings", `Listings${listingCount === null ? "" : ` (${listingCount})`}`],
                  ["reviews", "Reviews"],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    id={`agent-profile-tab-${tab}`}
                    aria-selected={activeTab === tab}
                    aria-controls={`agent-profile-panel-${tab}`}
                    onClick={() => setActiveTab(tab)}
                    className={`min-h-14 border-b-[3px] px-1 text-[13px] font-semibold transition-colors ${
                      activeTab === tab
                        ? "border-emerald-700 text-emerald-700"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-auto min-h-[45vh] max-w-lg space-y-4 px-4 py-4">
              {activeTab === "overview" && (
                <section
                  role="tabpanel"
                  id="agent-profile-panel-overview"
                  aria-labelledby="agent-profile-tab-overview"
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                    <UserRound className="h-5 w-5 fill-emerald-700 text-emerald-700" />
                    Agent Information
                  </h2>
                  <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                    {agent.agencyAddress && (
                      <div className="flex min-w-0 items-start gap-2">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-bold text-slate-900">Office Address</h3>
                          <p className="mt-1 break-words text-xs leading-relaxed text-slate-600">{agent.agencyAddress}{agent.city ? `, ${agent.city}` : ""}</p>
                        </div>
                      </div>
                    )}
                    {agent.agencyName && (
                      <div className="flex min-w-0 items-start gap-2">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-bold text-slate-900">Agency</h3>
                          <Link href={agencyPath(agent.agencyName)} className="mt-1 block break-words text-xs font-medium text-emerald-700 hover:underline">{agent.agencyName}</Link>
                        </div>
                      </div>
                    )}
                    <div className="flex min-w-0 items-start gap-2">
                      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-bold text-slate-900">Verification</h3>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${agent.isVerified ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                          {agent.isVerified ? "Verified" : "Not verified"}
                        </span>
                      </div>
                    </div>
                    {agent.city && (
                      <div className="flex min-w-0 items-start gap-2">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-bold text-slate-900">City</h3>
                          <p className="mt-1 text-xs text-slate-600">{agent.city}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "listings" && (
                <section
                  role="tabpanel"
                  id="agent-profile-panel-listings"
                  aria-labelledby="agent-profile-tab-listings"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">Properties by {agent.name}</h2>
                    <span className="shrink-0 text-xs font-medium text-slate-600">
                      {listingCount === null ? "…" : `${listingCount} Active`}
                    </span>
                  </div>
                  {listingsError ? (
                    <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{listingsError}</p>
                  ) : listingsLoading ? (
                    <p role="status" className="rounded-xl bg-white p-5 text-center text-sm text-slate-500">Loading public listings…</p>
                  ) : listings?.properties.length ? (
                    <>
                      <div className="space-y-3">
                        {listings.properties.map((property) => (
                          <article key={property.id} className="grid min-w-0 grid-cols-[38%_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="relative min-h-[190px] overflow-hidden bg-slate-100">
                              {property.images[0] ? (
                                <img src={property.images[0]} alt={property.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">No image</span>
                              )}
                              <Link href={propertyPath(property)} className="absolute inset-0 z-0" aria-label={`View ${property.title}`}>
                                <span className="sr-only">View property details</span>
                              </Link>
                              <span className="absolute left-2 top-2 z-10 rounded-full bg-emerald-700 px-2 py-1 text-[9px] font-extrabold text-white">
                                FOR {property.purpose.toUpperCase()}
                              </span>
                              <span className="absolute right-2 top-2 z-20">
                                <SavePropertyButton propertyId={property.id} compact />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-col p-2.5">
                              <Link href={propertyPath(property)} className="line-clamp-2 text-[13px] font-extrabold leading-snug text-slate-900 hover:text-emerald-700">
                                {property.title}
                              </Link>
                              <p className="mt-1.5 flex min-w-0 items-start gap-1 text-[10px] leading-snug text-slate-600">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                                <span className="line-clamp-2">{property.location.area}, {property.location.city}</span>
                              </p>
                              <p className="mt-2 text-[10px] font-semibold text-slate-700">
                                <House className="mr-1 inline h-3.5 w-3.5 text-slate-500" />{property.propertyType}
                                <span className="mx-1.5 text-slate-300">|</span>
                                {formatLandArea(property.areaSize, property.areaUnit)}
                              </p>
                              {(property.features?.bedrooms !== undefined || property.features?.bathrooms !== undefined) && (
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-700">
                                  {property.features?.bedrooms !== undefined && <span className="inline-flex items-center gap-1"><Bed className="h-3.5 w-3.5 text-slate-500" />{property.features.bedrooms} Beds</span>}
                                  {property.features?.bathrooms !== undefined && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-slate-500" />{property.features.bathrooms} Baths</span>}
                                </p>
                              )}
                              <p className="mt-auto pt-2 text-[14px] font-extrabold text-emerald-700">{formatPKR(property.price)}</p>
                              {property.availabilityStatus && (
                                <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-700">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  Availability: {availabilityLabel(property.availabilityStatus)}
                                </p>
                              )}
                              {property.agent?.phone && normalizeInternationalPhone(property.agent.phone) && (
                                <TrackedCallLink
                                  propertyId={property.id}
                                  href={`tel:+${normalizeInternationalPhone(property.agent.phone) ?? ""}`}
                                  className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-600 px-2 text-xs font-bold text-emerald-700"
                                >
                                  <Phone className="h-3.5 w-3.5" /> Call
                                </TrackedCallLink>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                      {listings.pagination.totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-3">
                          <Button variant="outline" disabled={page <= 1 || listingsLoading} onClick={() => void loadListings(page - 1)}>Previous</Button>
                          <span className="text-xs text-slate-500">Page {page} of {listings.pagination.totalPages}</span>
                          <Button variant="outline" disabled={page >= listings.pagination.totalPages || listingsLoading} onClick={() => void loadListings(page + 1)}>Next</Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No public listings are available for this agent yet.</p>
                  )}
                </section>
              )}

              {activeTab === "reviews" && (
                <section
                  role="tabpanel"
                  id="agent-profile-panel-reviews"
                  aria-labelledby="agent-profile-tab-reviews"
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-center"
                >
                  <Star className="mx-auto h-8 w-8 text-slate-400" />
                  <h2 className="mt-2 font-bold text-slate-900">Reviews aren’t available</h2>
                  <p className="mt-1 text-sm text-slate-600">This agent profile has no review data.</p>
                </section>
              )}

              {activeTab === "listings" && trustIndicators.length > 0 && (
                <section className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                    <Shield className="h-5 w-5 fill-emerald-700 text-emerald-700" />
                    Why Choose {agent.name}?
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                    {trustIndicators.map((indicator) => (
                      <li key={indicator} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {activeTab !== "reviews" && (
                <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <MessageCircle className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-extrabold text-slate-900">Need Help?</h2>
                    <p className="text-xs text-slate-600">{agent.phone ? `Chat with ${agent.name} on WhatsApp` : "Contact Ghar Safar support on WhatsApp"}</p>
                  </div>
                  {agent.phone ? (
                    <WhatsAppButton phoneNumber={agent.phone} className="h-10 w-auto shrink-0 rounded-lg px-3 text-xs font-bold">
                      Chat Now
                    </WhatsAppButton>
                  ) : (
                    <a href="https://wa.me/923007589188?text=Assalam%20o%20Alaikum%20Ghar%20Safar%20Support" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white">
                      <MessageCircle className="h-4 w-4" /> Chat Now
                    </a>
                  )}
                </section>
              )}
            </div>
          </>
        ) : null}
      </main>
      <main className="hidden md:block mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
          <ArrowLeft className="h-4 w-4" /> Marketplace
        </Link>
        {loading ? (
          <p role="status" className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Loading agent profile…</p>
        ) : error ? (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>
        ) : agent ? (
          <>
            <section className="mt-6 grid gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[auto_1fr] sm:items-center sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              {agent.avatarUrl ? (
                <img src={agent.avatarUrl} alt={`${agent.name} profile`} className="h-28 w-28 rounded-2xl border border-slate-200 object-cover sm:h-36 sm:w-36 dark:border-slate-700" />
              ) : (
                <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 sm:h-36 sm:w-36 dark:bg-emerald-950 dark:text-emerald-300"><UserRound className="h-12 w-12" /></span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{agent.name}</h1>
                  {agent.isVerified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><BadgeCheck className="h-4 w-4" /> Verified Agent</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {agent.city && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-emerald-600" />{agent.city}</span>}
                  {agent.agencyName && <Link href={agencyPath(agent.agencyName)} className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline dark:text-emerald-300"><Building2 className="h-4 w-4" />{agent.agencyName}</Link>}
                </div>
                {agent.agencyAddress && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-800 dark:text-slate-100">Office address:</span> {agent.agencyAddress}</p>}
                {agentPhone && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <a href={`tel:+${agentPhone}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Phone className="h-4 w-4" />Call Agent</a>
                    <WhatsAppButton
                      phoneNumber={agentPhone}
                      propertyId={firstListing?.id}
                      message={firstListing
                        ? `Salam, I am interested in "${firstListing.title}" listed in ${firstListing.location.city}.`
                        : undefined}
                      className="w-auto"
                    >
                      WhatsApp
                    </WhatsAppButton>
                    {firstListing && (
                      <>
                        <PropertyConversationChat
                          propertyId={firstListing.id}
                          propertyTitle={firstListing.title}
                          coverImage={firstListing.images[0]}
                          location={`${firstListing.location.area}, ${firstListing.location.city}`}
                          price={firstListing.price}
                          availability={firstListing.availabilityStatus ?? "available"}
                          buttonLabel="Chat"
                        />
                        <PropertyConversationChat
                          propertyId={firstListing.id}
                          propertyTitle={firstListing.title}
                          coverImage={firstListing.images[0]}
                          location={`${firstListing.location.area}, ${firstListing.location.city}`}
                          price={firstListing.price}
                          availability={firstListing.availabilityStatus ?? "available"}
                          buttonLabel="Send Enquiry"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            {agent.agencyAddress && (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-bold">Agent information</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Office address</dt><dd className="mt-1">{agent.agencyAddress}</dd></div>
                  {agent.city && <div><dt className="font-semibold text-slate-500 dark:text-slate-400">City</dt><dd className="mt-1">{agent.city}</dd></div>}
                  {agent.agencyName && <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Agency</dt><dd className="mt-1"><Link href={agencyPath(agent.agencyName)} className="text-emerald-700 hover:underline dark:text-emerald-300">{agent.agencyName}</Link></dd></div>}
                  <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Verification</dt><dd className="mt-1">{agent.isVerified ? "Verified" : "Not verified"}</dd></div>
                </dl>
              </section>
            )}

            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Public listings</p>
                  <h2 className="mt-1 text-2xl font-extrabold">Properties by {agent.name}</h2>
                </div>
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
                </>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">No public listings are available for this agent yet.</p>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
