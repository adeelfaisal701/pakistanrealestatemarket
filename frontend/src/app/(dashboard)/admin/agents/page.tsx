"use client";

import { useState } from "react";
import { AgentApprovalTable } from "@/components/admin/AgentApprovalTable";
import { AdminCreateAccount } from "@/components/admin/AdminCreateAccount";
import { UserPlus, ChevronDown, ChevronUp } from "lucide-react";

export default function AdminAgentsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs text-slate-400">
            Dashboard <span className="px-1.5 text-slate-600">/</span> Agent Approvals
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Agent Verification &amp; Approvals
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Registered accounts and their persisted verification state.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Create Account
          {showCreateForm ? (
            <ChevronUp className="h-4 w-4 opacity-70" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-70" />
          )}
        </button>
      </header>

      {showCreateForm && (
        <AdminCreateAccount
          onClose={() => setShowCreateForm(false)}
          onAccountCreated={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      <AgentApprovalTable key={refreshKey} />
    </div>
  );
}
