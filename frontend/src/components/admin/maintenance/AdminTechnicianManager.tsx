"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { HardHat, Loader2, Plus, RefreshCw, Search, Wand2 } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { MAINTENANCE_CATEGORIES } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { Paginated, TechnicianSummary } from "@/types/maintenance";
import { EmptyState, ErrorBanner, LoadingState, Modal, SuccessBanner } from "@/components/maintenance/MaintenanceShared";

const input = "min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";
export const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Available",
  busy: "Busy",
  unavailable: "Unavailable",
  on_leave: "On leave",
};
const AVAILABILITY_STYLES: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-300",
  busy: "bg-amber-500/15 text-amber-300",
  unavailable: "bg-slate-500/15 text-slate-300",
  on_leave: "bg-indigo-500/15 text-indigo-300",
};

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("") + "7a";
}

export function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  city: "Lahore",
  categories: [] as string[],
  skills: "",
  serviceAreas: "",
  availability: "available",
  internalNotes: "",
};

export function AdminTechnicianManager() {
  const [filters, setFilters] = useState({ search: "", category: "all", state: "all", availability: "all" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<TechnicianSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: string; email: string; password: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: response } = await apiClient.get<ApiEnvelope<Paginated<TechnicianSummary>>>("/care-ops/technicians", {
        params: {
          page,
          limit: 25,
          search: debouncedSearch.trim() || undefined,
          category: filters.category,
          state: filters.state,
          availability: filters.availability,
        },
      });
      setData(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.category, filters.state, filters.availability]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.categories.length) {
      setFormError("Select at least one service category.");
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(form.phone.replace(/[\s-]/g, ""))) {
      setFormError("Enter a valid phone number (10–15 digits).");
      return;
    }
    if (form.password.length < 8) {
      setFormError("The temporary password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { data: response } = await apiClient.post<ApiEnvelope<TechnicianSummary>>("/care-ops/technicians", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/[\s-]/g, ""),
        password: form.password,
        city: form.city.trim() || undefined,
        categories: form.categories,
        skills: splitList(form.skills),
        serviceAreas: splitList(form.serviceAreas),
        availability: form.availability,
        internalNotes: form.internalNotes.trim() || undefined,
      });
      setCreated({ id: response.data.id, email: form.email.trim(), password: form.password });
      setCreating(false);
      setForm(EMPTY_FORM);
      void load();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">Property Care</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Technicians</h1>
          <p className="mt-1 text-sm text-slate-400">Internal roster of verified technicians. Technicians are never shown publicly.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm text-slate-200 hover:bg-slate-800"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh</button>
          <button type="button" onClick={() => { setFormError(null); setCreating(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Add technician</button>
        </div>
      </header>


      {created && (
        <div className="space-y-2">
          <SuccessBanner dark message="Technician account created. Share these sign-in details securely; the password will not be shown again." />
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-200">
            <p>Email: {created.email}</p>
            <p>Temporary password: {created.password}</p>
            <p className="mt-1 font-sans text-xs text-slate-400">Technicians sign in at /property-care/login and are taken to their job console automatically.</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/care-ops/technicians/${created.id}`} className="text-sm font-semibold text-blue-300 hover:underline">Open profile</Link>
            <button type="button" onClick={() => setCreated(null)} className="text-sm text-slate-400 hover:text-white">Dismiss</button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search technicians</span>
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Name, phone, area, skill" className={cn(input, "pl-9")} />
        </label>
        <label><span className="sr-only">Category</span>
          <select value={filters.category} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, category: event.target.value })); }} className={input}>
            <option value="all">All categories</option>
            {MAINTENANCE_CATEGORIES.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Active state</span>
          <select value={filters.state} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, state: event.target.value })); }} className={input}>
            <option value="all">Active & inactive</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </label>
        <label><span className="sr-only">Availability</span>
          <select value={filters.availability} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, availability: event.target.value })); }} className={input}>
            <option value="all">Any availability</option>
            {Object.entries(AVAILABILITY_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </select>
        </label>
      </section>

      {error && <ErrorBanner message={error} onRetry={() => void load()} dark />}
      {loading && !data ? (
        <LoadingState label="Loading technicians…" dark />
      ) : !data?.items.length ? (
        <EmptyState dark icon={<HardHat className="h-5 w-5" />} title="No technicians found" description="Add your first technician to start dispatching jobs." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((technician) => (
            <li key={technician.id}>
              <Link href={`/care-ops/technicians/${technician.id}`} className="block h-full rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{technician.name}</p>
                    <p className="text-xs text-slate-400">{technician.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!technician.isActive && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300">Inactive</span>}
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", AVAILABILITY_STYLES[technician.availability])}>{AVAILABILITY_LABELS[technician.availability]}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-300">{technician.categoryLabels.join(" · ")}</p>
                <p className="mt-1 truncate text-xs text-slate-500">Areas: {technician.serviceAreas.join(", ") || "—"}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">{technician.activeJobs} active job(s)</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-slate-300">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-slate-700 px-4 disabled:opacity-40">Previous</button>
          <span>Page {page} of {data.totalPages}</span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-slate-700 px-4 disabled:opacity-40">Next</button>
        </nav>
      )}

      {creating && (
        <Modal title="Add technician" onClose={() => !saving && setCreating(false)} dark wide>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-400">Full name<input required maxLength={100} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={cn(input, "mt-1")} /></label>
              <label className="text-xs font-semibold text-slate-400">Email (sign-in)<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={cn(input, "mt-1")} /></label>
              <label className="text-xs font-semibold text-slate-400">Phone<input required type="tel" maxLength={20} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={cn(input, "mt-1")} /></label>
              <label className="text-xs font-semibold text-slate-400">Temporary password
                <span className="mt-1 flex gap-2">
                  <input required minLength={8} maxLength={72} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={input} autoComplete="new-password" />
                  <button type="button" onClick={() => setForm((current) => ({ ...current, password: generatePassword() }))} className="rounded-lg border border-slate-700 px-2 text-slate-300 hover:bg-slate-800" aria-label="Generate password"><Wand2 className="h-4 w-4" /></button>
                </span>
              </label>
              <label className="text-xs font-semibold text-slate-400">City<input maxLength={100} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className={cn(input, "mt-1")} /></label>
              <label className="text-xs font-semibold text-slate-400">Availability
                <select value={form.availability} onChange={(event) => setForm((current) => ({ ...current, availability: event.target.value }))} className={cn(input, "mt-1")}>
                  {Object.entries(AVAILABILITY_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-400">Service categories</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {MAINTENANCE_CATEGORIES.map((category) => {
                  const checked = form.categories.includes(category.key);
                  return (
                    <label key={category.key} className={cn("inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm", checked ? "border-blue-500 bg-blue-950/50 text-white" : "border-slate-700 text-slate-300")}>
                      <input type="checkbox" checked={checked} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.checked ? [...current.categories, category.key] : current.categories.filter((key) => key !== category.key) }))} className="accent-blue-500" />
                      {category.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <label className="block text-xs font-semibold text-slate-400">Skills (comma separated)<input value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} placeholder="Geyser repair, PPR pipe fitting" className={cn(input, "mt-1")} /></label>
            <label className="block text-xs font-semibold text-slate-400">Service areas (comma separated)<input value={form.serviceAreas} onChange={(event) => setForm((current) => ({ ...current, serviceAreas: event.target.value }))} placeholder="Bahria Town, DHA Phase 6" className={cn(input, "mt-1")} /></label>
            <label className="block text-xs font-semibold text-slate-400">Internal notes<textarea value={form.internalNotes} maxLength={2000} rows={2} onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))} className={cn(input, "mt-1 py-2")} /></label>
            {formError && <ErrorBanner message={formError} dark />}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} disabled={saving} className="min-h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Create technician</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
