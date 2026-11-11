"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search, Trash2, UserRound } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type AccountStatus = "active" | "suspended" | "deactivated";

interface BuyerAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  accountStatus: AccountStatus;
  accountStatusReason?: string;
  accountStatusChangedAt?: string;
  createdAt?: string;
  profile?: Record<string, unknown> | null;
  relatedRecordCounts?: {
    savedProperties: number;
    savedSearches: number;
    notifications: number;
    requirements: number;
    leads: number;
    conversations: number;
  };
}

interface BuyerPage {
  items: BuyerAccount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<AccountStatus, number>;
}

const STATUS_STYLES: Record<AccountStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  suspended: "bg-amber-500/15 text-amber-200",
  deactivated: "bg-slate-700 text-slate-300",
};

export function AdminBuyerManager() {
  const [data, setData] = useState<BuyerPage | null>(null);
  const [selected, setSelected] = useState<BuyerAccount | null>(null);
  const [search, setSearch] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<BuyerPage>>("/admin/buyers", {
        params: {
          page,
          limit: 30,
          search: search.trim() || undefined,
          accountStatus,
        },
      });
      setData(response.data.data);
      if (selected) {
        const detail = await apiClient.get<ApiEnvelope<BuyerAccount>>(
          `/admin/buyers/${encodeURIComponent(selected.id)}`,
        );
        setSelected(detail.data.data);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accountStatus, page, search, selected?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  async function selectBuyer(buyer: BuyerAccount) {
    setError("");
    setActionError("");
    try {
      const response = await apiClient.get<ApiEnvelope<BuyerAccount>>(
        `/admin/buyers/${encodeURIComponent(buyer.id)}`,
      );
      const detail = response.data.data;
      setSelected(detail);
      setForm({
        name: detail.name,
        email: detail.email,
        phone: detail.phone ?? "",
        city: detail.city ?? "",
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function saveProfile() {
    if (!selected) return;
    setActing(true);
    setActionError("");
    try {
      await apiClient.patch(`/admin/buyers/${encodeURIComponent(selected.id)}`, form);
      await load();
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActing(false);
    }
  }

  async function changeStatus(status: AccountStatus) {
    if (!selected) return;
    const reason = window.prompt(`Enter a reason to set this account to ${status}:`)?.trim();
    if (!reason) return;
    if (!window.confirm(`Set ${selected.name}'s account status to ${status}?`)) return;
    setActing(true);
    setActionError("");
    try {
      await apiClient.patch(`/admin/buyers/${encodeURIComponent(selected.id)}/account-status`, { status, reason });
      await load();
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActing(false);
    }
  }

  async function deleteBuyer() {
    if (!selected) return;
    const reason = window.prompt("Enter the permanent-deletion reason:")?.trim();
    if (!reason) return;
    if (window.prompt('Type "DELETE BUYER" to confirm:')?.trim() !== "DELETE BUYER") return;
    const counts = selected.relatedRecordCounts;
    const impact = counts
      ? `Saved properties: ${counts.savedProperties}; searches: ${counts.savedSearches}; notifications: ${counts.notifications}; offerless requirements: ${counts.requirements}; leads: ${counts.leads}; conversations: ${counts.conversations}. Linked history may block deletion.`
      : "Buyer-owned records will be cleaned up; retained business history blocks deletion.";
    if (!window.confirm(`Permanently delete ${selected.name}?\n\n${impact}`)) return;
    setActing(true);
    setActionError("");
    try {
      await apiClient.delete(`/admin/buyers/${encodeURIComponent(selected.id)}`, {
        data: { reason, confirmation: "DELETE BUYER" },
      });
      setSelected(null);
      await load();
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError));
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">Account management</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Buyer Accounts</h1>
        <p className="mt-1 text-sm text-slate-400">Manage buyer profiles, access status, and retained account history.</p>
      </header>

      {(error || actionError) && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          <AlertTriangle className="mr-2 inline h-4 w-4" />{actionError || error}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input aria-label="Search buyers" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search name, email, phone, or city" className="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-white" />
          </label>
          <select aria-label="Filter buyers by status" value={accountStatus} onChange={(event) => { setPage(1); setAccountStatus(event.target.value); }} className="min-h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
        <p className="text-xs text-slate-400">{data ? `${data.total} buyer accounts · active ${data.counts.active} · suspended ${data.counts.suspended} · deactivated ${data.counts.deactivated}` : "Loading buyer accounts…"}</p>
      </section>

      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Loading buyer accounts…</p>
      ) : !data?.items.length ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">No buyer accounts match this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b border-slate-800 text-xs uppercase text-slate-400"><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {data.items.map((buyer) => (
                <tr key={buyer.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-white">{buyer.name}</p><p className="text-xs text-slate-500">{buyer.city || "City not provided"}</p></td>
                  <td className="px-4 py-3 text-slate-300">{buyer.email}<p className="text-xs text-slate-500">{buyer.phone || "Phone not provided"}</p></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[buyer.accountStatus]}`}>{buyer.accountStatus}</span></td>
                  <td className="px-4 py-3 text-right"><Button type="button" size="sm" variant="outline" onClick={() => void selectBuyer(buyer)}>Manage</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && <div className="flex items-center justify-between text-sm text-slate-300"><Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {data.totalPages}</span><Button type="button" variant="outline" disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}

      {selected && (
        <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <header className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-rose-300" /><h2 className="text-lg font-bold text-white">Manage buyer</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[selected.accountStatus]}`}>{selected.accountStatus}</span></header>
          <div className="grid gap-3 sm:grid-cols-2">
            {([['name','Name'],['email','Email'],['phone','Phone'],['city','City']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-400">{label}<input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white" /></label>)}
          </div>
          <p className="text-xs text-slate-400">Saved properties {selected.relatedRecordCounts?.savedProperties ?? "—"} · searches {selected.relatedRecordCounts?.savedSearches ?? "—"} · requirements {selected.relatedRecordCounts?.requirements ?? "—"} · leads {selected.relatedRecordCounts?.leads ?? "—"} · conversations {selected.relatedRecordCounts?.conversations ?? "—"}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={acting} onClick={() => void saveProfile()}>Save profile</Button>
            {selected.accountStatus !== "active" && <Button type="button" variant="outline" disabled={acting} onClick={() => void changeStatus("active")}>Activate</Button>}
            {selected.accountStatus !== "suspended" && <Button type="button" variant="outline" disabled={acting} onClick={() => void changeStatus("suspended")}>Suspend</Button>}
            {selected.accountStatus !== "deactivated" && <Button type="button" variant="outline" disabled={acting} onClick={() => void changeStatus("deactivated")}>Deactivate</Button>}
            <Button type="button" variant="danger" disabled={acting} onClick={() => void deleteBuyer()}><Trash2 className="mr-2 h-4 w-4" />Permanently delete</Button>
          </div>
        </section>
      )}
    </div>
  );
}