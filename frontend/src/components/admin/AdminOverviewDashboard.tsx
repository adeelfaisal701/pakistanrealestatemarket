"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Clock,
  MessageSquareWarning,
  Megaphone,
  Plus,
  Search,
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
  const quickActions = [
    { href: "/admin/agencies", label: "Agency Directory", Icon: Building2 },
    { href: "/admin/advertisements", label: "Manage Ads", Icon: Megaphone },
    { href: "/admin/reports", label: "Reports", Icon: MessageSquareWarning },
    { href: "/admin/activity", label: "Activity Log", Icon: Clock },
  ];

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
    <div className="space-y-6 sm:space-y-8 max-md:-mx-3 max-md:-mt-4 max-md:min-h-[calc(100dvh-60px)] max-md:space-y-4 max-md:bg-[#F7F9FC] max-md:px-3 max-md:pb-6 max-md:pt-4 max-md:text-[#101D32]">
      <section className="relative isolate hidden h-[156px] overflow-hidden rounded-2xl bg-[#005338] shadow-sm max-md:block">
        <img
          src="/images/agent%20crm.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#00472F]/95 via-[#00472F]/80 to-[#00472F]/15" />
        <div className="relative z-10 flex h-full items-center gap-4 px-4">
          <BarChart3 className="h-10 w-10 shrink-0 text-emerald-300" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-50/90">Welcome Back,</p>
            <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-white">
              Admin
            </h1>
            <p className="mt-1 text-xs text-emerald-50/90">Platform overview</p>
          </div>
        </div>
      </section>

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end max-md:hidden">
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
          <Link href="/admin/agents" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
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
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 py-12 text-center text-sm text-slate-400 max-md:border-slate-200 max-md:bg-white max-md:text-slate-500">
          Loading database statistics…
        </p>
      ) : error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-8 text-center max-md:border-red-200 max-md:bg-white max-md:p-5">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p role="alert" className="mt-3 text-sm text-red-300 max-md:text-red-700">{error}</p>
          <Button type="button" onClick={() => void loadStats()} className="mt-4 bg-rose-600 text-white">
            Retry
          </Button>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 max-md:grid-cols-2 max-md:gap-2.5">
            <AdminStatsCard title="Total Agents" value={stats.totalAgents} icon={UserCheck} subtitle={`${stats.verifiedAgents} verified agents`} accentColor="blue" />
            <AdminStatsCard title="Verified Agents" value={stats.verifiedAgents} icon={ShieldCheck} subtitle={`${stats.pendingAgents} not verified`} accentColor="emerald" />
            <AdminStatsCard title="Total Properties" value={stats.totalProperties} icon={Building2} subtitle="All inventory statuses" accentColor="blue" />
            <AdminStatsCard title="Published Ads" value={stats.publishedAdvertisements} icon={Megaphone} subtitle="Active on the marketplace" accentColor="emerald" />
            <AdminStatsCard title="Pending Reviews" value={stats.pendingProperties + stats.pendingAdvertisements} icon={Clock} subtitle={`${stats.pendingProperties} properties · ${stats.pendingAdvertisements} ads`} accentColor="amber" />
            <AdminStatsCard title="Total Reports" value={stats.totalReports} icon={MessageSquareWarning} subtitle={`${stats.openReports} open or under review`} accentColor="rose" />
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[#101b30] p-5 sm:p-7 max-md:rounded-2xl max-md:border-slate-200 max-md:bg-white max-md:p-4 max-md:shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white max-md:text-base max-md:text-[#101D32]">Review queues</h2>
                <p className="mt-1 text-sm text-slate-400 max-md:text-xs max-md:text-slate-500">
                  Pending property records and unverified agent accounts are counted from current database queries.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <span className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-amber-300 max-md:text-amber-800">{stats.pendingProperties} properties pending</span>
                <span className="rounded-lg bg-rose-500/10 px-2.5 py-2 text-rose-300 max-md:text-rose-800">{stats.pendingAgents} agents unverified</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 max-md:mt-3 max-md:flex-col max-md:gap-1">
              <Link href="/admin/properties" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 max-md:text-sm max-md:text-emerald-800">
                Review pending listings <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/agents" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 max-md:text-sm max-md:text-emerald-800">
                Review registered agents <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 max-md:grid-cols-2 max-md:gap-2" aria-label="Quick actions">
            <h2 className="col-span-full hidden text-base font-bold text-[#101D32] max-md:block">Quick Actions</h2>
            {quickActions.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-[#101b30] p-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-emerald-700 hover:bg-slate-800 max-md:min-h-[82px] max-md:rounded-xl max-md:border-slate-200 max-md:bg-white max-md:text-xs max-md:text-emerald-900 max-md:shadow-sm">
                <Icon className="h-5 w-5 text-emerald-600" />
                <span>{label}</span>
              </Link>
            ))}
          </section>
          <p className="text-xs text-slate-500 max-md:rounded-xl max-md:bg-white max-md:p-3">Total platform accounts: {stats.totalUsers}. Lead/revenue analytics are not shown because no admin-wide reporting source is configured.</p>
        </>
      ) : null}
    </div>
  );
}
