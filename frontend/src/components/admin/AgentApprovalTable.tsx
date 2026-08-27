"use client";

import React, { useState, useMemo } from "react";
import {
  Check,
  X,
  Search,
  Phone,
  ShieldCheck,
  UserCheck,
  Building,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PendingAgent } from "@/types/admin";

interface AgentApprovalTableProps {
  initialAgents: PendingAgent[];
}

export function AgentApprovalTable({ initialAgents }: AgentApprovalTableProps) {
  const [agents, setAgents] = useState<PendingAgent[]>(initialAgents);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleApprove = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: "Approved" } : a))
    );
  };

  const handleReject = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: "Rejected" } : a))
    );
  };

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesStatus =
        statusFilter === "All" || agent.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.phone.includes(searchQuery) ||
        agent.city.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [agents, statusFilter, searchQuery]);

  const pendingCount = agents.filter((a) => a.status === "Pending").length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
      {/* Table Header & Search/Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search agents by name, agency, phone, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
          {["All", "Pending", "Approved", "Rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[38px] flex items-center gap-1.5 ${
                statusFilter === status
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{status}</span>
              {status === "Pending" && pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Table with Horizontal Scroll */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-850/50">
              <th className="py-3.5 px-4">Agent & Agency</th>
              <th className="py-3.5 px-4">Phone / WhatsApp</th>
              <th className="py-3.5 px-4">CNIC & City</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Submitted</th>
              <th className="py-3.5 px-4 text-right">Moderation Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAgents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                  No agent records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredAgents.map((agent) => {
                const isPending = agent.status === "Pending";
                const isApproved = agent.status === "Approved";
                const isRejected = agent.status === "Rejected";

                return (
                  <tr
                    key={agent.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Agent & Agency */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{agent.name}</span>
                            {isApproved && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {agent.agencyName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                      <a
                        href={`https://wa.me/${agent.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline min-h-[28px]"
                      >
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>+{agent.phone}</span>
                      </a>
                    </td>

                    {/* CNIC & City */}
                    <td className="py-4 px-4 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {agent.city}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {agent.cnic || "35202-*******-*"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                          <span>Level 2 Verified</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <XCircle className="h-3 w-3 flex-shrink-0" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {agent.submittedAt}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(agent.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold min-h-[36px] gap-1 px-3 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(agent.id)}
                            className="text-xs font-bold min-h-[36px] gap-1 px-3"
                          >
                            <X className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {isRejected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(agent.id)}
                              className="text-xs min-h-[36px] border-slate-300 dark:border-slate-700"
                            >
                              Re-Approve
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(agent.id)}
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-h-[36px]"
                            >
                              Revoke Badge
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
