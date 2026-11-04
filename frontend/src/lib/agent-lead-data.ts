import type { CRMLead, LeadStatus, PropertyType } from "../types/crm";

export interface AgentLeadResponse {
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
  conversationId?: string;
  advertisementId?: string;
}

const LEAD_STATUSES: Record<string, LeadStatus> = {
  new: "New",
  contacted: "Connected",
  site_visit_scheduled: "Site Visit",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  lost: "Lost",
};

export function mapAgentLead(lead: AgentLeadResponse): CRMLead {
  const interest = lead.propertyTitle ?? "";
  const propertyType: PropertyType = /plot|land/i.test(interest)
    ? "Plot"
    : /apartment|flat/i.test(interest)
      ? "Apartment"
      : /shop|office|commercial|plaza/i.test(interest)
        ? "Commercial"
        : "House";

  return {
    id: lead._id,
    clientName: lead.clientName,
    clientPhone: lead.clientPhone,
    requirement: "Buy",
    propertyType,
    budgetMin: lead.budget ? String(lead.budget) : "TBD",
    budgetMax: lead.budget ? String(lead.budget) : "TBD",
    preferredSocieties: lead.interestedCity ? [lead.interestedCity] : [],
    status: LEAD_STATUSES[lead.status] ?? "New",
    createdAt: lead.createdAt,
    notes: lead.notes,
    source: lead.source,
    interest: lead.propertyTitle,
    conversationId: lead.conversationId,
    adId: lead.advertisementId,
  };
}
