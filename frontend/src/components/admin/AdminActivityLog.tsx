"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search, ScrollText } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  admin?: { name?: string; email?: string } | string;
  actionType: string;
  entityType: string;
  entityId: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  occurredAt: string;
}

interface ActivityPage {
  items: Activity[];
  total: number;
  page: number;
  totalPages: number;
}

export function AdminActivityLog() {
  const [data, setData] = useState<ActivityPage | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<ActivityPage>>("/admin/activity", {
        params: { page, limit: 50, search: search.trim() || undefined },
      });
      setData(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setData(null);
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
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search action, entity, ID, or reason"
            className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm text-white"
          />
        </label>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </section>
      {error && <p role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</p>}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Loading immutable admin activity records…</p>
      ) : !data?.items.length ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400"><ScrollText className="mx-auto mb-2 h-6 w-6" />No recorded admin activity found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr><th className="p-4">Time / Admin</th><th className="p-4">Action</th><th className="p-4">Entity</th><th className="p-4">Status</th><th className="p-4">Reason</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.items.map((item) => {
                const admin = typeof item.admin === "object" ? item.admin?.name ?? item.admin?.email : item.admin;
                return (
                  <tr key={item.id} className="align-top">
                    <td className="p-4 text-xs text-slate-300">{new Date(item.occurredAt).toLocaleString()}<p className="mt-1 text-slate-500">{admin || "Admin identity unavailable"}</p></td>
                    <td className="p-4 font-semibold text-slate-200">{item.actionType.replaceAll(".", " ")}</td>
                    <td className="p-4 text-xs text-slate-300">{item.entityType}<p className="mt-1 break-all text-slate-500">{item.entityId}</p></td>
                    <td className="p-4 text-xs text-slate-400">{item.previousStatus || "—"} → {item.newStatus || "—"}</td>
                    <td className="max-w-sm whitespace-pre-wrap p-4 text-xs text-slate-400">{item.reason || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
