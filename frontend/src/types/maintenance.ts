export type MaintenanceStatus =
  | "pending"
  | "under_review"
  | "assigned"
  | "awaiting_technician_acceptance"
  | "accepted"
  | "rejected"
  | "rescheduling"
  | "on_the_way"
  | "in_progress"
  | "awaiting_customer_confirmation"
  | "completed"
  | "cancelled"
  | "disputed";

export type QuotationStatus = "draft" | "sent" | "approved" | "rejected";
export type AssignmentStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "completed";
export type ComplaintStatus = "open" | "in_review" | "resolved" | "closed";
export type TechnicianAvailability = "available" | "busy" | "unavailable" | "on_leave";

export interface MaintenanceAddress {
  line: string;
  area: string;
  city: string;
}

export interface MaintenanceImage {
  id: string;
  kind: "problem" | "before" | "after";
  url: string;
  uploadedAt: string;
}

export interface MaintenanceQuotation {
  inspectionCharge: number;
  laborCharge: number;
  materialCharge: number;
  additionalCharges: Array<{ label: string; amount: number }>;
  total: number;
  currency: string;
  notes: string | null;
  status: QuotationStatus;
  version: number;
  sentAt: string | null;
  respondedAt: string | null;
  customerNote: string | null;
}

export interface MaintenanceTimelineEvent {
  id: string;
  event: string;
  fromStatus: MaintenanceStatus | null;
  toStatus: MaintenanceStatus | null;
  actorRole: "customer" | "technician" | "admin" | "system";
  note: string | null;
  internal?: boolean;
  at: string;
}

export interface MaintenanceWorkNote {
  id: string;
  note: string;
  authorRole: "technician" | "admin";
  internal?: boolean;
  createdAt: string;
}

export interface MaintenanceComplaint {
  id: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CompletionReport {
  checklist: Array<{ label: string; done: boolean }>;
  summary: string | null;
  submittedAt: string | null;
}

export interface MaintenanceListItem {
  id: string;
  reference: string;
  title: string;
  category: string;
  categoryLabel: string;
  propertyType: string;
  area: string;
  city: string;
  status: MaintenanceStatus;
  statusLabel: string;
  preferredVisitDate: string | null;
  preferredTimeSlot: string;
  scheduledVisitAt: string | null;
  quotationStatus: QuotationStatus | null;
  hasOpenComplaint: boolean;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  technician?: { id?: string; name: string; phone: string | null } | null;
}

export interface CustomerMaintenanceRequest extends MaintenanceListItem {
  description: string;
  address: MaintenanceAddress;
  contact: { name: string; phone: string; email?: string };
  images: MaintenanceImage[];
  technician: { name: string; phone: string | null } | null;
  technicianPending: boolean;
  quotation: MaintenanceQuotation | null;
  paymentStatus: "unpaid" | "partially_paid" | "paid";
  payments: Array<{ id: string; amount: number; method: string; recordedAt: string }>;
  workNotes: MaintenanceWorkNote[];
  completionReport: CompletionReport | null;
  timeline: MaintenanceTimelineEvent[];
  feedback: { rating: number; comment: string | null; createdAt: string } | null;
  complaints: MaintenanceComplaint[];
  cancellationReason: string | null;
  completedAt: string | null;
  actions: {
    canCancel: boolean;
    canUploadImages: boolean;
    canRespondToQuotation: boolean;
    canConfirmCompletion: boolean;
    canSubmitFeedback: boolean;
    canRaiseComplaint: boolean;
  };
}

export interface TechnicianJob {
  id: string;
  reference: string;
  title: string;
  category: string;
  categoryLabel: string;
  propertyType: string;
  area: string;
  city: string;
  isCurrent: boolean;
  status: MaintenanceStatus | null;
  statusLabel: string;
  updatedAt: string;
  myAssignment: {
    status: AssignmentStatus;
    assignedAt: string;
    respondedAt: string | null;
    scheduledVisitAt: string | null;
    dispatchNotes: string | null;
    rejectionReason: string | null;
    withdrawn: boolean;
  } | null;
  description?: string;
  preferredVisitDate?: string | null;
  preferredTimeSlot?: string;
  scheduledVisitAt?: string | null;
  address?: MaintenanceAddress | null;
  contact?: { name: string; phone: string } | null;
  images?: MaintenanceImage[];
  quotation?: { total: number; status: QuotationStatus; version: number; currency: string } | null;
  workNotes?: MaintenanceWorkNote[];
  completionReport?: CompletionReport | null;
  actions?: {
    canAccept: boolean;
    canReject: boolean;
    canMarkOnTheWay: boolean;
    canStartWork: boolean;
    canAddNotes: boolean;
    canUploadPhotos: boolean;
    canSubmitCompletion: boolean;
  };
}

export interface AdminUserSummary {
  id: string;
  name: string;
  phone: string | null;
  email?: string;
}

export interface AdminMaintenanceRequest extends MaintenanceListItem {
  description: string;
  address: MaintenanceAddress;
  contact: { name: string; phone: string; email?: string };
  customer: AdminUserSummary | null;
  images: MaintenanceImage[];
  technician: AdminUserSummary | null;
  assignments: Array<{
    id: string;
    technician: AdminUserSummary;
    assignedAt: string;
    scheduledVisitAt: string | null;
    notes: string | null;
    status: AssignmentStatus;
    respondedAt: string | null;
    rejectionReason: string | null;
    withdrawnReason: string | null;
  }>;
  quotation: MaintenanceQuotation | null;
  paymentStatus: "unpaid" | "partially_paid" | "paid";
  payments: Array<{ id: string; amount: number; method: string; reference: string | null; note: string | null; recordedAt: string }>;
  workNotes: MaintenanceWorkNote[];
  completionReport: CompletionReport | null;
  timeline: MaintenanceTimelineEvent[];
  feedback: { rating: number; comment?: string; createdAt: string } | null;
  complaints: MaintenanceComplaint[];
  cancellationReason: string | null;
  completedAt: string | null;
  allowedStatusTargets: MaintenanceStatus[];
  canAssign: boolean;
  canEditQuotation: boolean;
}

export interface TechnicianSummary {
  id: string;
  name: string;
  email?: string;
  phone: string | null;
  accountStatus: string;
  categories: string[];
  categoryLabels: string[];
  skills: string[];
  serviceAreas: string[];
  city: string;
  availability: TechnicianAvailability;
  isActive: boolean;
  activeJobs: number;
  createdAt: string | null;
  areaMatch?: boolean;
  cityMatch?: boolean;
}

export interface TechnicianDetail extends TechnicianSummary {
  internalNotes: string | null;
  statusReason: string | null;
  stats: {
    totalAssignments: number;
    accepted: number;
    rejected: number;
    completed: number;
    averageRating: number | null;
    ratingsCount: number;
  };
  history: Array<{
    requestId: string;
    reference: string;
    title: string;
    categoryLabel: string;
    area: string;
    requestStatus: MaintenanceStatus;
    requestStatusLabel: string;
    isCurrent: boolean;
    assignmentStatus: AssignmentStatus;
    assignedAt: string;
    respondedAt: string | null;
    rejectionReason: string | null;
    withdrawnReason: string | null;
    rating: number | null;
  }>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
