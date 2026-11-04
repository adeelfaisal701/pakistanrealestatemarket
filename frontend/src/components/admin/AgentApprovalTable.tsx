"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface AdminAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  agencyName?: string;
  city?: string;
  isVerified: boolean;
  verificationStatus: "pending_verification" | "verified" | "unverified" | "rejected";
  accountStatus: "active" | "suspended" | "deactivated";
  accountStatusReason?: string;
}

type StatusFilter = "All" | "Pending Verification" | "Verified" | "Unverified" | "Rejected";
interface AgentsResponse {
  items: AdminAgent[];
  total: number;
  page: number;
  totalPages: number;
  verificationCounts: Record<string, number>;
}

function requestReason(action: string) {
  const reason = window.prompt(`Enter a reason to ${action}:`)?.trim();
  if (!reason) return null;
  return reason;
}

export function AgentApprovalTable() {
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [verificationCounts, setVerificationCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [accountFilter, setAccountFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actingId, setActingId] = useState("");

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<AgentsResponse>>("/admin/agents", {
        params: {
          page,
          limit: 30,
          search: searchQuery.trim() || undefined,
          verification:
          statusFilter === "All"
            ? "all"
            : statusFilter === "Pending Verification"
              ? "pending_verification"
              : statusFilter.toLowerCase(),
          accountStatus: accountFilter,
        },
      });
      setAgents(response.data.data.items);
      setVerificationCounts(response.data.data.verificationCounts);
      setTotal(response.data.data.total);
      setTotalPages(response.data.data.totalPages);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setAgents([]);
      setVerificationCounts({});
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [accountFilter, page, searchQuery, statusFilter]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const runAgentAction = async (
    agent: AdminAgent,
    action: "verify" | "unverify" | "reject-verification" | "suspend" | "reactivate" | "deactivate",
  ) => {
    const needsReason = action !== "verify";
    const reason = needsReason ? requestReason(action) : "";
    if (needsReason && !reason) return;
    const warning = action === "suspend"
      ? "Suspending this agent immediately blocks CRM access and pauses their published advertisements. Existing records remain intact."
      : action === "deactivate"
        ? "Deactivating this agent blocks CRM access and pauses published advertisements. Existing records remain intact."
        : action === "unverify"
          ? "This removes the verified badge from all public views."
          : `Confirm that you want to ${action} this agent?`;
    if (!window.confirm(`${warning}\n\n${agent.name}`)) return;
    setActingId(agent.id);
    setActionError("");
    try {
      if (action === "verify" || action === "unverify" || action === "reject-verification") {
        await apiClient.patch(
          `/admin/agents/${agent.id}/${action}`,
          reason ? { reason } : {},
        );
      } else {
        await apiClient.patch(`/admin/agents/${agent.id}/account-status`, {
          status: action === "reactivate" ? "active" : action,
          reason,
        });
      }
      await loadAgents();
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const deleteAgent = async (agent: AdminAgent) => {
    const reason = requestReason("permanently delete this agent");
    if (!reason) return;
    const confirmation = window.prompt('Type "DELETE AGENT" to confirm:')?.trim();
    if (confirmation !== "DELETE AGENT") return;
    if (!window.confirm(`Permanently delete ${agent.name}? Deletion is blocked while properties, ads, leads, or conversations remain linked.`)) return;
    setActingId(agent.id);
    setActionError("");
    try {
      await apiClient.delete(`/admin/agents/${agent.id}`, {
        data: { reason, confirmation },
      });
      await loadAgents();
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActingId("");
    }
  };

  const unverifiedCount = agents.filter((agent) => !agent.isVerified).length;
  const verifiedCount = agents.filter((agent) => agent.isVerified).length;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-6">
      {actionError && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          {actionError}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setPage(1);
              setSearchQuery(event.target.value);
            }}
            placeholder="Search registered agents..."
            className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 text-sm text-white"
          />
        </label>
        <Button type="button" variant="outline" onClick={() => void loadAgents()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {([
          ["All", verificationCounts.all ?? total],
          ["Pending Verification", verificationCounts.pending_verification ?? 0],
          ["Unverified", verificationCounts.unverified ?? unverifiedCount],
          ["Verified", verificationCounts.verified ?? verifiedCount],
          ["Rejected", verificationCounts.rejected ?? 0],
        ] as const).map(([label, count]) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatusFilter(label)}
            aria-pressed={statusFilter === label}
            className={`rounded-full border px-4 py-2 font-semibold ${
              statusFilter === label
                ? "border-rose-500 bg-rose-600 text-white"
                : "border-slate-700 bg-slate-800 text-slate-300"
            }`}
          >
            {label} ({count})
          </button>
        ))}
        <span className="self-center text-slate-400">
          Agent accounts: {total} · verified this page: {verifiedCount} · unverified this page: {unverifiedCount}
        </span>
        <label className="ml-auto flex items-center gap-2 text-slate-300">
          Account
          <select
            value={accountFilter}
            onChange={(event) => {
              setPage(1);
              setAccountFilter(event.target.value);
            }}
            className="min-h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs text-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-400">Loading agent records…</p>
      ) : error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-red-400" />
          <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>
          <Button type="button" onClick={() => void loadAgents()} className="mt-4 bg-rose-600 text-white">
            Retry
          </Button>
        </div>
      ) : agents.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          {total === 0 ? "No agent accounts match this filter." : "No agents on this page."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <th className="px-3 py-3">Agent</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Agency / City</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-white">{agent.name}</p>
                    <p className="text-xs text-slate-400">{agent.email}</p>
                  </td>
                  <td className="px-3 py-4 text-slate-300">{agent.phone || "Not provided"}</td>
                  <td className="px-3 py-4 text-slate-300">
                    <p>{agent.agencyName || "No agency listed"}</p>
                    <p className="text-xs text-slate-500">{agent.city || "City not provided"}</p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        agent.isVerified
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}>
                        {(agent.verificationStatus || (agent.isVerified ? "verified" : "unverified")).replaceAll("_", " ")}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        agent.accountStatus === "active"
                          ? "bg-slate-700 text-slate-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}>
                        {agent.accountStatus || "active"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actingId === agent.id || agent.isVerified}
                        onClick={() => void runAgentAction(agent, "verify")}
                      >
                        <UserCheck className="mr-1 h-4 w-4" /> Verify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actingId === agent.id || !agent.isVerified}
                        onClick={() => void runAgentAction(agent, "unverify")}
                      >
                        <ShieldCheck className="mr-1 h-4 w-4" /> Unverify
                      </Button>
                      {agent.verificationStatus === "pending_verification" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={actingId === agent.id}
                          onClick={() => void runAgentAction(agent, "reject-verification")}
                        >
                          Reject verification
                        </Button>
                      )}
                      {agent.accountStatus === "active" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={actingId === agent.id}
                            onClick={() => void runAgentAction(agent, "suspend")}
                          >
                            Suspend
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={actingId === agent.id}
                            onClick={() => void runAgentAction(agent, "deactivate")}
                          >
                            Deactivate
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={actingId === agent.id}
                            onClick={() => void runAgentAction(agent, "reactivate")}
                            className="bg-emerald-700 text-white hover:bg-emerald-600"
                          >
                            Reactivate
                          </Button>
                          {agent.accountStatus === "deactivated" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              disabled={actingId === agent.id}
                              onClick={() => void deleteAgent(agent)}
                            >
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                      <Link
                        href={`/admin/agents/${encodeURIComponent(agent.id)}`}
                        className="inline-flex min-h-9 items-center rounded-md border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-300">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
