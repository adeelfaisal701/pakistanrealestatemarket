"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, FilePlus2, MapPin, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  type ClientRequirement,
  formatPkr,
} from "@/lib/requirements";

type RequirementForm = {
  title: string;
  description: string;
  purpose: "buy" | "rent";
  propertyType: string;
  city: string;
  area: string;
  minBudget: string;
  maxBudget: string;
  minArea: string;
  maxArea: string;
  bedrooms: string;
  bathrooms: string;
  areaUnit: string;
};

const emptyForm: RequirementForm = {
  title: "",
  description: "",
  purpose: "buy",
  propertyType: "House",
  city: "Lahore",
  area: "",
  minBudget: "",
  maxBudget: "",
  minArea: "",
  maxArea: "",
  bedrooms: "",
  bathrooms: "",
  areaUnit: "Marla",
};

function toPayload(form: RequirementForm, includeEmpty = false) {
  return {
    title: form.title,
    description: form.description,
    purpose: form.purpose,
    propertyType: form.propertyType,
    location: { city: form.city, area: form.area },
    minBudget: form.minBudget ? Number(form.minBudget) : includeEmpty ? null : undefined,
    maxBudget: form.maxBudget ? Number(form.maxBudget) : includeEmpty ? null : undefined,
    minArea: form.minArea ? Number(form.minArea) : includeEmpty ? null : undefined,
    maxArea: form.maxArea ? Number(form.maxArea) : includeEmpty ? null : undefined,
    bedrooms: form.bedrooms ? Number(form.bedrooms) : includeEmpty ? null : undefined,
    bathrooms: form.bathrooms ? Number(form.bathrooms) : includeEmpty ? null : undefined,
    areaUnit: form.minArea || form.maxArea ? form.areaUnit : includeEmpty ? null : undefined,
  };
}

function RequirementFields({
  form,
  onChange,
}: {
  form: RequirementForm;
  onChange: (field: keyof RequirementForm, value: string) => void;
}) {
  const fieldClass =
    "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  const residentialTypes = ["House", "Flat", "Upper Portion", "Lower Portion"];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Requirement title
        <input required maxLength={120} className={`${fieldClass} mt-1.5`} value={form.title} onChange={(e) => onChange("title", e.target.value)} />
      </label>
      <label className="text-sm font-medium">Purpose
        <select className={`${fieldClass} mt-1.5`} value={form.purpose} onChange={(e) => onChange("purpose", e.target.value)}>
          <option value="buy">Buy</option><option value="rent">Rent</option>
        </select>
      </label>
      <label className="text-sm font-medium">Property type
        <select className={`${fieldClass} mt-1.5`} value={form.propertyType} onChange={(e) => onChange("propertyType", e.target.value)}>
          {["House", "Flat", "Upper Portion", "Lower Portion", "Plot", "Commercial"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">City
        <input readOnly maxLength={100} className={`${fieldClass} mt-1.5`} value={form.city} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">Area / locality
        <input required maxLength={100} placeholder="Bahria Town, Sector..." className={`${fieldClass} mt-1.5`} value={form.area} onChange={(e) => onChange("area", e.target.value)} />
        <span className="mt-1 block text-xs font-normal text-slate-500">The initial launch supports Bahria Town, Lahore only.</span>
      </label>
      <label className="text-sm font-medium">Minimum budget (PKR)
        <input type="number" min="0" className={`${fieldClass} mt-1.5`} value={form.minBudget} onChange={(e) => onChange("minBudget", e.target.value)} />
      </label>
      <label className="text-sm font-medium">Maximum budget (PKR)
        <input type="number" min="0" className={`${fieldClass} mt-1.5`} value={form.maxBudget} onChange={(e) => onChange("maxBudget", e.target.value)} />
      </label>
      <label className="text-sm font-medium">Minimum area
        <input type="number" min="0" className={`${fieldClass} mt-1.5`} value={form.minArea} onChange={(e) => onChange("minArea", e.target.value)} />
      </label>
      <label className="text-sm font-medium">Maximum area
        <input type="number" min="0" className={`${fieldClass} mt-1.5`} value={form.maxArea} onChange={(e) => onChange("maxArea", e.target.value)} />
      </label>
      <label className="text-sm font-medium">Area unit
        <select className={`${fieldClass} mt-1.5`} value={form.areaUnit} onChange={(e) => onChange("areaUnit", e.target.value)}>
          {["Marla", "Kanal", "SqFt", "SqYd"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      {residentialTypes.includes(form.propertyType) && (
        <>
          <label className="text-sm font-medium">Minimum bedrooms
            <input type="number" min="0" max="50" className={`${fieldClass} mt-1.5`} value={form.bedrooms} onChange={(e) => onChange("bedrooms", e.target.value)} />
          </label>
          <label className="text-sm font-medium">Minimum bathrooms
            <input type="number" min="0" max="50" className={`${fieldClass} mt-1.5`} value={form.bathrooms} onChange={(e) => onChange("bathrooms", e.target.value)} />
          </label>
        </>
      )}
      <label className="text-sm font-medium sm:col-span-2">Additional details
        <textarea required maxLength={2000} rows={4} className={`${fieldClass} mt-1.5 py-3`} value={form.description} onChange={(e) => onChange("description", e.target.value)} />
      </label>
    </div>
  );
}

export function BuyerRequirementsManager() {
  const [items, setItems] = useState<ClientRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [actingId, setActingId] = useState("");

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<ClientRequirement[]>>("/requirements/buyer");
      if (!Array.isArray(response.data.data)) throw new Error("Requirements response was invalid.");
      setItems(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      if (!background) setItems([]);
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const setField = (field: keyof RequirementForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await apiClient.patch(`/requirements/buyer/${encodeURIComponent(editingId)}`, toPayload(form, true));
      } else {
        await apiClient.post("/requirements/buyer", toPayload(form));
      }
      setForm(emptyForm);
      setEditingId("");
      setShowForm(false);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: ClientRequirement) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      purpose: item.purpose,
      propertyType: item.propertyType,
      city: item.location.city,
      area: item.location.area,
      minBudget: item.minBudget?.toString() ?? "",
      maxBudget: item.maxBudget?.toString() ?? "",
      minArea: item.minArea?.toString() ?? "",
      maxArea: item.maxArea?.toString() ?? "",
      bedrooms: item.bedrooms?.toString() ?? "",
      bathrooms: item.bathrooms?.toString() ?? "",
      areaUnit: item.areaUnit ?? "Marla",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId("");
    setForm(emptyForm);
  };

  const act = async (item: ClientRequirement, action: "publish" | "pause" | "close" | "delete") => {
    if (action === "close" && !window.confirm("Close this requirement? Agents will no longer be able to submit offers.")) return;
    setActingId(item.id);
    setError("");
    try {
      if (action === "delete") await apiClient.delete(`/requirements/buyer/${encodeURIComponent(item.id)}`);
      else await apiClient.post(`/requirements/buyer/${encodeURIComponent(item.id)}/${action}`);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const respondToOffer = async (
    requirement: ClientRequirement,
    offer: NonNullable<ClientRequirement["offers"]>[number],
    action: "accept" | "reject",
  ) => {
    if (
      action === "accept" &&
      !window.confirm("Accept this offer? This will close the requirement and reject other pending offers.")
    ) {
      return;
    }
    setActingId(offer.id);
    setError("");
    try {
      await apiClient.post(
        `/requirements/buyer/${encodeURIComponent(requirement.id)}/offers/${encodeURIComponent(offer.id)}/${action}`,
      );
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const inputError = error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs text-slate-500">Buyer Account / Client Requirements</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">My Requirements</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Publish what you are looking for and review matching property offers from verified agents.</p>
        </div>
        <Button type="button" onClick={() => showForm ? cancelForm() : setShowForm(true)}><FilePlus2 className="mr-2 h-4 w-4" />{showForm ? "Cancel" : "Create requirement"}</Button>
      </header>
      {inputError}
      {showForm && (
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">{editingId ? "Edit draft requirement" : "New client requirement"}</h2>
          <RequirementFields form={form} onChange={setField} />
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Save as draft"}</Button>
        </form>
      )}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading requirements…</p>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/buyer/requirements/${encodeURIComponent(item.id)}`} className="text-lg font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{item.title}</Link>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{item.location.area}, {item.location.city} · {item.purpose} · {item.propertyType}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{[item.minBudget != null && `From ${formatPkr(item.minBudget)}`, item.maxBudget != null && `Up to ${formatPkr(item.maxBudget)}`, item.minArea != null && `${item.minArea}+ ${item.areaUnit ?? ""}`, item.maxArea != null && `max ${item.maxArea} ${item.areaUnit ?? ""}`].filter(Boolean).join(" · ") || "No budget or area range specified"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.status}</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{item.offers?.length ?? 0} offers</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["draft", "paused"].includes(item.status) && <Button size="sm" disabled={actingId === item.id} onClick={() => void act(item, "publish")}>Publish</Button>}
                {item.status === "published" && <Button size="sm" variant="outline" disabled={actingId === item.id} onClick={() => void act(item, "pause")}>Pause</Button>}
                {item.status === "draft" && <Button size="sm" variant="outline" disabled={saving} onClick={() => edit(item)}>Edit</Button>}
                {["draft", "published", "paused"].includes(item.status) && <Button size="sm" variant="outline" disabled={actingId === item.id} onClick={() => void act(item, "close")}>Close</Button>}
                {item.status === "draft" && <Button size="sm" variant="outline" disabled={actingId === item.id} onClick={() => void act(item, "delete")}><Trash2 className="mr-1.5 h-4 w-4" />Delete draft</Button>}
                <button type="button" onClick={() => void load()} className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh</button>
              </div>
              <section aria-label={`Received property offers for ${item.title}`} className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Received Property Offers</h2>
                {item.offers?.length ? (
                  <div className="mt-3 space-y-3">
                    {item.offers.map((offer) => (
                      <article key={offer.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            {offer.property?.images?.[0] ? (
                              <img
                                src={offer.property.images[0]}
                                alt={offer.property.title}
                                className="h-20 w-24 shrink-0 rounded-lg bg-slate-100 object-cover dark:bg-slate-800"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {offer.property?.title ?? "Property listing unavailable"}
                              </h3>
                              {offer.property && (
                                <>
                                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                    {formatPkr(offer.property.price)} · {offer.property.purpose} · {offer.property.propertyType}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    {offer.property.location.area}, {offer.property.location.city} · {offer.property.areaSize} {offer.property.areaUnit}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {offer.status}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                          {offer.message || "No message included."}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Submitted {new Date(offer.createdAt).toLocaleString()}
                          {offer.agent?.name ? ` · ${offer.agent.name}` : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {offer.property && (
                            <Link
                              href={`/property/${encodeURIComponent(offer.property.id)}`}
                              className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              View property
                            </Link>
                          )}
                          {offer.status === "accepted" && offer.conversationId && (
                            <Link
                              href={`/buyer/inquiries?conversation=${encodeURIComponent(offer.conversationId)}`}
                              className="inline-flex min-h-9 items-center rounded-md border border-emerald-600 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
                            >
                              Continue conversation
                            </Link>
                          )}
                          {offer.status === "pending" && item.status === "published" && (
                            <>
                              <Button
                                size="sm"
                                disabled={actingId === offer.id}
                                onClick={() => void respondToOffer(item, offer, "accept")}
                              >
                                Accept offer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actingId === offer.id}
                                onClick={() => void respondToOffer(item, offer, "reject")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">
                    No property offers received for this requirement yet.
                  </p>
                )}
              </section>
            </article>
          ))}
        </div>
      ) : (
        !error && <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700"><FilePlus2 className="mx-auto h-9 w-9 text-slate-400" /><h2 className="mt-3 font-semibold">No requirements yet</h2><p className="mt-1 text-sm text-slate-500">Create a requirement to start receiving suitable property offers.</p></div>
      )}
    </section>
  );
}
