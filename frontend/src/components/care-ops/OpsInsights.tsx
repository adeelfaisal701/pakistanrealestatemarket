"use client";

import { Bug, CheckCircle2, ClipboardList, Hammer, HelpCircle, Sparkles, Star, TrendingUp } from "lucide-react";
import { categoryLabel } from "@/lib/maintenance";
import { PROPERTY_CARE_SERVICES } from "@/lib/property-care-services";
import { countBy, useAdminRequests, useApiGet } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { MaintenanceListItem, Paginated, TechnicianSummary } from "@/types/maintenance";
import { BarChart, DonutChart, LineChart, ProgressBar } from "@/components/property-care/Charts";
import { ErrorBanner, LoadingState } from "@/components/maintenance/MaintenanceShared";
import { ServiceIcon } from "@/components/property-care/PropertyCareUI";
import { OpsPageHeader, OpsPanel, OpsStat, SampleDataNote } from "./OpsShell";

/** UI-ONLY placeholders for categories the backend does not support yet. */
const PLANNED_CATEGORIES = [
  { key: "cleaning", title: "Cleaning", tagline: "Deep cleaning for homes and offices", icon: Sparkles },
  { key: "pest_control", title: "Pest Control", tagline: "Termite, cockroach and rodent treatment", icon: Bug },
  { key: "general_maintenance", title: "General Maintenance", tagline: "Planned upkeep and inspections", icon: Hammer },
  { key: "other", title: "Other", tagline: "Requests outside listed services", icon: HelpCircle },
];

export function OpsCategories() {
  const list = useAdminRequests({ page: 1, limit: 100 }, "categories");
  const counts = new Map(countBy(list.data?.items ?? [], (item) => item.category).map((row) => [row.label, row.value]));

  return (
    <div>
      <OpsPageHeader title="Service categories" description="Services customers can request. Category changes require backend support and are view-only in this release." />
      {list.error && <div className="mb-4"><ErrorBanner message={list.error} onRetry={list.reload} dark /></div>}
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Live categories</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PROPERTY_CARE_SERVICES.map((service) => (
          <li key={service.key} className="rounded-2xl border border-white/5 bg-[#0e1b33] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ServiceIcon category={service.key} className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{service.title}</p>
                <p className="text-xs text-slate-400">{service.tagline}</p>
              </div>
              <ToggleDisplay on label={`${service.title} is active`} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
              <span className="text-slate-500">Key: <code className="text-slate-300">{service.key}</code></span>
              <span className="font-semibold text-slate-300">{list.data ? `${counts.get(service.key) ?? 0} requests` : "…"}</span>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Planned categories</h2>
      <SampleDataNote>UI preview only — these categories are not accepted by the backend yet, so customers cannot request them.</SampleDataNote>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLANNED_CATEGORIES.map(({ key, title, tagline, icon: Icon }) => (
          <li key={key} className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-200">{title}</p>
                <p className="text-xs text-slate-500">{tagline}</p>
              </div>
            </div>
            <span className="mt-3 inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">Planned · needs backend support</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToggleDisplay({ on, label }: { on: boolean; label: string }) {
  return (
    <span role="img" aria-label={label} title="View-only: category management API not available yet" className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full opacity-80", on ? "bg-emerald-600" : "bg-slate-700")}>
      <span className={cn("h-5 w-5 rounded-full bg-white shadow transition", on ? "translate-x-5" : "translate-x-0.5")} />
    </span>
  );
}

function monthly(items: MaintenanceListItem[], predicate: (item: MaintenanceListItem) => boolean = () => true) {
  const months: Array<{ key: string; label: string; value: number }> = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - offset);
    months.push({ key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString("en-PK", { month: "short" }), value: 0 });
  }
  for (const item of items.filter(predicate)) {
    const date = new Date(item.createdAt);
    const bucket = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  }
  return months.map(({ label, value }) => ({ label, value }));
}

/** SAMPLE DATA — illustrative only until reporting endpoints exist. */
const SAMPLE_REVENUE = [
  { label: "Jun", value: 182 }, { label: "Jul", value: 214 }, { label: "Aug", value: 248 },
  { label: "Sep", value: 231 }, { label: "Oct", value: 296 }, { label: "Nov", value: 318 },
];
const SAMPLE_SATISFACTION = [
  { label: "5 stars", value: 62 }, { label: "4 stars", value: 24 }, { label: "3 stars", value: 8 }, { label: "2 stars", value: 4 }, { label: "1 star", value: 2 },
];
const SAMPLE_COMPLAINTS = [
  { label: "Jun", value: 6 }, { label: "Jul", value: 5 }, { label: "Aug", value: 7 }, { label: "Sep", value: 4 }, { label: "Oct", value: 3 }, { label: "Nov", value: 2 },
];

export function OpsReports() {
  const list = useAdminRequests({ page: 1, limit: 100 }, "reports");
  const technicians = useApiGet<Paginated<TechnicianSummary>>("/admin/maintenance/technicians", { page: 1, limit: 50 });
  const items = list.data?.items ?? [];
  const completed = items.filter((item) => item.status === "completed");
  const categoryRows = countBy(items, (item) => item.category).map((row) => ({
    ...row,
    name: categoryLabel(row.label),
    completed: items.filter((item) => item.category === row.label && item.status === "completed").length,
  }));
  const techRows = countBy(items.filter((item) => item.technician), (item) => item.technician!.name).slice(0, 8).map((row) => ({
    ...row,
    completed: items.filter((item) => item.technician?.name === row.label && item.status === "completed").length,
  }));

  return (
    <div>
      <OpsPageHeader title="Reports & analytics" description="Request volume, completion and technician performance." />
      {list.error && <div className="mb-4"><ErrorBanner message={list.error} onRetry={list.reload} dark /></div>}
      <p className="mb-4 text-xs text-slate-500">Live figures are calculated from the latest 100 requests.</p>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OpsStat label="Requests analysed" value={list.data ? items.length : "–"} icon={<ClipboardList className="h-5 w-5" />} />
        <OpsStat label="Completed" value={list.data ? completed.length : "–"} icon={<CheckCircle2 className="h-5 w-5" />} tone="text-emerald-300" />
        <OpsStat label="Completion rate" value={items.length ? `${Math.round((completed.length / items.length) * 100)}%` : "–"} icon={<TrendingUp className="h-5 w-5" />} tone="text-sky-300" />
        <OpsStat label="Active technicians" value={technicians.data ? technicians.data.items.filter((tech) => tech.isActive).length : "–"} icon={<Star className="h-5 w-5" />} tone="text-amber-300" />
      </section>

      {list.loading && !list.data ? <LoadingState label="Loading reports…" dark /> : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <OpsPanel title="Monthly requests" action={<LiveTag />}><BarChart dark data={monthly(items)} label="Requests per month" /></OpsPanel>
          <OpsPanel title="Completed services" action={<LiveTag />}><BarChart dark data={monthly(items, (item) => item.status === "completed")} label="Completed per month (by request date)" /></OpsPanel>

          <OpsPanel title="Category performance" action={<LiveTag />}>
            {!categoryRows.length ? <p className="text-sm text-slate-500">No data yet.</p> : (
              <ul className="space-y-3">
                {categoryRows.map((row) => (
                  <li key={row.label}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-200">{row.name}</span><span className="text-slate-400">{row.completed}/{row.value} completed</span></div>
                    <ProgressBar dark value={row.completed} max={row.value} tone="green" />
                  </li>
                ))}
              </ul>
            )}
          </OpsPanel>
          <OpsPanel title="Technician performance" action={<LiveTag />}>
            {!techRows.length ? <p className="text-sm text-slate-500">No assigned jobs yet.</p> : (
              <ul className="space-y-3">
                {techRows.map((row) => (
                  <li key={row.label}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-200">{row.label}</span><span className="text-slate-400">{row.completed}/{row.value} completed</span></div>
                    <ProgressBar dark value={row.completed} max={row.value} />
                  </li>
                ))}
              </ul>
            )}
          </OpsPanel>

          <OpsPanel title="Revenue records (PKR thousands)" action={<SampleTag />}><LineChart dark data={SAMPLE_REVENUE} label="Sample revenue per month" /></OpsPanel>
          <OpsPanel title="Customer satisfaction" action={<SampleTag />}><DonutChart dark data={SAMPLE_SATISFACTION} label="Sample rating distribution" centerLabel="4.4★" /></OpsPanel>
          <OpsPanel title="Complaint trend" action={<SampleTag />} className="xl:col-span-2"><BarChart dark data={SAMPLE_COMPLAINTS} label="Sample complaints per month" /></OpsPanel>
        </div>
      )}
    </div>
  );
}

function LiveTag() {
  return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">Live</span>;
}

function SampleTag() {
  return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300" title="Illustrative sample data — reporting API not built yet">Sample data</span>;
}
