import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Building2,
  UserCheck,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AgentApprovalTable } from "@/components/admin/AgentApprovalTable";
import { PropertyModerationGrid } from "@/components/admin/PropertyModerationGrid";
import {
  INITIAL_PENDING_AGENTS,
  INITIAL_MODERATION_PROPERTIES,
  ADMIN_KPI_METRICS,
} from "@/lib/admin-mock-data";

export default function AdminOverviewPage() {
  const pendingAgents = INITIAL_PENDING_AGENTS.filter((a) => a.status === "Pending");
  const pendingProperties = INITIAL_MODERATION_PROPERTIES.filter((p) => p.status === "Pending Review");

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Admin Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Super Admin Portal</span>
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Live Master Central</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
            Platform Analytics & Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time control over Lahore agent verification, property moderation, and platform metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/admin/agents" className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 shadow-lg shadow-rose-600/30">
              <UserCheck className="h-4 w-4 flex-shrink-0" />
              <span>Agent Approvals ({pendingAgents.length})</span>
            </Button>
          </Link>
          <Link href="/admin/properties" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto min-h-[44px] border-slate-700 text-slate-200 hover:bg-slate-800 font-bold gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span>Moderate Listings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <AdminStatsCard
          title="Total Platform Listings"
          value={ADMIN_KPI_METRICS.totalListings.toLocaleString()}
          icon={Building2}
          change="+18% this month"
          isPositive={true}
          subtitle="Lahore active inventory"
          accentColor="emerald"
        />

        <AdminStatsCard
          title="Pending Agent Requests"
          value={pendingAgents.length}
          icon={UserCheck}
          change="Urgent Action"
          isPositive={false}
          subtitle="Awaiting CNIC review"
          accentColor="rose"
        />

        <AdminStatsCard
          title="Verified Agents (L2/L3)"
          value={ADMIN_KPI_METRICS.totalVerifiedAgents}
          icon={ShieldCheck}
          change="+6 new this week"
          isPositive={true}
          subtitle="Active local brokers"
          accentColor="blue"
        />

        <AdminStatsCard
          title="Active Buyer Leads"
          value={ADMIN_KPI_METRICS.activeLeadsCount}
          icon={Users}
          change="+42 today"
          isPositive={true}
          subtitle="1-Tap WhatsApp inquiries"
          accentColor="purple"
        />
      </div>

      {/* Urgent Action Queue: Pending Agent Verifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Agent Verification Approvals</span>
              {pendingAgents.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingAgents.length} Action Needed
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and grant Level 2 Verified badges to Lahore real estate consultants
            </p>
          </div>
          <Link
            href="/admin/agents"
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 min-h-[30px]"
          >
            <span>View All Agents</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <AgentApprovalTable initialAgents={INITIAL_PENDING_AGENTS} />
      </div>

      {/* Urgent Action Queue: Property Moderation Review */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Property Moderation & Spam Filter</span>
              {pendingProperties.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {pendingProperties.length} Under Review
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect newly submitted property listings before making them public
            </p>
          </div>
          <Link
            href="/admin/properties"
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 min-h-[30px]"
          >
            <span>Manage All Listings</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <PropertyModerationGrid initialProperties={INITIAL_MODERATION_PROPERTIES} />
      </div>
    </div>
  );
}
