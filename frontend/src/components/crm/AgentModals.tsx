"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { FIELD, GHOST_BTN, LABEL, PRIMARY_BTN } from "@/lib/agent-ui";
import { LEAD_SOURCES } from "@/lib/agent-dashboard-options";
import { useAgentStore } from "@/lib/agent-store";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import type { CRMLead } from "@/types/crm";

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#1a2a3f] bg-[#0d1828] p-6 text-slate-100 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function isValidPhone(raw: string): boolean {
  return raw.replace(/\D/g, "").length >= 10;
}

/* -------------------------------- Add lead -------------------------------- */

export function AddLeadModal({ onClose }: { onClose: () => void }) {
  const addCrmLead = useAgentStore((s) => s.addCrmLead);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter the client's name.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Please enter a valid phone number (at least 10 digits).");
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiClient.post<
        ApiEnvelope<{
          _id: string;
          clientName: string;
          clientPhone: string;
          propertyTitle?: string;
          status: string;
          source?: string;
          budget?: number;
          interestedCity?: string;
          createdAt: string;
          notes?: string;
        }>
      >("/crm/leads", {
        clientName: name.trim(),
        clientPhone: phone.trim(),
        propertyTitle: interest.trim() || undefined,
        source: source || undefined,
      });
      const savedLead = response.data.data;
      const statusMap: Record<string, CRMLead["status"]> = {
        new: "New",
        contacted: "Connected",
        site_visit_scheduled: "Site Visit",
        negotiation: "Negotiation",
        closed_won: "Closed Won",
        lost: "Lost",
      };
      const propertyType = /plot|land/i.test(interest)
        ? "Plot"
        : /apartment|flat/i.test(interest)
          ? "Apartment"
          : /shop|office|commercial|plaza/i.test(interest)
            ? "Commercial"
            : "House";
      addCrmLead({
        id: savedLead._id,
        clientName: savedLead.clientName,
        clientPhone: savedLead.clientPhone,
        requirement: "Buy",
        propertyType,
        budgetMin: savedLead.budget ? String(savedLead.budget) : "TBD",
        budgetMax: savedLead.budget ? String(savedLead.budget) : "TBD",
        preferredSocieties: [],
        status: statusMap[savedLead.status] ?? "New",
        createdAt: savedLead.createdAt,
        notes: savedLead.notes,
        source: savedLead.source ?? source,
        interest: savedLead.propertyTitle ?? interest.trim(),
      });
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Add New Lead" subtitle="Save a new buyer inquiry to your pipeline" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-name" className={LABEL}>
              Client name *
            </label>
            <input
              id="lead-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mian Tariq"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="lead-phone" className={LABEL}>
              Phone *
            </label>
            <input
              id="lead-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300 1234567"
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label htmlFor="lead-interest" className={LABEL}>
            Interested in
          </label>
          <input
            id="lead-interest"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            placeholder="e.g. 10 Marla House, Plot (5 Marla)"
            className={FIELD}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-source" className={LABEL}>
              Source
            </label>
            <select id="lead-source" value={source} onChange={(e) => setSource(e.target.value)} className={FIELD}>
              <option value="">Select a source</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={GHOST_BTN}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={PRIMARY_BTN}>
            {submitting ? "Saving..." : "Add Lead"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
