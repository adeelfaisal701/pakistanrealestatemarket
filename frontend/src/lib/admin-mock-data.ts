import { PendingAgent, ModerationProperty } from "@/types/admin";

export const INITIAL_PENDING_AGENTS: PendingAgent[] = [
  {
    id: "ag-1",
    name: "Malik Zohaib",
    agencyName: "Zohaib Associates",
    phone: "923007778899",
    city: "Lahore",
    status: "Pending",
    submittedAt: "2026-08-26",
  },
  {
    id: "ag-2",
    name: "Sheikh Usman",
    agencyName: "Lahore Real Estate Hub",
    phone: "923214443322",
    city: "Lahore",
    status: "Pending",
    submittedAt: "2026-08-27",
  },
];

export const INITIAL_MODERATION_PROPERTIES: ModerationProperty[] = [
  {
    id: "mp-1",
    title: "1 Kanal Luxury Villa in DHA Phase 6",
    price: "PKR 12.5 Crore",
    society: "DHA Lahore",
    agentName: "Zohaib Associates",
    status: "Pending Review",
  },
];
