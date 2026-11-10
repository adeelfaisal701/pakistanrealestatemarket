"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface PropertyReportFormProps {
  propertyId: string;
}

const REPORT_CATEGORIES = [
  ["fake_property", "Fake property"],
  ["incorrect_price", "Incorrect price"],
  ["fraudulent_agent", "Fraudulent agent"],
  ["sold_or_rented", "Already sold or rented"],
  ["misleading_photos", "Misleading photos"],
  ["duplicate_advertisement", "Duplicate advertisement"],
  ["suspicious_behavior", "Suspicious behavior"],
  ["other", "Other"],
] as const;

export function PropertyReportForm({ propertyId }: PropertyReportFormProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("fake_property");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await apiClient.post<ApiEnvelope<{ id: string; status: string }>>("/reports", {
        targetType: "property",
        targetId: propertyId,
        category,
        details: details.trim(),
        ...(name.trim() ? { reporterName: name.trim() } : {}),
        ...(email.trim() ? { reporterEmail: email.trim() } : {}),
        ...(phone.trim() ? { reporterPhone: phone.trim() } : {}),
      });
      setSubmitted(true);
      setMessage("Thank you. Your report was submitted for review.");
    } catch (requestError) {
      setMessage(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        className="inline-flex min-h-10 items-center justify-center gap-2 text-xs font-semibold text-slate-500 underline decoration-slate-400 underline-offset-4 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-300"
      >
        <Flag className="h-3.5 w-3.5" /> Report this listing
      </button>
      {open && (
        <div className="fixed inset-0 z-[1400] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby={`report-property-${propertyId}`} className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id={`report-property-${propertyId}`} className="font-bold text-slate-900 dark:text-white">Report this property</h2>
                <p className="mt-1 text-xs text-slate-500">Reports are reviewed by Ghar Safar administrators.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close report form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </header>
            {submitted ? (
              <div>
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</p>
                <button type="button" onClick={() => setOpen(false)} className="mt-4 min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <label className="block space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Report reason
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                    {REPORT_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="block space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Details
                  <textarea required minLength={10} maxLength={5000} value={details} onChange={(event) => setDetails(event.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Your name (optional)
                    <input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Phone (optional)
                    <input maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                  </label>
                </div>
                <label className="block space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Email (optional)
                  <input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </label>
                {message && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{message}</p>}
                <button type="submit" disabled={busy} className="min-h-11 w-full rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">{busy ? "Submitting…" : "Submit report"}</button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
