"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hammer,
  HardHat,
  Inbox,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { categoryLabel, formatDate, formatMoney } from "@/lib/maintenance";
import { countBy, dailyTrend, useAdminRequestDetails, useAdminRequests, useApiGet } from "@/lib/care-data";
import type { Paginated, TechnicianSummary } from "@/types/maintenance";
import { BarChart, DonutChart, ProgressBar } from "@/components/property-care/Charts";
import { ErrorBanner, LoadingState, StatusBadge } from "@/components/maintenance/MaintenanceShared";
import { ServiceIcon } from "@/components/property-care/PropertyCareUI";
import { OpsPageHeader, OpsPanel, OpsStat } from "./OpsShell";

interface Overview {
  stats: Record<string, number>;
  technicians: { active: number; available: number };
}

export function OpsOverview() {
  const overview = useApiGet<Overview>("/admin/maintenance/overview");
  const list = useAdminRequests({ page: 1, limit: 100 }, "overview-list");
  const technicians = useApiGet<Paginated<TechnicianSummary>>("/admin/maintenance/technicians", { page: 1, limit: 50, state: "active" });
  const payments = useAdminRequestDetails({ status: "completed" }, "overview-payments");

  const stats = overview.data?.stats;
  const items = list.data?.items ?? [];
  const now = Date.now();
  const upcoming = items
    .filter((item) => item.scheduledVisitAt && new Date(item.scheduledVisitAt).getTime() > now)
    .sort((a, b) => new Date(a.scheduledVisitAt!).getTime() - new Date(b.scheduledVisitAt!).getTime())
    .slice(0, 5);
  const stalePending = items.filter((item) => item.status === "pending" && now - new Date(item.createdAt).getTime() > 24 * 3600 * 1000).length;
  const recorded = (payments.data?.details ?? []).reduce((sum, request) => sum + request.payments.reduce((total, payment) => total + payment.amount, 0), 0);
  const alerts = [
    stats?.needsReassignment ? { text: `${stats.needsReassignment} job(s) need a new technician`, href: "/care-ops/dispatch", tone: "text-amber-300" } : null,
    stats?.openComplaints ? { text: `${stats.openComplaints} open complaint(s) awaiting resolution`, href: "/care-ops/complaints", tone: "text-rose-300" } : null,
    stalePending ? { text: `${stalePending} request(s) pending review for more than 24 hours`, href: "/care-ops/requests?status=pending", tone: "text-amber-300" } : null,
    stats?.awaitingAcceptance ? { text: `${stats.awaitingAcceptance} assignment(s) awaiting technician acceptance`, href: "/care-ops/requests?status=awaiting_technician_acceptance", tone: "text-care-300" } : null,
  ].filter(Boolean) as Array<{ text: string; href: string; tone: string }>;

  const error = overview.error || list.error;

  return (
    <div>
      <OpsPageHeader
        title="Operations overview"
        description="Live status of every Property Care request, technician and complaint."
        action={
          <button type="button" onClick={() => { overview.reload(); list.reload(); technicians.reload(); payments.reload(); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />
      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={() => { overview.reload(); list.reload(); }} dark /></div>}

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <OpsStat label="Total requests" value={stats?.total ?? "–"} icon={<ClipboardList className="h-5 w-5" />} href="/care-ops/requests" />
        <OpsStat label="New requests" value={stats?.pending ?? "–"} hint="Awaiting review" icon={<Inbox className="h-5 w-5" />} tone="text-amber-300" href="/care-ops/requests?status=pending" />
        <OpsStat label="Pending review" value={stats?.underReview ?? "–"} hint="Ready to dispatch" icon={<Search className="h-5 w-5" />} tone="text-care-300" href="/care-ops/dispatch" />
        <OpsStat label="Active jobs" value={stats ? (stats.inProgress ?? 0) + (stats.assigned ?? 0) + (stats.awaitingAcceptance ?? 0) : "–"} hint="Assigned → in progress" icon={<Hammer className="h-5 w-5" />} tone="text-violet-300" />
        <OpsStat label="Technicians" value={overview.data ? `${overview.data.technicians.available}/${overview.data.technicians.active}` : "–"} hint="Available / active" icon={<HardHat className="h-5 w-5" />} tone="text-care-300" href="/care-ops/technicians" />
        <OpsStat label="Completed jobs" value={stats?.completed ?? "–"} icon={<CheckCircle2 className="h-5 w-5" />} tone="text-emerald-300" />
        <OpsStat label="Open complaints" value={stats?.openComplaints ?? "–"} icon={<MessageSquareWarning className="h-5 w-5" />} tone="text-rose-300" href="/care-ops/complaints" />
        <OpsStat label="Recorded payments" value={payments.data ? formatMoney(recorded) : "–"} hint={payments.data?.truncated ? "Latest 20 completed jobs" : "Completed jobs"} icon={<Wallet className="h-5 w-5" />} tone="text-care-300" href="/care-ops/payments" />
      </section>

      {alerts.length > 0 && (
        <OpsPanel title="Operational alerts" className="mt-4">
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.text}>
                <Link href={alert.href} className="flex min-h-11 items-center gap-3 rounded-xl bg-white/[0.03] px-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.06]">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${alert.tone}`} /> {alert.text}
                </Link>
              </li>
            ))}
          </ul>
        </OpsPanel>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <OpsPanel title="Request trend · last 14 days" action={<span className="text-[11px] text-slate-500">Latest 100 requests</span>}>
          {list.loading && !list.data ? <LoadingState label="Loading trend…" dark /> : <BarChart data={dailyTrend(items, 14)} dark label="Requests per day" />}
        </OpsPanel>
        <OpsPanel title="Service category mix">
          {list.loading && !list.data ? <LoadingState label="Loading categories…" dark /> : (
            <DonutChart dark label="Requests by category" data={countBy(items, (item) => categoryLabel(item.category))} />
          )}
        </OpsPanel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <OpsPanel title="Recent requests" className="xl:col-span-2" action={<Link href="/care-ops/requests" className="text-xs font-bold text-care-300 hover:underline">View all</Link>}>
          {!items.length ? <p className="text-sm text-slate-500">No requests yet.</p> : (
            <ul className="divide-y divide-white/5">
              {items.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link href={`/care-ops/requests/${item.id}`} className="flex items-center gap-3 py-3 hover:opacity-90">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-care-500/10 text-care-300"><ServiceIcon category={item.category} className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                      <span className="block truncate text-xs text-slate-500">{item.reference} · {item.area} · {formatDate(item.createdAt)}</span>
                    </span>
                    <StatusBadge status={item.status} dark ops className="hidden sm:inline-flex" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>
        <OpsPanel title="Upcoming visits">
          {!upcoming.length ? <p className="text-sm text-slate-500">No scheduled visits.</p> : (
            <ul className="space-y-3">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <Link href={`/care-ops/requests/${item.id}`} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3 hover:bg-white/[0.06]">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-care-300" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{formatDate(item.scheduledVisitAt, true)}</span>
                      <span className="block truncate text-xs text-slate-400">{item.title} · {item.technician?.name ?? "Unassigned"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>
      </div>

      <OpsPanel title="Technician activity" className="mt-4" action={<Link href="/care-ops/technicians" className="text-xs font-bold text-care-300 hover:underline">Manage</Link>}>
        {!technicians.data?.items.length ? <p className="text-sm text-slate-500">No active technicians.</p> : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {technicians.data.items.slice(0, 8).map((tech) => (
              <li key={tech.id}>
                <Link href={`/care-ops/technicians/${tech.id}`} className="block rounded-xl bg-white/[0.03] p-3 hover:bg-white/[0.06]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{tech.name}</span>
                    <span className="text-[11px] font-bold capitalize text-slate-400">{tech.availability.replace("_", " ")}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{tech.categoryLabels.join(" · ")}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={tech.activeJobs} max={5} dark tone={tech.activeJobs >= 4 ? "rose" : tech.activeJobs >= 2 ? "amber" : "green"} />
                    <span className="shrink-0 text-[11px] font-bold text-slate-300">{tech.activeJobs} active</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </OpsPanel>
    </div>
  );
}
