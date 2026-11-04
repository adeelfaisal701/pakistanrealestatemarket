"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  MessageSquareWarning,
  Megaphone,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Button } from "@/components/ui/button";

interface AdminStats {
  totalProperties: number;
  pendingProperties: number;
  publishedProperties: number;
  rejectedProperties: number;
  draftProperties: number;
  soldProperties: number;
  otherProperties: number;
  totalAgents: number;
  verifiedAgents: number;
  pendingAgents: number;
  totalUsers: number;
  suspendedAgents: number;
  pendingAdvertisements: number;
  publishedAdvertisements: number;
  openReports: number;
  totalReports: number;
}

export function AdminOverviewDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<AdminStats>>("/admin/stats");
      setStats(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs text-slate-400">Dashboard <span className="px-1.5 text-slate-600">/</span> Overview &amp; Analytics</p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Overview &amp; Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Live platform statistics from current users, properties, advertisements and reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/agents" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
            <UserCheck className="h-4 w-4" />
            Agent accounts
          </Link>
          <Link href="/admin/properties" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:bg-slate-800">
            <Building2 className="h-4 w-4" />
            Property moderation
          </Link>
          <Link href="/admin/advertisements" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:bg-slate-800">
            <Megaphone className="h-4 w-4" />
            Advertisements
          </Link>
        </div>
      </header>

      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 py-12 text-center text-sm text-slate-400">
          Loading database statistics…
        </p>
      ) : error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>
          <Button type="button" onClick={() => void loadStats()} className="mt-4 bg-rose-600 text-white">
            Retry
          </Button>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminStatsCard title="Total Agents" value={stats.totalAgents} icon={UserCheck} subtitle={`${stats.verifiedAgents} verified agents`} accentColor="blue" />
            <AdminStatsCard title="Verified Agents" value={stats.verifiedAgents} icon={ShieldCheck} subtitle={`${stats.pendingAgents} not verified`} accentColor="emerald" />
            <AdminStatsCard title="Total Properties" value={stats.totalProperties} icon={Building2} subtitle="All inventory statuses" accentColor="blue" />
            <AdminStatsCard title="Published Ads" value={stats.publishedAdvertisements} icon={Megaphone} subtitle="Active on the marketplace" accentColor="emerald" />
            <AdminStatsCard title="Pending Reviews" value={stats.pendingProperties + stats.pendingAdvertisements} icon={Clock} subtitle={`${stats.pendingProperties} properties · ${stats.pendingAdvertisements} ads`} accentColor="amber" />
            <AdminStatsCard title="Total Reports" value={stats.totalReports} icon={MessageSquareWarning} subtitle={`${stats.openReports} open or under review`} accentColor="rose" />
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[#101b30] p-5 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Review queues</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Pending property records and unverified agent accounts are counted from current database queries.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-300">{stats.pendingProperties} properties pending</span>
                <span className="rounded-lg bg-rose-500/10 px-3 py-2 text-rose-300">{stats.pendingAgents} agents unverified</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/admin/properties" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">
                Review pending listings <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">
                Review registered agents <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["/admin/agencies", "Agency Directory"],
              ["/admin/advertisements", "Advertisement Management"],
              ["/admin/reports", "Reports & Complaints"],
              ["/admin/activity", "Admin Activity Log"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-2xl border border-slate-800 bg-[#101b30] p-4 text-sm font-semibold text-slate-200 transition-colors hover:border-blue-700 hover:bg-slate-800">
                {label}
              </Link>
            ))}
          </section>
          <p className="text-xs text-slate-500">Total platform accounts: {stats.totalUsers}. Lead/revenue analytics are not shown because no admin-wide reporting source is configured.</p>
        </>
      ) : null}
    </div>
  );
}
