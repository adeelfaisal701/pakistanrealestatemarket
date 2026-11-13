"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Hammer,
  MapPin,
  Navigation,
  Sparkles,
  Sun,
  Wrench,
} from "lucide-react";
import { categoryLabel, formatDate } from "@/lib/maintenance";
import { useApiGet } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { MaintenanceStatus, Paginated, TechnicianJob } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, NotificationsPanel, StatusBadge } from "@/components/maintenance/MaintenanceShared";
import { ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";

type JobsResponse = Paginated<TechnicianJob> & { counts: Record<string, number> };

export function TechnicianJobCard({ job }: { job: TechnicianJob }) {
  const visit = job.scheduledVisitAt ?? job.myAssignment?.scheduledVisitAt;
  const isNew = job.status === "awaiting_technician_acceptance";
  return (
    <Link
      href={`/technician/jobs/${job.id}`}
      className={cn(pc.card, "group block p-4 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d57ad]", isNew && "border-[#9ebfe6] ring-1 ring-[#cfe1f7]")}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf5ff] text-[#0d57ad]"><ServiceIcon category={job.category} className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-extrabold">{job.title}</h3>
              <p className="truncate text-xs text-[#6b7a90]">{job.categoryLabel} · <span className="font-mono">{job.reference}</span></p>
            </div>
            {job.status ? <StatusBadge status={job.status} ops /> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-600">{job.myAssignment?.status ?? "closed"}</span>}
          </div>
          <div className="mt-3 grid gap-1.5 text-[13px] text-[#36506f]">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#0d57ad]" aria-hidden="true" />{job.area}, {job.city}</span>
            {visit && <span className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-[#0d57ad]" aria-hidden="true" />{formatDate(visit, true)}</span>}
            {job.myAssignment?.rejectionReason && <span className="text-xs text-rose-600">You rejected: {job.myAssignment.rejectionReason}</span>}
          </div>
          {isNew && <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#0d57ad]">Review & respond <ChevronRight className="h-3.5 w-3.5" /></span>}
        </div>
      </div>
    </Link>
  );
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function TechnicianHome() {
  const profile = useApiGet<{ name: string; availability: string }>("/maintenance/technician/profile");
  const active = useApiGet<JobsResponse>("/maintenance/technician/jobs", { bucket: "all", page: 1, limit: 50 });
  const jobs = active.data?.items.filter((job) => job.isCurrent && job.status && !["completed", "cancelled"].includes(job.status)) ?? [];
  const today = jobs.filter((job) => isToday(job.scheduledVisitAt));
  const upcoming = jobs
    .filter((job) => job.scheduledVisitAt && new Date(job.scheduledVisitAt).getTime() > Date.now() && !isToday(job.scheduledVisitAt))
    .sort((a, b) => new Date(a.scheduledVisitAt!).getTime() - new Date(b.scheduledVisitAt!).getTime());
  const counts = active.data?.counts ?? {};
  const firstName = profile.data?.name?.split(" ")[0] ?? "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const tiles = [
    { key: "new", label: "New", icon: Sparkles, tone: "bg-[#edf5ff] text-[#0d57ad]" },
    { key: "accepted", label: "Accepted", icon: BadgeCheck, tone: "bg-sky-50 text-sky-700" },
    { key: "in_progress", label: "Active", icon: Hammer, tone: "bg-violet-50 text-violet-700" },
    { key: "completed", label: "Done", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-gradient-to-br from-[#0d57ad] to-[#0b2545] p-5 text-white shadow-[0_14px_30px_rgba(13,87,173,0.25)]">
        <p className="flex items-center gap-1.5 text-xs font-bold text-blue-200"><Sun className="h-4 w-4" /> {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-2 text-[24px] font-black tracking-[-0.02em]">{greeting}{firstName ? `, ${firstName}` : ""}</h1>
        <p className="mt-1 text-sm text-blue-100">{today.length ? `You have ${today.length} visit${today.length > 1 ? "s" : ""} today.` : "No visits scheduled for today."}</p>
        {(counts.new ?? 0) > 0 && (
          <Link href="/technician/jobs?bucket=new" className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl bg-white/15 px-4 text-sm font-bold ring-1 ring-inset ring-white/20">
            <Sparkles className="h-5 w-5" /> {counts.new} new assignment{counts.new > 1 ? "s" : ""} to review <ChevronRight className="ml-auto h-5 w-5" />
          </Link>
        )}
      </section>

      {active.error && <ErrorBanner message={active.error} onRetry={active.reload} />}

      <section aria-label="Job counts" className="grid grid-cols-4 gap-2">
        {tiles.map(({ key, label, icon: Icon, tone }) => (
          <Link key={key} href={`/technician/jobs?bucket=${key === "in_progress" ? "in_progress" : key}`} className={cn(pc.card, "flex flex-col items-center gap-1.5 p-3 text-center")}>
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}><Icon className="h-4 w-4" /></span>
            <span className="text-xl font-black leading-none tabular-nums">{active.data ? counts[key] ?? 0 : "–"}</span>
            <span className="text-[11px] font-bold text-[#5b6b82]">{label}</span>
          </Link>
        ))}
      </section>

      <section aria-labelledby="today-heading">
        <div className="mb-3 flex items-center justify-between"><h2 id="today-heading" className="text-lg font-black tracking-[-0.02em]">Today&apos;s jobs</h2><Link href="/technician/jobs" className="text-sm font-bold text-[#0d57ad]">All jobs</Link></div>
        {active.loading && !active.data ? <LoadingState label="Loading jobs…" /> : !today.length ? (
          <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="Nothing scheduled today" description="New assignments from Ghar Safar operations will appear here." />
        ) : <ul className="space-y-3">{today.map((job) => <li key={job.id}><TechnicianJobCard job={job} /></li>)}</ul>}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="mb-3 text-lg font-black tracking-[-0.02em]">Upcoming visits</h2>
          {!upcoming.length ? <p className={cn(pc.card, "p-4 text-sm text-[#6b7a90]")}>No upcoming visits.</p> : (
            <ul className={cn(pc.card, "divide-y divide-[#eef2f8]")}>
              {upcoming.slice(0, 5).map((job) => (
                <li key={job.id}>
                  <Link href={`/technician/jobs/${job.id}`} className="flex items-center gap-3 p-3.5">
                    <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-[#f6f9fd] py-1.5">
                      <span className="text-[10px] font-bold uppercase text-[#1768c4]">{new Date(job.scheduledVisitAt!).toLocaleDateString("en-PK", { month: "short" })}</span>
                      <span className="text-lg font-black leading-none">{new Date(job.scheduledVisitAt!).getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{job.title}</span>
                      <span className="block text-xs text-[#6b7a90]">{new Date(job.scheduledVisitAt!).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })} · {job.area}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#a9b8cc]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Recent activity">
          <NotificationsPanel limit={5} />
        </section>
      </div>
    </div>
  );
}

const JOB_BUCKETS: Array<{ key: string; label: string; api: string; statuses?: MaintenanceStatus[]; empty: string }> = [
  { key: "new", label: "New", api: "new", empty: "No new assignments." },
  { key: "accepted", label: "Accepted", api: "accepted", empty: "No accepted jobs waiting." },
  { key: "on_the_way", label: "On The Way", api: "in_progress", statuses: ["on_the_way"], empty: "You're not on the way to any job." },
  { key: "in_progress", label: "In Progress", api: "in_progress", statuses: ["in_progress"], empty: "No jobs in progress." },
  { key: "awaiting", label: "Awaiting Customer", api: "completed", statuses: ["awaiting_customer_confirmation"], empty: "No jobs awaiting customer confirmation." },
  { key: "completed", label: "Completed", api: "completed", statuses: ["completed", "disputed"], empty: "No completed jobs yet." },
  { key: "rejected", label: "Rejected / Rescheduled", api: "rejected", empty: "No rejected or reassigned jobs." },
];

export function TechnicianJobs({ initialBucket }: { initialBucket?: string }) {
  const valid = JOB_BUCKETS.some((bucket) => bucket.key === initialBucket);
  const [bucket, setBucket] = useState(valid ? initialBucket! : "new");
  const active = JOB_BUCKETS.find((item) => item.key === bucket)!;
  const all = useApiGet<JobsResponse>("/maintenance/technician/jobs", { bucket: "all", page: 1, limit: 50 });
  const current = useApiGet<JobsResponse>("/maintenance/technician/jobs", { bucket: active.api, page: 1, limit: 50 }, active.api);

  const counts = useMemo(() => {
    const items = all.data?.items ?? [];
    const apiCounts = all.data?.counts ?? {};
    return Object.fromEntries(JOB_BUCKETS.map((item) => [
      item.key,
      item.statuses ? items.filter((job) => job.isCurrent && job.status && item.statuses!.includes(job.status)).length : apiCounts[item.api] ?? 0,
    ]));
  }, [all.data]);
  const jobs = (current.data?.items ?? []).filter((job) => !active.statuses || (job.status && active.statuses.includes(job.status)));

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1768c4]">Jobs</p>
        <h1 className="mt-1 text-[24px] font-black tracking-[-0.02em]">My jobs</h1>
      </header>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {JOB_BUCKETS.map((item) => (
          <button key={item.key} type="button" aria-pressed={bucket === item.key} onClick={() => setBucket(item.key)}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition", bucket === item.key ? "border-[#0d57ad] bg-[#0d57ad] text-white" : "border-[#d5e0ee] bg-white text-[#36506f]")}>
            {item.label}
            <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", bucket === item.key ? "bg-white/20" : "bg-[#edf5ff] text-[#0d57ad]")}>{all.data ? counts[item.key] : "·"}</span>
          </button>
        ))}
      </div>
      {current.error && <ErrorBanner message={current.error} onRetry={current.reload} />}
      {current.loading && !current.data ? <LoadingState label="Loading jobs…" /> : !jobs.length ? (
        <EmptyState icon={<Wrench className="h-5 w-5" />} title={active.empty} />
      ) : <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{jobs.map((job) => <li key={job.id}><TechnicianJobCard job={job} /></li>)}</ul>}
    </div>
  );
}

interface TechnicianProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  categories: string[];
  skills: string[];
  serviceAreas: string[];
  city: string;
  availability: string;
  isActive: boolean;
}

const AVAILABILITY: Record<string, { label: string; tone: string }> = {
  available: { label: "Available", tone: "bg-emerald-100 text-emerald-800" },
  busy: { label: "Busy", tone: "bg-amber-100 text-amber-800" },
  unavailable: { label: "Unavailable", tone: "bg-slate-100 text-slate-600" },
  on_leave: { label: "On leave", tone: "bg-indigo-100 text-indigo-800" },
};

export function TechnicianProfileView() {
  const profile = useApiGet<TechnicianProfileData>("/maintenance/technician/profile");
  const jobs = useApiGet<JobsResponse>("/maintenance/technician/jobs", { bucket: "completed", page: 1, limit: 50 });
  const p = profile.data;
  const counts = jobs.data?.counts ?? {};
  const completed = (jobs.data?.items ?? []).filter((job) => job.status === "completed");
  const totalHandled = (counts.completed ?? 0) + (counts.rejected ?? 0) + (counts.new ?? 0) + (counts.accepted ?? 0) + (counts.in_progress ?? 0);
  const acceptance = totalHandled ? Math.round((1 - (counts.rejected ?? 0) / totalHandled) * 100) : null;

  if (profile.loading && !p) return <LoadingState label="Loading profile…" />;
  if (profile.error && !p) return <ErrorBanner message={profile.error} onRetry={profile.reload} />;
  if (!p) return null;
  const availability = AVAILABILITY[p.availability] ?? AVAILABILITY.unavailable;
  const initials = p.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="space-y-5">
      <section className={cn(pc.card, "overflow-hidden")}>
        <div className="h-20 bg-gradient-to-r from-[#0b2545] to-[#0d57ad]" />
        <div className="-mt-10 px-5 pb-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white bg-[#102b55] text-2xl font-black text-white">{initials}</span>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-black">{p.name}</h1>
              <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" /> Ghar Safar technician{p.isActive ? "" : " (inactive)"}</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", availability.tone)}>{availability.label}</span>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f6f9fd] p-3"><dt className="text-xs text-[#6b7a90]">Email</dt><dd className="truncate font-semibold">{p.email}</dd></div>
            <div className="rounded-2xl bg-[#f6f9fd] p-3"><dt className="text-xs text-[#6b7a90]">Phone</dt><dd className="font-semibold">{p.phone ?? "—"}</dd></div>
            <div className="rounded-2xl bg-[#f6f9fd] p-3"><dt className="text-xs text-[#6b7a90]">City</dt><dd className="font-semibold">{p.city}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-[#6b7a90]">Profile details and availability are managed by Ghar Safar operations. Contact your coordinator to request changes.</p>
        </div>
      </section>

      <section aria-label="Job statistics" className="grid grid-cols-3 gap-2">
        {[
          { label: "Completed", value: counts.completed ?? 0, icon: CheckCircle2 },
          { label: "Active", value: (counts.accepted ?? 0) + (counts.in_progress ?? 0), icon: Navigation },
          { label: "Acceptance", value: acceptance === null ? "—" : `${acceptance}%`, icon: BadgeCheck },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className={cn(pc.card, "p-3 text-center")}>
            <Icon className="mx-auto h-5 w-5 text-[#0d57ad]" />
            <p className="mt-1 text-xl font-black tabular-nums">{jobs.data ? value : "–"}</p>
            <p className="text-[11px] font-bold text-[#5b6b82]">{label}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={cn(pc.card, "p-4 sm:p-5")} aria-labelledby="skills-heading">
          <h2 id="skills-heading" className="text-[15px] font-extrabold">Service categories & skills</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.categories.map((key) => (
              <li key={key} className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ff] px-3 py-1.5 text-xs font-bold text-[#0d57ad]"><ServiceIcon category={key} className="h-3.5 w-3.5" />{categoryLabel(key)}</li>
            ))}
            {p.skills.map((skill) => <li key={skill} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{skill}</li>)}
          </ul>
        </section>
        <section className={cn(pc.card, "p-4 sm:p-5")} aria-labelledby="areas-heading">
          <h2 id="areas-heading" className="text-[15px] font-extrabold">Service areas</h2>
          {!p.serviceAreas.length ? <p className="mt-2 text-sm text-[#6b7a90]">No service areas set.</p> : (
            <ul className="mt-3 flex flex-wrap gap-2">{p.serviceAreas.map((area) => <li key={area} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700"><MapPin className="h-3.5 w-3.5" />{area}</li>)}</ul>
          )}
        </section>
      </div>

      <section aria-labelledby="completed-heading">
        <h2 id="completed-heading" className="mb-3 text-lg font-black tracking-[-0.02em]">Completed jobs</h2>
        {jobs.loading && !jobs.data ? <LoadingState label="Loading…" /> : !completed.length ? <p className={cn(pc.card, "p-4 text-sm text-[#6b7a90]")}>No completed jobs yet.</p> : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{completed.slice(0, 10).map((job) => <li key={job.id}><TechnicianJobCard job={job} /></li>)}</ul>
        )}
      </section>
    </div>
  );
}
