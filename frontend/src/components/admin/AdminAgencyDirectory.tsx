"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, RefreshCw, Search } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Agency {
  name: string;
  agentCount: number;
  verifiedAgentCount: number;
  suspendedAgentCount: number;
  agents: Array<{ id: string; name: string; email: string; city?: string; isVerified: boolean; accountStatus: string }>;
}

interface AgencyPage {
  items: Agency[];
  total: number;
  page: number;
  totalPages: number;
}

export function AdminAgencyDirectory() {
  const [data, setData] = useState<AgencyPage | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<AgencyPage>>("/admin/agencies", {
        params: { page, limit: 30, search: search.trim() || undefined },
      });
      setData(response.data.data);
    } catch (requestError) {
      setData(null);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search agency or affiliated agent"
            className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm text-white"
          />
        </label>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>{data ? `${data.total} agency affiliations found` : "Loading agency affiliations…"}</span>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </section>
      <p className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-200">
        Agencies are grouped from existing agent records because this database has no standalone agency collection. Verification and account controls remain attached to each registered agent; no duplicate agency entities or unpersisted agency status are created.
      </p>
      {error && <p role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</p>}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Loading registered agencies…</p>
      ) : !data?.items.length ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400"><Building2 className="mx-auto mb-2 h-6 w-6" />No agencies with a registered agency name were found.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((agency) => (
            <article key={agency.name} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-white">{agency.name}</h2>
                  <p className="mt-1 text-xs text-slate-400">{agency.agentCount} agents · {agency.verifiedAgentCount} verified · {agency.suspendedAgentCount} suspended</p>
                </div>
                <Building2 className="h-5 w-5 text-rose-300" />
              </header>
              <ul className="divide-y divide-slate-800">
                {agency.agents.map((agent) => (
                  <li key={agent.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-200">{agent.name}</p>
                      <p className="text-xs text-slate-400">{agent.email}{agent.city ? ` · ${agent.city}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">{agent.isVerified ? "Verified" : "Unverified"} · {agent.accountStatus}</span>
                      <Link href={`/admin/agents/${encodeURIComponent(agent.id)}`} className="text-xs font-semibold text-rose-300 hover:text-rose-200">Profile</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      {!loading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-300">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span>Page {page} of {data.totalPages}</span>
          <Button type="button" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
