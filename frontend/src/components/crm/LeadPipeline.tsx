"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  PlusCircle,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadCard } from "@/components/crm/LeadCard";
import { AutoMatchDrawer } from "@/components/crm/AutoMatchDrawer";
import { WhatsAppShareModal } from "@/components/crm/WhatsAppShareModal";
import { LAHORE_SOCIETIES } from "@/lib/crm-mock-data";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { useAgentStore } from "@/lib/agent-store";
import type { CRMLead, LeadStatus, AgentPropertyListing, PropertyRequirement, PropertyType } from "@/types/crm";

export function LeadPipeline() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const setStoredLeadStatus = useAgentStore((state) => state.setLeadStatus);
  const [properties, setProperties] = useState<AgentPropertyListing[]>([]);
  const [loadError, setLoadError] = useState("");
  const [savingError, setSavingError] = useState("");
  const [savingLeadIds, setSavingLeadIds] = useState<Set<string>>(new Set());
  const [statusFeedback, setStatusFeedback] = useState<Record<string, { type: "success" | "error"; message: string }>>({});
  const statusRequests = useRef(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<string>("all");
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");

  const activeProperties = properties;

  const loadPipelineData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [leadResponse, propertyResponse] = await Promise.all([
        apiClient.get<ApiEnvelope<Array<{
          _id: string;
          clientName: string;
          clientPhone: string;
          propertyId?: string;
          propertyTitle?: string;
          status: string;
          source?: string;
          budget?: number;
          interestedCity?: string;
          createdAt: string;
          notes?: string;
          conversationId?: string;
          advertisementId?: string;
        }>>>("/crm/leads"),
        apiClient.get<ApiEnvelope<Array<{
          _id: string;
          title: string;
          price: number;
          location: { area: string };
          areaSize: number;
          areaUnit: string;
          features?: { bedrooms?: number; bathrooms?: number };
          purpose: string;
          propertyType: string;
          images?: string[];
          description: string;
          status: string;
          createdAt: string;
        }>>>("/properties/agent/my-listings"),
      ]);
      const statusMap: Record<string, LeadStatus> = {
        new: "New",
        contacted: "Connected",
        site_visit_scheduled: "Site Visit",
        negotiation: "Negotiation",
        closed_won: "Closed Won",
        lost: "Lost",
      };
      const mappedProperties = propertyResponse.data.data.map((property) => ({
        id: property._id,
        title: property.title,
        price: `PKR ${new Intl.NumberFormat("en-PK").format(property.price)}`,
        society: property.location.area,
        area: `${property.areaSize} ${property.areaUnit}`,
        beds: property.features?.bedrooms ?? 0,
        baths: property.features?.bathrooms ?? 0,
        status:
          property.status === "published"
            ? "Active" as const
            : property.status === "pending_approval"
              ? "Pending Review" as const
              : property.status === "rejected"
                ? "Rejected" as const
                : property.status === "sold"
                  ? "Sold" as const
                  : "Draft" as const,
        purpose: property.purpose === "Rent" ? "Rent" as const : "Buy" as const,
        propertyType: property.propertyType === "Flat" ? "Apartment" as PropertyType : property.propertyType as PropertyType,
        imageUrl: property.images?.[0],
        description: property.description,
        createdAt: property.createdAt,
      }));
      setProperties(mappedProperties);
      setLeads(leadResponse.data.data.map((lead) => {
        const title = lead.propertyTitle ?? "";
        const linkedProperty = mappedProperties.find(
          (property) =>
            (lead.propertyId && property.id === lead.propertyId) ||
            Boolean(title && property.title === title),
        );
        const propertyType: PropertyType = linkedProperty?.propertyType ?? (/plot|land/i.test(title)
          ? "Plot"
          : /apartment|flat/i.test(title)
            ? "Apartment"
            : /shop|office|commercial|plaza/i.test(title)
              ? "Commercial"
              : "House");
        return {
          id: lead._id,
          clientName: lead.clientName,
          clientPhone: lead.clientPhone,
          requirement: linkedProperty?.purpose ?? (/rent/i.test(title) ? "Rent" : "Buy"),
          propertyType,
          budgetMin: lead.budget ? String(lead.budget) : "TBD",
          budgetMax: lead.budget ? String(lead.budget) : "TBD",
          preferredSocieties: lead.interestedCity ? [lead.interestedCity] : [],
          status: statusMap[lead.status] ?? "New",
          createdAt: lead.createdAt,
          notes: lead.notes,
          source: lead.source,
          interest: lead.propertyTitle,
          conversationId: lead.conversationId,
          adId: lead.advertisementId,
          propertyImageUrl: linkedProperty?.imageUrl,
        };
      }));
    } catch (requestError) {
      setLoadError(getApiErrorMessage(requestError));
      setLeads([]);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPipelineData();
  }, [loadPipelineData]);

  // Drawer & Modal States
  const [autoMatchLead, setAutoMatchLead] = useState<CRMLead | null>(null);
  const [isAutoMatchOpen, setIsAutoMatchOpen] = useState(false);

  const [whatsappLead, setWhatsappLead] = useState<CRMLead | null>(null);
  const [whatsappProperty, setWhatsappProperty] = useState<AgentPropertyListing | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Quick Add Lead Modal State
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    clientName: "",
    clientPhone: "",
    requirement: "Buy" as PropertyRequirement,
    propertyType: "House" as PropertyType,
    budgetMin: "",
    budgetMax: "",
    preferredSociety: "",
    notes: "",
  });

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        lead.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.clientPhone.includes(searchQuery) ||
        lead.preferredSocieties?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRequirement =
        selectedRequirement === "all" || lead.requirement === selectedRequirement;

      const matchesType =
        selectedPropertyType === "all" || lead.propertyType === selectedPropertyType;

      return matchesSearch && matchesRequirement && matchesType;
    });
  }, [leads, searchQuery, selectedRequirement, selectedPropertyType]);

  // Stage change handler
  const handleStatusChange = async (leadId: string, nextStatus: LeadStatus) => {
    if (statusRequests.current.has(leadId)) return;
    statusRequests.current.add(leadId);
    setSavingLeadIds((current) => new Set(current).add(leadId));
    setStatusFeedback((current) => {
      const next = { ...current };
      delete next[leadId];
      return next;
    });
    setSavingError("");
    const apiStatus: Record<LeadStatus, string> = {
      New: "new",
      Connected: "contacted",
      "Site Visit": "site_visit_scheduled",
      Negotiation: "negotiation",
      "Closed Won": "closed_won",
      Lost: "lost",
    };
    try {
      await apiClient.patch(`/crm/leads/${leadId}/status`, { status: apiStatus[nextStatus] });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)));
      setStoredLeadStatus(leadId, nextStatus);
      setStatusFeedback((current) => ({
        ...current,
        [leadId]: { type: "success", message: `Stage saved: ${nextStatus}.` },
      }));
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setStatusFeedback((current) => ({
        ...current,
        [leadId]: { type: "error", message },
      }));
    } finally {
      statusRequests.current.delete(leadId);
      setSavingLeadIds((current) => {
        const next = new Set(current);
        next.delete(leadId);
        return next;
      });
    }
  };

  // Handlers for Drawer & WhatsApp
  const handleOpenAutoMatch = (lead: CRMLead) => {
    setAutoMatchLead(lead);
    setIsAutoMatchOpen(true);
  };

  const handleOpenWhatsApp = (lead: CRMLead) => {
    setWhatsappLead(lead);
    setWhatsappProperty(null);
    setIsWhatsAppOpen(true);
  };

  const handleSelectPropertyForWhatsApp = (property: AgentPropertyListing) => {
    setIsAutoMatchOpen(false);
    setWhatsappLead(autoMatchLead);
    setWhatsappProperty(property);
    setIsWhatsAppOpen(true);
  };

  // Quick Add Lead Submit
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.clientName.trim() || !newLeadForm.clientPhone.trim()) return;

    setSavingError("");
    try {
      const response = await apiClient.post<ApiEnvelope<{
        _id: string;
        clientName: string;
        clientPhone: string;
        propertyTitle?: string;
        status: string;
        createdAt: string;
        interestedCity?: string;
        notes?: string;
      }>>("/crm/leads", {
        clientName: newLeadForm.clientName.trim(),
        clientPhone: newLeadForm.clientPhone.trim(),
        propertyTitle: `${newLeadForm.propertyType} · ${newLeadForm.requirement}`,
        interestedCity: newLeadForm.preferredSociety || undefined,
        notes: newLeadForm.notes.trim() || undefined,
      });
      const savedLead = response.data.data;
      const newLead: CRMLead = {
        id: savedLead._id,
        clientName: savedLead.clientName,
        clientPhone: savedLead.clientPhone,
        requirement: newLeadForm.requirement,
        propertyType: newLeadForm.propertyType,
        budgetMin: newLeadForm.budgetMin.trim(),
        budgetMax: newLeadForm.budgetMax.trim(),
        preferredSocieties: savedLead.interestedCity
          ? [savedLead.interestedCity]
          : [],
        status: "New",
        createdAt: savedLead.createdAt,
        notes: savedLead.notes,
        interest: savedLead.propertyTitle,
      };
      setLeads((prev) => [newLead, ...prev]);
      setIsAddLeadModalOpen(false);
      setNewLeadForm({
        clientName: "",
        clientPhone: "",
        requirement: "Buy",
        propertyType: "House",
        budgetMin: "",
        budgetMax: "",
        preferredSociety: "",
        notes: "",
      });
    } catch (requestError) {
      setSavingError(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-5 max-lg:space-y-3">
      {loading && <p role="status" className="text-sm text-slate-400">Loading your leads and listings…</p>}
      {loadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => void loadPipelineData()} className="font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      )}
      {savingError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{savingError}</p>}
      {/* Search & Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 max-lg:rounded-xl max-lg:p-3 max-lg:space-y-2">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search leads by name, phone, or society..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 min-h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:min-h-[44px] lg:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-2 lg:flex">
            <select
              aria-label="Filter leads by purpose"
              value={selectedRequirement}
              onChange={(e) => setSelectedRequirement(e.target.value)}
              className="min-h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:min-h-[44px] lg:px-3 lg:text-xs"
            >
              <option value="all">Purpose: All</option>
              <option value="Buy">Buy</option>
              <option value="Rent">Rent</option>
            </select>

            <select
              aria-label="Filter leads by property type"
              value={selectedPropertyType}
              onChange={(e) => setSelectedPropertyType(e.target.value)}
              className="min-h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:min-h-[44px] lg:px-3 lg:text-xs"
            >
              <option value="all">Type: All</option>
              <option value="House">House</option>
              <option value="Plot">Plot</option>
              <option value="Apartment">Apartment</option>
              <option value="Commercial">Commercial</option>
            </select>

            <Button
              aria-label="Add New Lead"
              title="Add New Lead"
              onClick={() => setIsAddLeadModalOpen(true)}
              className="h-10 min-h-10 w-11 min-w-11 justify-center bg-emerald-600 p-0 text-white shadow-sm hover:bg-emerald-700 lg:h-auto lg:min-h-[44px] lg:w-auto lg:min-w-0 lg:gap-1.5 lg:px-4 lg:text-xs lg:font-bold"
            >
              <PlusCircle className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">Add New Lead</span>
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            Showing <strong className="text-slate-900 dark:text-white">{filteredLeads.length}</strong> of{" "}
            {leads.length} leads
          </span>
          {(searchQuery || selectedRequirement !== "all" || selectedPropertyType !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedRequirement("all");
                setSelectedPropertyType("all");
              }}
              className="text-emerald-600 hover:underline font-medium min-h-[30px] flex items-center"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 max-lg:space-y-2">
        {filteredLeads.length ? filteredLeads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onStatusChange={handleStatusChange}
            statusSaving={savingLeadIds.has(lead.id)}
            statusFeedback={statusFeedback[lead.id]}
            onAutoMatch={handleOpenAutoMatch}
            onWhatsAppPitch={handleOpenWhatsApp}
          />
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {loading ? "Loading leads…" : "No leads match your current filters."}
          </div>
        )}
      </div>

      {/* Auto-Match Slide-Out Drawer with real-time reactive agent properties */}
      <AutoMatchDrawer
        isOpen={isAutoMatchOpen}
        onClose={() => setIsAutoMatchOpen(false)}
        lead={autoMatchLead}
        properties={activeProperties}
        onSelectPropertyForWhatsApp={handleSelectPropertyForWhatsApp}
      />

      {/* WhatsApp Share Pitch Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        lead={whatsappLead}
        property={whatsappProperty}
      />

      {/* Quick Add Lead Modal Dialog */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add New Buyer Lead
                  </h3>
                  <p className="text-xs text-slate-500">Record a new real estate client inquiry</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddLeadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Mian Tariq"
                    value={newLeadForm.clientName}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, clientName: e.target.value })
                    }
                    className="min-h-[44px] text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Phone *
                  </label>
                  <Input
                    required
                    placeholder="03001234567"
                    value={newLeadForm.clientPhone}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, clientPhone: e.target.value })
                    }
                    className="min-h-[44px] text-base sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Requirement
                  </label>
                  <select
                    value={newLeadForm.requirement}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        requirement: e.target.value as PropertyRequirement,
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Buy">Buy</option>
                    <option value="Rent">Rent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Property Type
                  </label>
                  <select
                    value={newLeadForm.propertyType}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        propertyType: e.target.value as PropertyType,
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="House">House</option>
                    <option value="Plot">Plot</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Budget Range
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Min (e.g. 2.0 Cr)"
                      value={newLeadForm.budgetMin}
                      onChange={(e) =>
                        setNewLeadForm({ ...newLeadForm, budgetMin: e.target.value })
                      }
                      className="min-h-[44px] text-base sm:text-sm"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <Input
                      placeholder="Max (e.g. 3.5 Cr)"
                      value={newLeadForm.budgetMax}
                      onChange={(e) =>
                        setNewLeadForm({ ...newLeadForm, budgetMax: e.target.value })
                      }
                      className="min-h-[44px] text-base sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Society
                  </label>
                  <select
                    value={newLeadForm.preferredSociety}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, preferredSociety: e.target.value })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {LAHORE_SOCIETIES.map((soc) => (
                      <option key={soc} value={soc}>
                        {soc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specific Requirements / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 10 Marla corner, park facing, solid construction..."
                  value={newLeadForm.notes}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, notes: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  className="w-full sm:w-auto min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Add Lead to Pipeline
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
