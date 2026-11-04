import { AgentApprovalTable } from "@/components/admin/AgentApprovalTable";

export const metadata = {
  title: "Agent Verification & Approvals | Super Admin",
  description: "Review registered agent accounts and verification status.",
};

export default function AdminAgentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs text-slate-400">
          Dashboard <span className="px-1.5 text-slate-600">/</span> Agent Approvals
        </p>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Agent Verification & Approvals
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Registered accounts and their persisted verification state.
          </p>
        </div>
      </header>
      <AgentApprovalTable />
    </div>
  );
}
