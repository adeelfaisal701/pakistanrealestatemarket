"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface AgentProfileData {
  agent: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    agencyName?: string;
    city?: string;
    isVerified: boolean;
    accountStatus: string;
    accountStatusReason?: string;
    createdAt?: string;
  };
  properties: Array<{
    id: string;
    title: string;
    status: string;
    price: number;
    location: { city: string; area: string };
    images: string[];
  }>;
  advertisements: Array<{
    id: string;
    status: string;
    property?: { title?: string } | string;
    submittedAt?: string;
  }>;
}

export function AdminAgentProfile() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;
  const [data, setData] = useState<AgentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient.get<ApiEnvelope<AgentProfileData>>(`/admin/agents/${encodeURIComponent(agentId)}`)
      .then((response) => {
        if (active) setData(response.data.data);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agentId]);

  if (loading) return <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">Loading agent profile…</p>;
  if (error || !data) return <p role="alert" className="rounded-2xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error || "Agent profile unavailable."}</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm font-semibold text-rose-300 hover:text-rose-200"><ArrowLeft className="h-4 w-4" />Back to agent management</Link>
      <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{data.agent.name}</h1>
            <p className="mt-1 text-sm text-slate-300">{data.agent.email} · {data.agent.phone || "No phone"}</p>
            <p className="mt-1 text-sm text-slate-400">{data.agent.agencyName || "No agency affiliation"}{data.agent.city ? ` · ${data.agent.city}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">{data.agent.isVerified ? "Verified" : "Unverified"}</span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">{data.agent.accountStatus}</span>
          </div>
        </div>
        {data.agent.accountStatusReason && <p className="mt-4 text-sm text-amber-300">Account action reason: {data.agent.accountStatusReason}</p>}
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">Property records ({data.properties.length})</h2>
        {data.properties.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.properties.map((property) => (
              <article key={property.id} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                {property.images[0] && <img src={property.images[0]} alt="" className="h-20 w-28 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="font-semibold text-white">{property.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{property.location.area}, {property.location.city} · {property.status}</p>
                  <Link href={`/admin/properties?search=${encodeURIComponent(property.id)}`} className="mt-2 inline-block text-xs font-semibold text-rose-300">Open in property management</Link>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">No property records are linked to this agent.</p>}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">Advertisements ({data.advertisements.length})</h2>
        {data.advertisements.length ? (
          <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900 px-4">
            {data.advertisements.map((ad) => (
              <li key={ad.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span className="text-slate-200">{typeof ad.property === "object" ? ad.property.title : "Property listing"}</span>
                <span className="text-slate-400">{ad.status}</span>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">No advertisement records are linked to this agent.</p>}
      </section>
    </div>
  );
}
