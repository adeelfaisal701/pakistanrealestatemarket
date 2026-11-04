"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, MapPin, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  type ClientRequirement,
  type RequirementOffer,
  type RequirementProperty,
  formatPkr,
  rankRequirementProperties,
} from "@/lib/requirements";

type RequirementWithOffer = ClientRequirement & { hasSubmittedOffer: boolean };
type OfferForm = { propertyId: string; message: string };

function ListingOption({
  property,
  selected,
  match,
  onSelect,
}: {
  property: RequirementProperty;
  selected: boolean;
  match?: "strong" | "partial";
  onSelect: () => void;
}) {
  const bedrooms = property.bedrooms ?? property.features?.bedrooms;
  const bathrooms = property.bathrooms ?? property.features?.bathrooms;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-emerald-500 bg-emerald-500/10"
          : "border-[#263952] bg-[#08101d] hover:border-[#49627f]"
      }`}
    >
      <span className="flex flex-wrap items-start justify-between gap-2">
        <span className="font-semibold text-white">{property.title}</span>
        {match && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            match === "strong"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}>
            {match === "strong" ? "Strong Match" : "Partial Match"}
          </span>
        )}
      </span>
      <span className="mt-1 block text-sm text-slate-300">
        {formatPkr(property.price)} · {property.purpose} · {property.propertyType}
      </span>
      <span className="mt-1 block text-sm text-slate-400">
        {property.location.area}, {property.location.city} · {property.areaSize} {property.areaUnit}
        {bedrooms != null ? ` · ${bedrooms} beds` : ""}
        {bathrooms != null ? ` · ${bathrooms} baths` : ""}
      </span>
    </button>
  );
}

export function AgentRequirementsManager() {
  const [requirements, setRequirements] = useState<RequirementWithOffer[]>([]);
  const [properties, setProperties] = useState<RequirementProperty[]>([]);
  const [offers, setOffers] = useState<RequirementOffer[]>([]);
  const [tab, setTab] = useState<"requirements" | "offers">("requirements");
  const [openId, setOpenId] = useState("");
  const [forms, setForms] = useState<Record<string, OfferForm>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const [requirementsResponse, propertiesResponse, offersResponse] = await Promise.all([
        apiClient.get<ApiEnvelope<RequirementWithOffer[]>>("/requirements/agent"),
        apiClient.get<ApiEnvelope<RequirementProperty[]>>("/requirements/agent/properties"),
        apiClient.get<ApiEnvelope<RequirementOffer[]>>("/requirements/agent/offers"),
      ]);
      if (!Array.isArray(requirementsResponse.data.data) || !Array.isArray(propertiesResponse.data.data) || !Array.isArray(offersResponse.data.data)) {
        throw new Error("Requirements data was invalid. Please retry.");
      }
      setRequirements(requirementsResponse.data.data);
      setProperties(propertiesResponse.data.data);
      setOffers(offersResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      if (!background) {
        setRequirements([]);
        setProperties([]);
        setOffers([]);
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const updateForm = (requirementId: string, field: keyof OfferForm, value: string) => {
    setForms((current) => ({
      ...current,
      [requirementId]: {
        propertyId: current[requirementId]?.propertyId ?? "",
        message: current[requirementId]?.message ?? "",
        [field]: value,
      },
    }));
  };

  const submit = async (requirement: RequirementWithOffer) => {
    const form = forms[requirement.id];
    if (!form?.propertyId) {
      setError("Choose an eligible listing before submitting an offer.");
      return;
    }
    setSubmitting(requirement.id);
    setError("");
    try {
      await apiClient.post(`/requirements/agent/${encodeURIComponent(requirement.id)}/offers`, {
        propertyId: form.propertyId,
        message: form.message.trim(),
      });
      setOpenId("");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting("");
    }
  };

  const errorAlert = error ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
        <p className="mb-2 text-xs text-slate-400">Agent Workspace / Client Requirements</p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Client Requirements</h1>
        <p className="mt-1 text-sm text-slate-400">Browse buyer requests and submit existing eligible listings. Buyer identity and contact details are not shared.</p>
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </header>
      {errorAlert}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={tab === "requirements" ? "default" : "outline"} onClick={() => setTab("requirements")}>Available requirements</Button>
        <Button type="button" variant={tab === "offers" ? "default" : "outline"} onClick={() => setTab("offers")}>My offers ({offers.length})</Button>
      </div>
      {loading ? <p role="status" className="rounded-2xl border border-[#1b2b42] bg-[#0b1626] p-12 text-center text-sm text-slate-400">Loading…</p> : tab === "requirements" ? (
        requirements.length ? <div className="space-y-3">
          {requirements.map((item) => {
            const form = forms[item.id] ?? { propertyId: "", message: "" };
            const { matching, other } = rankRequirementProperties(item, properties);
            return (
              <article key={item.id} className="rounded-2xl border border-[#1b2b42] bg-[#0b1626] p-5 text-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400"><MapPin className="h-4 w-4" />{item.location.area}, {item.location.city} · {item.purpose} · {item.propertyType}</p>
                    <p className="mt-2 text-sm text-slate-300">{[item.minBudget != null && `From ${formatPkr(item.minBudget)}`, item.maxBudget != null && `Up to ${formatPkr(item.maxBudget)}`, item.minArea != null && `${item.minArea}+ ${item.areaUnit ?? ""}`, item.maxArea != null && `max ${item.maxArea} ${item.areaUnit ?? ""}`, item.bedrooms != null && `${item.bedrooms}+ bedrooms`, item.bathrooms != null && `${item.bathrooms}+ bathrooms`].filter(Boolean).join(" · ") || "No budget or area range"}</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">{item.offerCount ?? 0} offers</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.description}</p>
                <div className="mt-4">
                  {item.hasSubmittedOffer ? <p className="text-sm font-medium text-emerald-300">You have already submitted an offer.</p> : properties.length === 0 ? <p className="text-sm text-amber-300">You need an active published listing before you can offer a property.</p> : (
                    <>
                      {!openId || openId !== item.id ? <Button size="sm" onClick={() => setOpenId(item.id)}>Offer a listing</Button> : (
                        <div className="space-y-3 rounded-xl border border-[#263952] bg-[#08101d] p-4">
                          <section className="space-y-2" aria-label="Matching listings">
                            <h3 className="font-semibold text-white">Matching Listings</h3>
                            {!matching.some(({ strength }) => strength === "strong") && (
                              <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
                                No exact matches found. You can still offer other available properties below.
                              </p>
                            )}
                            {matching.length ? matching.map(({ property, strength }) => (
                              <ListingOption
                                key={property.id}
                                property={property}
                                match={strength}
                                selected={form.propertyId === property.id}
                                onSelect={() => updateForm(item.id, "propertyId", property.id)}
                              />
                            )) : (
                              <p className="text-sm text-slate-400">No listings match the requested criteria.</p>
                            )}
                          </section>
                          <section className="space-y-2" aria-label="Other available listings">
                            <h3 className="font-semibold text-white">Other Available Listings</h3>
                            <p className="text-xs text-slate-400">These listings may not fully match the buyer’s requirements, but you can still offer any of them.</p>
                            {other.length ? other.map((property) => (
                              <ListingOption
                                key={property.id}
                                property={property}
                                selected={form.propertyId === property.id}
                                onSelect={() => updateForm(item.id, "propertyId", property.id)}
                              />
                            )) : (
                              <p className="text-sm text-slate-400">No other available listings.</p>
                            )}
                          </section>
                          <label className="block text-sm font-medium">Optional message
                            <textarea maxLength={1500} rows={3} className="mt-1.5 w-full rounded-xl border border-[#33455d] bg-[#0b1626] p-3 text-sm text-white" value={form.message} onChange={(event) => updateForm(item.id, "message", event.target.value)} />
                          </label>
                          <div className="flex gap-2"><Button size="sm" disabled={submitting === item.id || !form.propertyId} onClick={() => void submit(item)}><Send className="mr-1.5 h-4 w-4" />{submitting === item.id ? "Sending…" : "Submit offer"}</Button><Button size="sm" variant="outline" onClick={() => setOpenId("")}>Cancel</Button></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div> : <p className="rounded-2xl border border-[#1b2b42] bg-[#0b1626] p-12 text-center text-sm text-slate-400">No published requirements are currently available.</p>
      ) : offers.length ? (
        <div className="space-y-3">{offers.map((offer) => <article key={offer.id} className="rounded-2xl border border-[#1b2b42] bg-[#0b1626] p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-white">{offer.property?.title ?? "Property offer"}</h2><span className="rounded-full bg-slate-800 px-3 py-1 text-xs capitalize text-slate-300">{offer.status}</span></div><p className="mt-1 text-sm text-slate-400">For: {offer.requirement?.title ?? "Requirement"}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{offer.message || "No message included."}</p><p className="mt-2 text-xs text-slate-500">Submitted {new Date(offer.createdAt).toLocaleString()}</p>{offer.status === "accepted" && offer.conversationId && <Link href={`/agent/calls?conversation=${encodeURIComponent(offer.conversationId)}`} className="mt-3 inline-flex min-h-9 items-center rounded-md border border-[#49627f] px-3 text-sm font-medium text-white hover:bg-[#13243a]">Continue conversation</Link>}</article>)}</div>
      ) : <p className="rounded-2xl border border-[#1b2b42] bg-[#0b1626] p-12 text-center text-sm text-slate-400">You haven’t submitted any offers.</p>}
    </section>
  );
}
