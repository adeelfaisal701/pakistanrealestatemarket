/**
 * SAMPLE DATA — UI PREVIEW ONLY.
 * Used exclusively by the development-only /property-care-preview routes to
 * render Property Care screens without a backend. Never imported by
 * production code paths. All people, phone numbers and references are fictional.
 */
import type {
  AdminMaintenanceRequest,
  AppNotification,
  CustomerMaintenanceRequest,
  MaintenanceImage,
  MaintenanceListItem,
  MaintenanceStatus,
  MaintenanceTimelineEvent,
  TechnicianDetail,
  TechnicianJob,
  TechnicianSummary,
} from "@/types/maintenance";
import { OPS_STATUS_LABELS, categoryLabel } from "@/lib/maintenance";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = () => Date.now();
const at = (offsetMs: number) => new Date(now() + offsetMs).toISOString();

export const SAMPLE_CUSTOMER = { name: "Ayesha Khan (sample)", phone: "03000000001", email: "customer@sample.invalid" };
export const SAMPLE_TECHNICIANS: TechnicianSummary[] = [
  sampleTechnician("tech-1", "Imran Ali (sample)", ["plumbing", "general_handyman"], ["bahria town", "dha phase 6"], "available", 2),
  sampleTechnician("tech-2", "Bilal Ahmed (sample)", ["plumbing"], ["johar town"], "available", 0),
  sampleTechnician("tech-3", "Usman Tariq (sample)", ["electrical", "ac_repair"], ["bahria town", "gulberg"], "busy", 3),
  sampleTechnician("tech-4", "Hamza Riaz (sample)", ["painting", "carpentry"], ["model town"], "on_leave", 0, false),
];

function sampleTechnician(
  id: string,
  name: string,
  categories: string[],
  serviceAreas: string[],
  availability: TechnicianSummary["availability"],
  activeJobs: number,
  isActive = true,
): TechnicianSummary {
  return {
    id,
    name,
    email: `${id}@sample.invalid`,
    phone: "03000000099",
    accountStatus: isActive ? "active" : "suspended",
    categories,
    categoryLabels: categories.map(categoryLabel),
    skills: categories.includes("plumbing") ? ["Geyser repair", "PPR fitting"] : ["Inverter ACs", "DB wiring"],
    serviceAreas,
    city: "Lahore",
    availability,
    isActive,
    activeJobs,
    createdAt: at(-60 * DAY),
    areaMatch: serviceAreas.includes("bahria town"),
    cityMatch: true,
  };
}

const PHOTO = (id: string, kind: MaintenanceImage["kind"]): MaintenanceImage => ({
  id,
  kind,
  url: `/__preview-image/${kind}/${id}`,
  uploadedAt: at(-2 * DAY),
});

function event(
  eventName: string,
  actorRole: MaintenanceTimelineEvent["actorRole"],
  offset: number,
  toStatus?: MaintenanceStatus,
  note?: string,
  internal = false,
): MaintenanceTimelineEvent {
  return { id: `${eventName}-${offset}`, event: eventName, fromStatus: null, toStatus: toStatus ?? null, actorRole, note: note ?? null, internal, at: at(offset) };
}

function base(id: string, status: MaintenanceStatus, overrides: Partial<MaintenanceListItem> = {}): MaintenanceListItem {
  return {
    id,
    reference: `GS-MR-261112-${id.slice(-4).toUpperCase()}`,
    title: "Kitchen sink leaking under the cabinet",
    category: "plumbing",
    categoryLabel: "Plumbing",
    propertyType: "house",
    area: "Bahria Town, Sector C",
    city: "Lahore",
    status,
    statusLabel: OPS_STATUS_LABELS[status],
    preferredVisitDate: at(1 * DAY),
    preferredTimeSlot: "morning",
    scheduledVisitAt: null,
    quotationStatus: null,
    hasOpenComplaint: false,
    createdAt: at(-2 * DAY),
    updatedAt: at(-1 * HOUR),
    customerName: SAMPLE_CUSTOMER.name,
    ...overrides,
  };
}

const QUOTE = (status: "sent" | "approved") => ({
  inspectionCharge: 500,
  laborCharge: 2500,
  materialCharge: 1800,
  additionalCharges: [{ label: "PVC trap replacement kit", amount: 650 }],
  total: 5450,
  currency: "PKR",
  notes: "Includes replacement of the corroded trap and resealing of the joint.",
  status,
  version: 1,
  sentAt: at(-6 * HOUR),
  respondedAt: status === "approved" ? at(-4 * HOUR) : null,
  customerNote: null,
});

const ACTIONS_NONE = {
  canCancel: false,
  canUploadImages: false,
  canRespondToQuotation: false,
  canConfirmCompletion: false,
  canSubmitFeedback: false,
  canRaiseComplaint: true,
};

function customerRequest(
  id: string,
  status: MaintenanceStatus,
  extra: Partial<CustomerMaintenanceRequest>,
): CustomerMaintenanceRequest {
  return {
    ...base(id, status),
    description:
      "Water has been leaking from the pipe joint under the kitchen sink since yesterday morning. The cabinet base is getting damp. The main valve is partly closed for now.",
    address: { line: "House 12, Street 4", area: "Bahria Town, Sector C", city: "Lahore" },
    contact: { name: SAMPLE_CUSTOMER.name, phone: SAMPLE_CUSTOMER.phone },
    images: [PHOTO("p1", "problem"), PHOTO("p2", "problem")],
    technician: null,
    technicianPending: false,
    quotation: null,
    paymentStatus: "unpaid",
    payments: [],
    workNotes: [],
    completionReport: null,
    timeline: [event("request_submitted", "customer", -2 * DAY, "pending"), event("status_changed", "admin", -40 * HOUR, "under_review")],
    feedback: null,
    complaints: [],
    cancellationReason: null,
    completedAt: null,
    actions: { ...ACTIONS_NONE, canCancel: true, canUploadImages: true },
    ...extra,
  };
}

const TECH_VIEW = { name: "Imran Ali (sample)", phone: "03000000099" };

export const CUSTOMER_REQUESTS: Record<string, CustomerMaintenanceRequest> = {
  "sample-review": customerRequest("sample-review", "under_review", {}),
  "sample-quote": customerRequest("sample-quote", "accepted", {
    technician: TECH_VIEW,
    scheduledVisitAt: at(20 * HOUR),
    quotation: QUOTE("sent"),
    quotationStatus: "sent",
    timeline: [
      event("request_submitted", "customer", -2 * DAY, "pending"),
      event("status_changed", "admin", -40 * HOUR, "under_review"),
      event("status_changed", "admin", -30 * HOUR, "awaiting_technician_acceptance"),
      event("status_changed", "technician", -26 * HOUR, "accepted", "Technician accepted the job"),
      event("quotation_sent", "admin", -6 * HOUR, undefined, "Quotation v1: PKR 5,450"),
    ],
    actions: { ...ACTIONS_NONE, canCancel: true, canRespondToQuotation: true },
  }),
  "sample-confirm": customerRequest("sample-confirm", "awaiting_customer_confirmation", {
    technician: TECH_VIEW,
    scheduledVisitAt: at(-3 * HOUR),
    quotation: QUOTE("approved"),
    quotationStatus: "approved",
    images: [PHOTO("p1", "problem"), PHOTO("b1", "before"), PHOTO("a1", "after"), PHOTO("a2", "after")],
    completionReport: {
      checklist: [
        { label: "Problem resolved and tested", done: true },
        { label: "Work area cleaned", done: true },
        { label: "Before and after photos uploaded", done: true },
        { label: "Customer walked through the completed work", done: true },
      ],
      summary: "Replaced the corroded P-trap and resealed the waste pipe joint. No leakage after a 15-minute flow test.",
      submittedAt: at(-1 * HOUR),
    },
    workNotes: [{ id: "n1", note: "Trap fully corroded — replaced with new PVC kit.", authorRole: "technician", createdAt: at(-2 * HOUR) }],
    timeline: [
      event("request_submitted", "customer", -2 * DAY, "pending"),
      event("status_changed", "technician", -26 * HOUR, "accepted"),
      event("quotation_approved", "customer", -4 * HOUR, undefined, "Quotation v1 approved"),
      event("status_changed", "technician", -3 * HOUR, "in_progress"),
      event("status_changed", "technician", -1 * HOUR, "awaiting_customer_confirmation", "Replaced trap and resealed joint"),
    ],
    actions: { ...ACTIONS_NONE, canConfirmCompletion: true },
  }),
  "sample-completed": customerRequest("sample-completed", "completed", {
    title: "AC not cooling in master bedroom",
    category: "ac_repair",
    categoryLabel: "AC Repair & Maintenance",
    technician: { name: "Usman Tariq (sample)", phone: "03000000099" },
    scheduledVisitAt: at(-5 * DAY),
    quotation: { ...QUOTE("approved"), total: 7800, laborCharge: 3000, materialCharge: 4300, additionalCharges: [] },
    paymentStatus: "paid",
    images: [PHOTO("b1", "before"), PHOTO("a1", "after")],
    completedAt: at(-5 * DAY),
    actions: { ...ACTIONS_NONE, canSubmitFeedback: true },
  }),
};

export const CUSTOMER_LIST: MaintenanceListItem[] = [
  { ...CUSTOMER_REQUESTS["sample-quote"], quotationStatus: "sent" },
  CUSTOMER_REQUESTS["sample-confirm"],
  base("sample-review", "under_review", { title: "Tripping breaker in lounge", category: "electrical", categoryLabel: "Electrical" }),
  CUSTOMER_REQUESTS["sample-completed"],
];

function technicianJob(id: string, status: MaintenanceStatus, extra: Partial<TechnicianJob> = {}): TechnicianJob {
  const accepted = !["awaiting_technician_acceptance"].includes(status);
  return {
    id,
    reference: `GS-MR-261112-${id.slice(-4).toUpperCase()}`,
    title: "Kitchen sink leaking under the cabinet",
    category: "plumbing",
    categoryLabel: "Plumbing",
    propertyType: "house",
    area: "Bahria Town, Sector C",
    city: "Lahore",
    isCurrent: true,
    status,
    statusLabel: OPS_STATUS_LABELS[status],
    updatedAt: at(-1 * HOUR),
    myAssignment: {
      status: accepted ? "accepted" : "pending",
      assignedAt: at(-30 * HOUR),
      respondedAt: accepted ? at(-26 * HOUR) : null,
      scheduledVisitAt: at(20 * HOUR),
      dispatchNotes: "Customer prefers a call 30 minutes before arrival. Gate code given on call.",
      rejectionReason: null,
      withdrawn: false,
    },
    description:
      "Water has been leaking from the pipe joint under the kitchen sink since yesterday morning. The cabinet base is getting damp.",
    preferredVisitDate: at(1 * DAY),
    preferredTimeSlot: "morning",
    scheduledVisitAt: at(20 * HOUR),
    address: accepted ? { line: "House 12, Street 4", area: "Bahria Town, Sector C", city: "Lahore" } : null,
    contact: accepted ? { name: SAMPLE_CUSTOMER.name, phone: SAMPLE_CUSTOMER.phone } : null,
    images: [PHOTO("p1", "problem"), PHOTO("p2", "problem")],
    quotation: null,
    workNotes: [],
    completionReport: null,
    actions: {
      canAccept: status === "awaiting_technician_acceptance",
      canReject: status === "awaiting_technician_acceptance",
      canMarkOnTheWay: status === "accepted",
      canStartWork: status === "on_the_way",
      canAddNotes: ["accepted", "on_the_way", "in_progress"].includes(status),
      canUploadPhotos: ["accepted", "on_the_way", "in_progress"].includes(status),
      canSubmitCompletion: status === "in_progress",
    },
    ...extra,
  };
}

export const TECHNICIAN_JOBS: Record<string, TechnicianJob> = {
  "sample-new": technicianJob("sample-new", "awaiting_technician_acceptance"),
  "sample-working": technicianJob("sample-working", "in_progress", {
    scheduledVisitAt: at(-1 * HOUR),
    images: [PHOTO("p1", "problem"), PHOTO("b1", "before"), PHOTO("a1", "after")],
    quotation: { total: 5450, status: "approved", version: 1, currency: "PKR" },
    workNotes: [{ id: "n1", note: "Trap fully corroded — replacing with new PVC kit.", authorRole: "technician", createdAt: at(-40 * 60 * 1000) }],
  }),
  "sample-accepted": technicianJob("sample-accepted", "accepted", { title: "Replace bathroom mixer tap" }),
  "sample-reassigned": {
    ...technicianJob("sample-reassigned", "under_review"),
    isCurrent: false,
    status: null,
    statusLabel: "Reassigned / closed for you",
    title: "Geyser not heating",
    myAssignment: { status: "rejected", assignedAt: at(-4 * DAY), respondedAt: at(-4 * DAY), scheduledVisitAt: null, dispatchNotes: null, rejectionReason: "Already booked for that slot", withdrawn: false },
  },
};

export const TECHNICIAN_BUCKETS: Record<string, TechnicianJob[]> = {
  new: [TECHNICIAN_JOBS["sample-new"]],
  accepted: [TECHNICIAN_JOBS["sample-accepted"]],
  in_progress: [TECHNICIAN_JOBS["sample-working"]],
  completed: [{ ...technicianJob("sample-done", "completed"), title: "Water tank cleaning", category: "water_tank_cleaning", categoryLabel: "Water Tank Cleaning" }],
  rejected: [TECHNICIAN_JOBS["sample-reassigned"]],
};

export const NOTIFICATIONS: AppNotification[] = [
  { id: "nt1", type: "maintenance.quotation_sent", title: "Quotation ready for approval", message: "GS-MR-261112-UOTE: quotation of PKR 5,450 is awaiting your approval.", link: null, readAt: null, createdAt: at(-6 * HOUR) },
  { id: "nt2", type: "maintenance.status_changed", title: "Request Accepted", message: "GS-MR-261112-UOTE: Your technician has confirmed the visit.", link: null, readAt: null, createdAt: at(-26 * HOUR) },
  { id: "nt3", type: "maintenance.request_submitted", title: "Request received", message: "GS-MR-261112-VIEW: Our team will review it shortly.", link: null, readAt: at(-1 * DAY), createdAt: at(-2 * DAY) },
];

export const ADMIN_OVERVIEW = {
  stats: { total: 48, pending: 5, underReview: 3, awaitingAcceptance: 4, assigned: 6, needsReassignment: 2, inProgress: 7, awaitingConfirmation: 3, completed: 21, cancelled: 2, disputed: 1, openComplaints: 2 },
  technicians: { active: 12, available: 7 },
};

export const ADMIN_LIST: MaintenanceListItem[] = [
  base("sample-admin", "under_review", { customerName: SAMPLE_CUSTOMER.name }),
  { ...base("adm-2", "awaiting_technician_acceptance", { title: "Tripping breaker in lounge", category: "electrical", categoryLabel: "Electrical", area: "Gulberg III", scheduledVisitAt: at(1 * DAY) }), technician: { id: "tech-3", name: "Usman Tariq (sample)", phone: null } },
  { ...base("adm-3", "in_progress", { title: "Repaint kids' bedroom", category: "painting", categoryLabel: "Painting", area: "Model Town", scheduledVisitAt: at(-2 * HOUR) }), technician: { id: "tech-4", name: "Hamza Riaz (sample)", phone: null } },
  { ...base("adm-4", "disputed", { title: "AC dripping water", category: "ac_repair", categoryLabel: "AC Repair & Maintenance", area: "DHA Phase 6", hasOpenComplaint: true }), technician: { id: "tech-3", name: "Usman Tariq (sample)", phone: null } },
  base("adm-5", "pending", { title: "Overhead tank cleaning", category: "water_tank_cleaning", categoryLabel: "Water Tank Cleaning", area: "Johar Town" }),
];

export const ADMIN_REQUEST: AdminMaintenanceRequest = {
  ...customerRequest("sample-admin", "rejected", {}),
  customerName: SAMPLE_CUSTOMER.name,
  customer: { id: "cust-1", name: SAMPLE_CUSTOMER.name, phone: SAMPLE_CUSTOMER.phone, email: SAMPLE_CUSTOMER.email },
  technician: null,
  assignments: [
    { id: "as1", technician: { id: "tech-2", name: "Bilal Ahmed (sample)", phone: "03000000099" }, assignedAt: at(-30 * HOUR), scheduledVisitAt: at(4 * HOUR), notes: "Bring spare P-trap", status: "rejected", respondedAt: at(-28 * HOUR), rejectionReason: "Already booked for that slot", withdrawnReason: null },
  ],
  quotation: { ...QUOTE("sent"), status: "draft" },
  payments: [],
  workNotes: [{ id: "an1", note: "Customer called — prefers morning visits.", authorRole: "admin", internal: true, createdAt: at(-20 * HOUR) }],
  timeline: [
    event("request_submitted", "customer", -2 * DAY, "pending"),
    event("status_changed", "admin", -40 * HOUR, "under_review"),
    event("technician_assigned", "admin", -30 * HOUR, undefined, "Dispatch note: Bring spare P-trap", true),
    event("status_changed", "technician", -28 * HOUR, "rejected", "Already booked for that slot", true),
  ],
  complaints: [],
  feedback: null,
  allowedStatusTargets: ["rescheduling", "cancelled"],
  canAssign: true,
  canEditQuotation: true,
};

export const TECHNICIAN_DETAIL: TechnicianDetail = {
  ...SAMPLE_TECHNICIANS[0],
  internalNotes: "Reliable on geyser and PPR work. Prefers Bahria Town jobs.",
  statusReason: null,
  stats: { totalAssignments: 18, accepted: 16, rejected: 2, completed: 14, averageRating: 4.7, ratingsCount: 11 },
  history: [
    { requestId: "sample-admin", reference: "GS-MR-261112-ADMN", title: "Kitchen sink leaking", categoryLabel: "Plumbing", area: "Bahria Town", requestStatus: "in_progress", requestStatusLabel: "In Progress", isCurrent: true, assignmentStatus: "accepted", assignedAt: at(-1 * DAY), respondedAt: at(-20 * HOUR), rejectionReason: null, withdrawnReason: null, rating: null },
    { requestId: "adm-9", reference: "GS-MR-261101-K3PQ", title: "Bathroom mixer replacement", categoryLabel: "Plumbing", area: "DHA Phase 6", requestStatus: "completed", requestStatusLabel: "Completed", isCurrent: true, assignmentStatus: "completed", assignedAt: at(-11 * DAY), respondedAt: at(-11 * DAY), rejectionReason: null, withdrawnReason: null, rating: 5 },
    { requestId: "adm-8", reference: "GS-MR-261028-Z7MX", title: "Geyser not heating", categoryLabel: "Plumbing", area: "Johar Town", requestStatus: "accepted", requestStatusLabel: "Accepted", isCurrent: false, assignmentStatus: "rejected", assignedAt: at(-15 * DAY), respondedAt: at(-15 * DAY), rejectionReason: "Outside my service area", withdrawnReason: null, rating: null },
  ],
};
