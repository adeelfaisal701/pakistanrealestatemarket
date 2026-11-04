import { create } from "zustand";
import type { CRMLead, LeadStatus } from "@/types/crm";

export interface AgentState {
  crmLeads: CRMLead[];
  addCrmLead: (lead: CRMLead) => void;
  replaceCrmLeads: (leads: CRMLead[]) => void;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  clearAccountData: () => void;
}

export function toIntlPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
}

export const useAgentStore = create<AgentState>()((set) => ({
  crmLeads: [],

  addCrmLead: (lead) =>
    set((state) => ({
      crmLeads: [
        { ...lead, source: lead.source ?? "Direct" },
        ...state.crmLeads.filter((existing) => existing.id !== lead.id),
      ],
    })),

  replaceCrmLeads: (crmLeads) => set({ crmLeads }),

  setLeadStatus: (id, status) =>
    set((state) => ({
      crmLeads: state.crmLeads.map((lead) =>
        lead.id === id ? { ...lead, status } : lead,
      ),
    })),

  clearAccountData: () => set({ crmLeads: [] }),
}));
