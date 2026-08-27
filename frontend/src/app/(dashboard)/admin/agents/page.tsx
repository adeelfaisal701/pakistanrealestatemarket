import React from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, ShieldCheck, Clock, Users } from "lucide-react";
import { AgentApprovalTable } from "@/components/admin/AgentApprovalTable";
import { INITIAL_PENDING_AGENTS } from "@/lib/admin-mock-data";

export const metadata = {
  title: "Agent Verification & Approvals | Super Admin",
  description: "Verify CNIC credentials and grant Level 2 trust badges to real estate consultants.",
};

export default function AdminAgentsPage() {
  const pendingCount = INITIAL_PENDING_AGENTS.filter((a) => a.status === "Pending").length;
  const approvedCount = INITIAL_PENDING_AGENTS.filter((a) => a.status === "Approved").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 mb-2 transition-colors min-h-[30px]"
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Back to Admin Overview</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Agent Verification & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review CNIC credentials, contact numbers, and agency licenses to approve Level 2 verified agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{pendingCount} Awaiting Verification</span>
          </div>
        </div>
      </div>

      {/* Main Agent Approval Interactive Table */}
      <AgentApprovalTable initialAgents={INITIAL_PENDING_AGENTS} />
    </div>
  );
}
