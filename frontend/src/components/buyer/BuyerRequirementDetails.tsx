"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { type ClientRequirement, type RequirementOffer, formatPkr } from "@/lib/requirements";

type RequirementDetail = ClientRequirement & { offers: RequirementOffer[] };

export function BuyerRequirementDetails({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<RequirementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actingId, setActingId] = useState("");
  const mutationVersion = useRef(0);

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    const observedMutationVersion = mutationVersion.current;
    try {
      const response = await apiClient.get<ApiEnvelope<RequirementDetail>>(`/requirements/buyer/${encodeURIComponent(id)}`);
      if (observedMutationVersion !== mutationVersion.current) return;
      setItem(response.data.data);
      setError("");
    } catch (requestError) {
      if (observedMutationVersion !== mutationVersion.current) return;
      setError(getApiErrorMessage(requestError));
      if (!background) setItem(null);
    } finally {
      if (!background) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const respond = async (offer: RequirementOffer, action: "accept" | "reject") => {
    if (action === "accept" && !window.confirm("Accept this offer? Other offers will remain pending.")) return;
    setActingId(offer.id);
    setError("");
    setSuccess("");
    try {
      const response = await apiClient.post<ApiEnvelope<RequirementOffer & { conversationId?: string | null }>>(
        `/requirements/buyer/${encodeURIComponent(id)}/offers/${encodeURIComponent(offer.id)}/${action}`,
      );
      const updatedOffer = response.data.data;
      mutationVersion.current += 1;
      setItem((current) => current && ({
        ...current,
        offers: current.offers.map((currentOffer) =>
          currentOffer.id === updatedOffer.id
            ? { ...currentOffer, ...updatedOffer }
            : currentOffer,
        ),
      }));
      setSuccess(action === "accept" ? "Offer accepted. You can continue the conversation with the agent." : "Offer rejected.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const startConversation = async (offer: RequirementOffer) => {
    if (!offer.property) return;
    setActingId(offer.id);
    setError("");
    try {
      const response = await apiClient.post<ApiEnvelope<{ conversation: { id: string } }>>("/buyer/inquiries", {
        propertyId: offer.property.id,
        message: `I am contacting you about the property offered for my requirement "${item?.title}".`,
      });
      router.push(`/buyer/inquiries?conversation=${encodeURIComponent(response.data.data.conversation.id)}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  if (loading) return <p role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading requirement…</p>;
  if (!item) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error || "Requirement not found."}<p className="mt-3"><Link href="/buyer/requirements" className="font-semibold underline">Back to requirements</Link></p></div>;

  return (
    <section className="space-y-5">
      <Link href="/buyer/requirements" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><ArrowLeft className="h-4 w-4" />My requirements</Link>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{success}</p>}
      <header className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{item.status}</p><h1 className="text-2xl font-bold text-slate-900 dark:text-white">{item.title}</h1></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{item.offers.length} offers</span></div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{item.location.area}, {item.location.city} · {item.purpose} · {item.propertyType}</p>
        {(item.bedrooms != null || item.bathrooms != null) && <p className="mt-2 text-sm text-slate-500">{item.bedrooms != null ? `${item.bedrooms}+ bedrooms` : ""}{item.bedrooms != null && item.bathrooms != null ? " · " : ""}{item.bathrooms != null ? `${item.bathrooms}+ bathrooms` : ""}</p>}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{item.description}</p>
      </header>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Received Property Offers</h2>
        {item.offers.length ? item.offers.map((offer) => (
          <article key={offer.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold text-slate-900 dark:text-white">{offer.property?.title ?? "Property listing"}</h3><p className="mt-1 text-sm text-slate-500">{offer.property && `${formatPkr(offer.property.price)} · ${offer.property.areaSize} ${offer.property.areaUnit} · ${offer.property.location.area}, ${offer.property.location.city}`}</p></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">{offer.status}</span>
            </div>
            {offer.property && (
              <div className="mt-3 space-y-3">
                {offer.property.images?.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {offer.property.images.map((image, index) => (
                      <img
                        key={`${offer.property?.id}-image-${index}`}
                        src={image}
                        alt={`${offer.property?.title ?? "Offered property"} image ${index + 1}`}
                        className="h-32 w-full rounded-lg bg-slate-100 object-cover dark:bg-slate-800"
                      />
                    ))}
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {offer.property.purpose} · {offer.property.propertyType}
                    {offer.property.features?.bedrooms != null ? ` · ${offer.property.features.bedrooms} bedrooms` : ""}
                    {offer.property.features?.bathrooms != null ? ` · ${offer.property.features.bathrooms} bathrooms` : ""}
                  </p>
                  {offer.property.description && (
                    <p className="line-clamp-3 text-sm leading-5 text-slate-600 dark:text-slate-400">
                      {offer.property.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            {offer.message && <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{offer.message}</p>}
            <p className="mt-2 text-xs text-slate-500">Submitted {new Date(offer.createdAt).toLocaleString()}</p>
            <p className="mt-3 text-sm text-slate-500">Verified agent: <span className="font-medium text-slate-800 dark:text-slate-200">{offer.agent?.name ?? "Ghar Safar agent"}</span>{offer.agent?.agencyName ? ` · ${offer.agent.agencyName}` : ""}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {offer.property && <Link href={`/property/${encodeURIComponent(offer.property.id)}`} className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">View listing</Link>}
              {offer.status === "pending" && item.status === "published" && <><Button size="sm" disabled={actingId === offer.id} onClick={() => void respond(offer, "accept")}>Accept offer</Button><Button size="sm" variant="outline" disabled={actingId === offer.id} onClick={() => void respond(offer, "reject")}>Reject</Button></>}
              {offer.property && offer.status === "accepted" && (offer.conversationId ? (
                <Link href={`/buyer/inquiries?conversation=${encodeURIComponent(offer.conversationId)}`} className="inline-flex min-h-9 items-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700">Continue conversation</Link>
              ) : (
                <Button size="sm" variant="outline" disabled={actingId === offer.id} onClick={() => void startConversation(offer)}>Start conversation</Button>
              ))}
            </div>
          </article>
        )) : <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">No offers received yet. Offers from verified agents will appear here.</p>}
      </div>
    </section>
  );
}
