"use client";

import React, { useState, useMemo } from "react";
import {
  PlusCircle,
  Search,
  Users,
  Sparkles,
  Building2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadCard } from "@/components/crm/LeadCard";
import { AutoMatchDrawer } from "@/components/crm/AutoMatchDrawer";
import { WhatsAppShareModal } from "@/components/crm/WhatsAppShareModal";
import { LAHORE_SOCIETIES } from "@/lib/crm-mock-data";
import { usePropertyStore } from "@/lib/property-store";
import type { CRMLead, LeadStatus, AgentPropertyListing, PropertyRequirement, PropertyType } from "@/types/crm";

interface LeadPipelineProps {
  initialLeads: CRMLead[];
  properties?: AgentPropertyListing[];
}

const STAGES: { id: LeadStatus; label: string; color: string; description: string }[] = [
  { id: "New", label: "New Leads", color: "from-blue-500 to-indigo-600", description: "Fresh buyer inquiries" },
  { id: "Contacted", label: "Contacted", color: "from-purple-500 to-violet-600", description: "First call/chat done" },
  { id: "Site Visit", label: "Site Visit", color: "from-amber-500 to-orange-600", description: "Physical visit booked" },
  { id: "Negotiation", label: "Negotiation", color: "from-rose-500 to-pink-600", description: "Offer made / Token talk" },
  { id: "Closed", label: "Closed Won", color: "from-emerald-500 to-teal-600", description: "Deal finalized" },
];

export function LeadPipeline({ initialLeads, properties: initialProperties }: LeadPipelineProps) {
  const [leads, setLeads] = useState<CRMLead[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<string>("all");
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");

  // Read agent properties directly from global reactive store
  const storeAgentProperties = usePropertyStore((state) => state.agentProperties);
  const activeProperties = storeAgentProperties.length > 0 ? storeAgentProperties : (initialProperties || []);

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
    budgetMin: "2.0 Crore",
    budgetMax: "3.5 Crore",
    preferredSociety: "Bahria Town Lahore",
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
  const handleStatusChange = (leadId: string, nextStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l))
    );
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
  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.clientName.trim() || !newLeadForm.clientPhone.trim()) return;

    const newLead: CRMLead = {
      id: `lead-${Date.now()}`,
      clientName: newLeadForm.clientName.trim(),
      clientPhone: newLeadForm.clientPhone.trim(),
      requirement: newLeadForm.requirement,
      propertyType: newLeadForm.propertyType,
      budgetMin: newLeadForm.budgetMin.trim(),
      budgetMax: newLeadForm.budgetMax.trim(),
      preferredSocieties: [newLeadForm.preferredSociety],
      status: "New",
      createdAt: new Date().toISOString(),
      notes: newLeadForm.notes.trim() || undefined,
    };

    setLeads((prev) => [newLead, ...prev]);
    setIsAddLeadModalOpen(false);
    setNewLeadForm({
      clientName: "",
      clientPhone: "",
      requirement: "Buy",
      propertyType: "House",
      budgetMin: "2.0 Crore",
      budgetMax: "3.5 Crore",
      preferredSociety: "Bahria Town Lahore",
      notes: "",
    });
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search leads by name, phone, or society..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <select
              value={selectedRequirement}
              onChange={(e) => setSelectedRequirement(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Purpose: All</option>
              <option value="Buy">Buy</option>
              <option value="Rent">Rent</option>
            </select>

            <select
              value={selectedPropertyType}
              onChange={(e) => setSelectedPropertyType(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Type: All</option>
              <option value="House">House</option>
              <option value="Plot">Plot</option>
              <option value="Apartment">Apartment</option>
              <option value="Commercial">Commercial</option>
            </select>

            <Button
              onClick={() => setIsAddLeadModalOpen(true)}
              className="col-span-2 sm:col-span-1 min-h-[44px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm whitespace-nowrap"
            >
              <PlusCircle className="h-4 w-4 flex-shrink-0" />
              <span>Add New Lead</span>
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

      {/* Horizontal Scrollable Kanban Pipeline Board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <div className="flex gap-3 sm:gap-4 min-w-max">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage.id);

            return (
              <div
                key={stage.id}
                className="w-[82vw] sm:w-[300px] md:w-[320px] flex-shrink-0 flex flex-col rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-3"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2.5 px-1 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${stage.color} flex-shrink-0`} />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {stage.label}
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    {stageLeads.length}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 py-1.5 truncate">
                  {stage.description}
                </p>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 pt-2 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[140px]">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
                      No leads in {stage.label}
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onStatusChange={handleStatusChange}
                        onAutoMatch={handleOpenAutoMatch}
                        onWhatsAppPitch={handleOpenWhatsApp}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
