"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, History, Loader2, Power, Save, UserRound } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { MAINTENANCE_CATEGORIES, formatDate } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { TechnicianDetail } from "@/types/maintenance";
import { ConfirmDialog, ErrorBanner, LoadingState, SectionCard, StatusBadge, SuccessBanner } from "@/components/maintenance/MaintenanceShared";
import { AVAILABILITY_LABELS, splitList } from "./AdminTechnicianManager";

const input = "min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

export function AdminTechnicianProfile({ id }: { id: string }) {
  const [technician, setTechnician] = useState<TechnicianDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", city: "", categories: [] as string[], skills: "", serviceAreas: "", availability: "available", internalNotes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const endpoint = `/care-ops/technicians/${encodeURIComponent(id)}`;

  const hydrate = (data: TechnicianDetail) => {
    setTechnician(data);
    setForm({
      name: data.name,
      phone: data.phone ?? "",
      city: data.city ?? "",
      categories: data.categories,
      skills: data.skills.join(", "),
      serviceAreas: data.serviceAreas.join(", "),
      availability: data.availability,
      internalNotes: data.internalNotes ?? "",
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<TechnicianDetail>>(endpoint);
      hydrate(data.data);
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.categories.length) {
      setError("Select at least one service category.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data } = await apiClient.patch<ApiEnvelope<TechnicianDetail>>(endpoint, {
        name: form.name.trim(),
        phone: form.phone.replace(/[\s-]/g, ""),
        city: form.city.trim(),
        categories: form.categories,
        skills: splitList(form.skills),
        serviceAreas: splitList(form.serviceAreas),
        availability: form.availability,
        internalNotes: form.internalNotes,
      });
      hydrate(data.data);
      setNotice("Technician profile saved.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (active: boolean, reason: string) => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await apiClient.patch<ApiEnvelope<TechnicianDetail>>(`${endpoint}/status`, { active, reason: reason || undefined });
      hydrate(data.data);
      setToggling(false);
      setNotice(active ? "Technician activated." : "Technician deactivated. They can no longer sign in or receive jobs.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !technician) return <LoadingState label="Loading technician…" dark />;
  if (loadError && !technician) return <ErrorBanner message={loadError} onRetry={() => void load()} dark />;
  if (!technician) return null;

  const stats = [
    ["Assignments", technician.stats.totalAssignments],
    ["Accepted", technician.stats.accepted],
    ["Rejected", technician.stats.rejected],
    ["Completed", technician.stats.completed],
    ["Active jobs", technician.activeJobs],
    ["Avg rating", technician.stats.averageRating != null ? `${technician.stats.averageRating} (${technician.stats.ratingsCount})` : "—"],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link href="/care-ops/technicians" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Technicians</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{technician.name}</h1>
            <p className="text-sm text-slate-400">{technician.email} · {technician.phone}</p>
            {technician.statusReason && <p className="mt-1 text-xs text-slate-500">Status note: {technician.statusReason}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", technician.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")}>{technician.isActive ? "Active" : "Inactive"}</span>
            <button type="button" onClick={() => { setError(null); setToggling(true); }} className={cn("inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold", technician.isActive ? "border border-rose-700 text-rose-300 hover:bg-rose-950/40" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
              <Power className="h-4 w-4" />{technician.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      </header>

      {notice && <SuccessBanner message={notice} dark />}
      {error && !toggling && <ErrorBanner message={error} dark />}

      <section aria-label="Technician statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([text, value]) => (
          <div key={text} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{text}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <SectionCard title="Profile" icon={<UserRound className="h-4 w-4 text-emerald-300" />} dark>
          <form onSubmit={save} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">Name<input required maxLength={100} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={cn(input, "mt-1")} /></label>
            <label className="block text-xs font-semibold text-slate-400">Phone<input required maxLength={20} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={cn(input, "mt-1")} /></label>
            <label className="block text-xs font-semibold text-slate-400">City<input maxLength={100} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className={cn(input, "mt-1")} /></label>
            <label className="block text-xs font-semibold text-slate-400">Availability
              <select value={form.availability} onChange={(event) => setForm((current) => ({ ...current, availability: event.target.value }))} className={cn(input, "mt-1")}>
                {Object.entries(AVAILABILITY_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-400">Service categories</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {MAINTENANCE_CATEGORIES.map((category) => {
                  const checked = form.categories.includes(category.key);
                  return (
                    <label key={category.key} className={cn("inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-xs", checked ? "border-emerald-500 bg-emerald-950/50 text-white" : "border-slate-700 text-slate-300")}>
                      <input type="checkbox" checked={checked} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.checked ? [...current.categories, category.key] : current.categories.filter((key) => key !== category.key) }))} className="accent-blue-500" />
                      {category.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <label className="block text-xs font-semibold text-slate-400">Skills (comma separated)<input value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} className={cn(input, "mt-1")} /></label>
            <label className="block text-xs font-semibold text-slate-400">Service areas (comma separated)<input value={form.serviceAreas} onChange={(event) => setForm((current) => ({ ...current, serviceAreas: event.target.value }))} className={cn(input, "mt-1")} /></label>
            <label className="block text-xs font-semibold text-slate-400">Internal notes<textarea value={form.internalNotes} maxLength={2000} rows={3} onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))} className={cn(input, "mt-1 py-2")} /></label>
            <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save profile
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Job & acceptance history" icon={<History className="h-4 w-4 text-emerald-300" />} dark>
          {technician.history.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="border-b border-slate-800 text-xs uppercase text-slate-400"><th className="py-2 pr-3">Job</th><th className="py-2 pr-3">Assigned</th><th className="py-2 pr-3">Response</th><th className="py-2 pr-3">Job status</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {technician.history.map((item) => (
                    <tr key={`${item.requestId}-${item.assignedAt}`}>
                      <td className="py-2 pr-3">
                        <Link href={`/care-ops/requests/${item.requestId}`} className="font-semibold text-white hover:underline">{item.title}</Link>
                        <p className="font-mono text-xs text-slate-500">{item.reference} · {item.categoryLabel} · {item.area}</p>
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-300">{formatDate(item.assignedAt, true)}</td>
                      <td className="py-2 pr-3 text-xs">
                        <span className="font-semibold capitalize text-slate-200">{item.assignmentStatus}</span>
                        {item.rejectionReason && <span className="block text-rose-300">{item.rejectionReason}</span>}
                        {item.withdrawnReason && <span className="block text-amber-300">{item.withdrawnReason}</span>}
                        {item.rating != null && <span className="block text-amber-300">★ {item.rating}</span>}
                      </td>
                      <td className="py-2 pr-3"><StatusBadge status={item.requestStatus} dark ops /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No jobs assigned yet.</p>
          )}
        </SectionCard>
      </div>

      {toggling && (
        <ConfirmDialog
          dark
          title={technician.isActive ? "Deactivate technician?" : "Activate technician?"}
          description={technician.isActive
            ? "The technician's account will be suspended immediately (existing sessions stop working), and they will not be eligible for assignments. Active jobs must be reassigned first."
            : "The technician will be able to sign in and receive assignments again."}
          confirmLabel={technician.isActive ? "Deactivate" : "Activate"}
          tone={technician.isActive ? "danger" : "primary"}
          reasonLabel="Reason"
          reasonRequired={technician.isActive}
          busy={saving}
          error={error}
          onClose={() => setToggling(false)}
          onConfirm={(reason) => void setActive(!technician.isActive, reason)}
        />
      )}
    </div>
  );
}
