"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import { CUSTOMER_PROGRESS_STEPS, formatDate, formatMoney, progressIndex } from "@/lib/maintenance";
import { PROPERTY_CARE_SERVICES, requestServiceHref } from "@/lib/property-care-services";
import { useCustomerRequests, useCustomerRequestDetails } from "@/lib/care-data";
import { cn } from "@/lib/utils";
import type { MaintenanceListItem, MaintenanceStatus } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, NotificationsPanel, StatusBadge } from "@/components/maintenance/MaintenanceShared";
import { PcPageHeader, ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";

const ACTIVE_EXCLUDE: MaintenanceStatus[] = ["completed", "cancelled"];

export function RequestCard({ item }: { item: MaintenanceListItem }) {
  const step = progressIndex(item.status);
  const percent = item.status === "completed" ? 100 : item.status === "cancelled" ? 0 : Math.round(((step + 1) / CUSTOMER_PROGRESS_STEPS.length) * 100);
  const needsAction = item.quotationStatus === "sent" || item.status === "awaiting_customer_confirmation";
  return (
    <Link
      href={`/care/requests/${item.id}`}
      className={cn(pc.card, "group block p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,39,71,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1660d0]", needsAction && "border-amber-300 ring-1 ring-amber-200")}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2fe] text-[#1660d0]"><ServiceIcon category={item.category} className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-extrabold text-[#0f2747]">{item.title}</h3>
              <p className="mt-0.5 truncate text-xs text-[#7a8594]">{item.categoryLabel} · <span className="font-mono">{item.reference}</span></p>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#a7b0bc] transition group-hover:translate-x-0.5 group-hover:text-[#1660d0]" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.quotationStatus === "sent" && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">Quotation needs approval</span>}
          </div>
          {item.status !== "cancelled" && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e5ebf4]" aria-hidden="true">
              <div className={cn("h-full rounded-full", item.status === "completed" ? "bg-emerald-500" : "bg-[#1660d0]")} style={{ width: `${percent}%` }} />
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7a8594]">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{item.area}</span>
            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {item.scheduledVisitAt ? `Visit ${formatDate(item.scheduledVisitAt, true)}` : `Submitted ${formatDate(item.createdAt)}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatTile({ label, value, icon, tone, href }: { label: string; value: number | string; icon: React.ReactNode; tone: string; href: string }) {
  return (
    <Link href={href} className={cn(pc.card, "flex items-center gap-3 p-4 transition hover:shadow-[0_10px_24px_rgba(15,39,71,0.08)]")}>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tone)}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-2xl font-black leading-none tabular-nums text-[#0f2747]">{value}</span>
        <span className="mt-1 block text-xs font-semibold text-[#64748b]">{label}</span>
      </span>
    </Link>
  );
}

export function CareOverview() {
  const requests = useCustomerRequests();
  const items = requests.data?.items ?? [];
  const active = items.filter((item) => !ACTIVE_EXCLUDE.includes(item.status));
  const pendingQuotes = items.filter((item) => item.quotationStatus === "sent");
  const completed = items.filter((item) => item.status === "completed");
  const upcoming = items
    .filter((item) => item.scheduledVisitAt && new Date(item.scheduledVisitAt).getTime() > Date.now() && !ACTIVE_EXCLUDE.includes(item.status))
    .sort((a, b) => new Date(a.scheduledVisitAt!).getTime() - new Date(b.scheduledVisitAt!).getTime());
  const actionNeeded = items.filter((item) => item.quotationStatus === "sent" || item.status === "awaiting_customer_confirmation");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1660d0] via-[#114fb0] to-[#0b2c5f] p-5 text-white shadow-[0_18px_40px_rgba(22,96,208,0.28)] sm:p-7">
        <Wrench aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/5" />
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#9fc3f5]">Property Care</p>
        <h1 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.03em] sm:text-3xl">Your home, looked after.</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">Request a service and Ghar Safar takes care of the rest — a verified technician, an upfront quotation and tracking until the job is done.</p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/care/new" className={cn(pc.primaryBtn, "bg-white text-[#1660d0] shadow-none hover:bg-[#eaf2fe]")}><Plus className="h-4 w-4" /> New service request</Link>
          <Link href="/care/requests" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/25 px-5 text-sm font-bold text-white hover:bg-white/10">Track requests</Link>
        </div>
      </section>

      {requests.error && <ErrorBanner message={requests.error} onRetry={requests.reload} />}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active requests" value={requests.data ? active.length : "–"} icon={<Wrench className="h-5 w-5" />} tone="bg-[#eaf2fe] text-[#1660d0]" href="/care/requests" />
        <StatTile label="Pending quotations" value={requests.data ? pendingQuotes.length : "–"} icon={<ReceiptText className="h-5 w-5" />} tone="bg-amber-50 text-amber-700" href="/care/quotations" />
        <StatTile label="Completed jobs" value={requests.data ? completed.length : "–"} icon={<CheckCircle2 className="h-5 w-5" />} tone="bg-emerald-50 text-emerald-700" href="/care/history" />
        <StatTile label="Total requests" value={requests.data ? requests.data.total : "–"} icon={<ClipboardList className="h-5 w-5" />} tone="bg-slate-100 text-slate-700" href="/care/requests" />
      </section>

      {actionNeeded.length > 0 && (
        <section aria-labelledby="action-heading" className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <h2 id="action-heading" className="text-sm font-extrabold text-amber-950">Needs your attention</h2>
          <ul className="mt-2 space-y-2">
            {actionNeeded.map((item) => (
              <li key={item.id}>
                <Link href={`/care/requests/${item.id}`} className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-3 text-sm font-semibold text-[#0f2747] shadow-sm">
                  <ServiceIcon category={item.category} className="h-4 w-4 shrink-0 text-[#1660d0]" />
                  <span className="min-w-0 flex-1 truncate">{item.quotationStatus === "sent" ? "Approve quotation" : "Confirm completion"} · {item.title}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-700" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="active-heading" className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="active-heading" className="text-lg font-black tracking-[-0.02em]">Active requests</h2>
            <Link href="/care/requests" className="text-sm font-bold text-[#1660d0]">View all</Link>
          </div>
          {requests.loading && !requests.data ? <LoadingState label="Loading requests…" /> : !active.length ? (
            <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No active requests" description="When something needs fixing, start a request and we'll take it from there." action={<Link href="/care/new" className={pc.primaryBtn}>Request a service</Link>} />
          ) : (
            <ul className="space-y-3">{active.slice(0, 4).map((item) => <li key={item.id}><RequestCard item={item} /></li>)}</ul>
          )}

          <h2 className="mb-3 mt-6 text-lg font-black tracking-[-0.02em]">Book a service</h2>
          <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-4">
            {PROPERTY_CARE_SERVICES.map((service) => (
              <li key={service.key} className="w-32 shrink-0 sm:w-auto">
                <Link href={requestServiceHref(service.key)} className={cn(pc.card, "flex h-full flex-col gap-2 p-3.5 transition hover:border-[#9fc3f5]")}>
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", service.accent)}><ServiceIcon category={service.key} className="h-5 w-5" /></span>
                  <span className="text-[13px] font-extrabold leading-tight">{service.shortTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-4">
          <section className={cn(pc.card, "p-4 sm:p-5")} aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="flex items-center gap-2 text-[15px] font-extrabold"><CalendarClock className="h-4 w-4 text-[#1660d0]" /> Upcoming visits</h2>
            {!upcoming.length ? <p className="mt-3 text-sm text-[#7a8594]">No visits scheduled.</p> : (
              <ul className="mt-3 space-y-2">
                {upcoming.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <Link href={`/care/requests/${item.id}`} className="flex gap-3 rounded-2xl bg-[#f5f8fd] p-3">
                      <span className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white py-1 text-center shadow-sm">
                        <span className="text-[10px] font-bold uppercase text-[#1660d0]">{new Date(item.scheduledVisitAt!).toLocaleDateString("en-PK", { month: "short" })}</span>
                        <span className="text-lg font-black leading-none">{new Date(item.scheduledVisitAt!).getDate()}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{item.title}</span>
                        <span className="block text-xs text-[#7a8594]">{new Date(item.scheduledVisitAt!).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })} · {item.area}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <NotificationsPanel limit={5} />
        </aside>
      </div>
    </div>
  );
}

const REQUEST_TABS: Array<{ key: string; label: string; statuses: MaintenanceStatus[] | null }> = [
  { key: "all", label: "All", statuses: null },
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "review", label: "Under Review", statuses: ["under_review"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned", "awaiting_technician_acceptance", "accepted", "rejected", "rescheduling"] },
  { key: "progress", label: "In Progress", statuses: ["on_the_way", "in_progress"] },
  { key: "confirm", label: "Awaiting Confirmation", statuses: ["awaiting_customer_confirmation", "disputed"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export function CareRequests() {
  const requests = useCustomerRequests();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const items = requests.data?.items ?? [];

  const counts = useMemo(() => Object.fromEntries(REQUEST_TABS.map((t) => [t.key, t.statuses ? items.filter((item) => t.statuses!.includes(item.status)).length : items.length])), [items]);
  const visible = useMemo(() => {
    const statuses = REQUEST_TABS.find((t) => t.key === tab)?.statuses;
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => !statuses || statuses.includes(item.status))
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => !query || `${item.title} ${item.reference} ${item.categoryLabel} ${item.area}`.toLowerCase().includes(query))
      .sort((a, b) => (sort === "newest" ? 1 : -1) * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [items, tab, search, category, sort]);

  return (
    <div className="space-y-5">
      <PcPageHeader eyebrow="Property Care" title="My requests" description="Every maintenance request you've submitted, with live status." action={<Link href="/care/new" className={cn(pc.primaryBtn, "hidden sm:inline-flex")}><Plus className="h-4 w-4" /> New request</Link>} />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {REQUEST_TABS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}
            className={cn("inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition", tab === t.key ? "border-[#1660d0] bg-[#1660d0] text-white" : "border-[#d4deeb] bg-white text-[#334155] hover:border-[#1660d0]")}>
            {t.label}<span className={cn("rounded-full px-1.5 text-[11px]", tab === t.key ? "bg-white/20" : "bg-[#eaf2fe] text-[#1660d0]")}>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_200px_150px]">
        <label className="relative">
          <span className="sr-only">Search requests</span>
          <Search className="absolute left-4 top-4 h-4 w-4 text-[#94a3b8]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, reference or area" className={cn(pc.input, "mt-0 pl-10")} />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={cn(pc.input, "mt-0")}>
            <option value="all">All categories</option>
            {PROPERTY_CARE_SERVICES.map((service) => <option key={service.key} value={service.key}>{service.title}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")} className={cn(pc.input, "mt-0")}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {requests.error && <ErrorBanner message={requests.error} onRetry={requests.reload} />}
      {requests.loading && !requests.data ? <LoadingState label="Loading requests…" /> : !items.length ? (
        <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No requests yet" description="Your maintenance requests will appear here." action={<Link href="/care/new" className={pc.primaryBtn}>Request a service</Link>} />
      ) : !visible.length ? (
        <EmptyState icon={<Search className="h-5 w-5" />} title="No matching requests" description="Try a different search, category or status." action={<button type="button" onClick={() => { setSearch(""); setCategory("all"); setTab("all"); }} className={pc.secondaryBtn}>Clear filters</button>} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{visible.map((item) => <li key={item.id}><RequestCard item={item} /></li>)}</ul>
      )}
      {requests.data && requests.data.total > items.length && <p className="text-xs text-[#7a8594]">Showing your latest {items.length} requests.</p>}
    </div>
  );
}

export function CareHistory() {
  const result = useCustomerRequestDetails((item) => item.status === "completed" || item.status === "cancelled", "history");
  const details = (result.data?.details ?? []).sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime());

  return (
    <div className="space-y-5">
      <PcPageHeader eyebrow="Property Care" title="Maintenance history" description="Completed and closed requests, newest first." />
      {result.error && <ErrorBanner message={result.error} onRetry={result.reload} />}
      {result.loading && !result.data ? <LoadingState label="Loading history…" /> : !details.length ? (
        <EmptyState icon={<History className="h-5 w-5" />} title="No history yet" description="Completed jobs will be listed here." />
      ) : (
        <ol className="relative space-y-3 border-l-2 border-[#dbe4f0] pl-5">
          {details.map((request) => (
            <li key={request.id} className="relative">
              <span className={cn("absolute -left-[29px] top-5 h-4 w-4 rounded-full ring-4 ring-[#f5f9ff]", request.status === "completed" ? "bg-emerald-500" : "bg-slate-400")} aria-hidden="true" />
              <Link href={`/care/requests/${request.id}`} className={cn(pc.card, "block p-4 transition hover:shadow-[0_10px_24px_rgba(15,39,71,0.08)]")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1660d0]">{formatDate(request.completedAt ?? request.updatedAt)}</p>
                    <h3 className="truncate text-[15px] font-extrabold">{request.title}</h3>
                    <p className="text-xs text-[#7a8594]">{request.categoryLabel} · {request.reference}</p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
                  {request.technician && <span>Technician: <b className="text-[#0f2747]">{request.technician.name}</b></span>}
                  {request.quotation && <span>Cost: <b className="text-[#0f2747]">{formatMoney(request.quotation.total)}</b></span>}
                  {request.feedback && <span>Your rating: <b className="text-amber-600">{"★".repeat(request.feedback.rating)}</b></span>}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {result.data?.truncated && <p className="text-xs text-[#7a8594]">Showing the latest 20 records.</p>}
    </div>
  );
}

