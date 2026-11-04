"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, MessageSquareWarning, RefreshCw, Search } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Report {
  id: string;
  targetType: "property" | "advertisement" | "agent";
  targetId: string;
  category: string;
  details: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  status: string;
  internalNotes?: string;
  resolutionDetails?: string;
  createdAt?: string;
}

interface ReportPage {
  items: Report[];
  total: number;
  page: number;
  totalPages: number;
}

function targetHref(report: Report) {
  if (report.targetType === "property") return `/property/${encodeURIComponent(report.targetId)}`;
  if (report.targetType === "agent") return `/admin/agents/${encodeURIComponent(report.targetId)}`;
  return `/admin/advertisements`;
}

export function AdminReportsManager() {
  const [data, setData] = useState<ReportPage | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<ReportPage>>("/admin/reports", {
        params: { page, limit: 30, search: search.trim() || undefined },
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

  const update = async (report: Report, status: string) => {
    let resolutionDetails = "";
    if (status === "resolved" || status === "rejected") {
      resolutionDetails = window.prompt(`Enter resolution details to mark this report ${status}:`)?.trim() ?? "";
      if (!resolutionDetails) return;
    }
    const internalNotes = window.prompt("Add internal moderator notes (optional):")?.trim() ?? "";
    if (!window.confirm(`Change report status to ${status.replaceAll("_", " ")}?`)) return;
    setActingId(report.id);
    try {
      await apiClient.patch(`/admin/reports/${report.id}`, {
        status,
        ...(internalNotes ? { internalNotes } : {}),
        ...(resolutionDetails ? { resolutionDetails } : {}),
      });
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

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
            placeholder="Search report category, status, target ID, or details"
            className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm text-white"
          />
        </label>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </section>
      {error && <p role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</p>}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Loading reports…</p>
      ) : !data?.items.length ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400"><MessageSquareWarning className="mx-auto mb-2 h-6 w-6" />No reports have been submitted.</p>
      ) : (
        <div className="space-y-4">
          {data.items.map((report) => (
            <article key={report.id} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-white">{report.category.replaceAll("_", " ")}</h2>
                  <p className="mt-1 text-xs text-slate-400">Reported {report.targetType} · {report.createdAt ? new Date(report.createdAt).toLocaleString() : "date unavailable"}</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase text-slate-300">{report.status.replaceAll("_", " ")}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{report.details}</p>
              <p className="text-xs text-slate-400">
                From: {report.reporterName || "Anonymous"}
                {report.reporterEmail ? ` · ${report.reporterEmail}` : ""}
                {report.reporterPhone ? ` · ${report.reporterPhone}` : ""}
              </p>
              <p className="break-all text-[11px] text-slate-500">Target ID: {report.targetId}</p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                <Link href={targetHref(report)} className="text-sm font-semibold text-rose-300 hover:text-rose-200">Open associated record</Link>
                <div className="flex flex-wrap gap-2">
                  {report.status !== "under_review" && report.status !== "resolved" && report.status !== "rejected" && (
                    <Button type="button" size="sm" variant="outline" disabled={actingId === report.id} onClick={() => void update(report, "under_review")}>Under review</Button>
                  )}
                  {report.status !== "resolved" && (
                    <Button type="button" size="sm" disabled={actingId === report.id} onClick={() => void update(report, "resolved")} className="bg-emerald-700 text-white hover:bg-emerald-600">Resolve</Button>
                  )}
                  {report.status !== "rejected" && (
                    <Button type="button" size="sm" variant="danger" disabled={actingId === report.id} onClick={() => void update(report, "rejected")}>Reject</Button>
                  )}
                </div>
              </div>
              {report.resolutionDetails && <p className="text-xs text-emerald-300">Resolution: {report.resolutionDetails}</p>}
              {report.internalNotes && <p className="text-xs text-amber-300">Internal notes: {report.internalNotes}</p>}
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
