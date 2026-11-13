import type { MaintenanceStatus, QuotationStatus } from "@/types/maintenance";

/** Mirrors backend MAINTENANCE_CATEGORIES (backend remains the source of truth). */
export const MAINTENANCE_CATEGORIES = [
  { key: "plumbing", label: "Plumbing", description: "Leaks, blockages, taps, geysers and water lines." },
  { key: "electrical", label: "Electrical", description: "Wiring, sockets, breakers, lights and fans." },
  { key: "ac_repair", label: "AC Repair & Maintenance", description: "Servicing, gas refill, installation and repairs." },
  { key: "general_handyman", label: "General Handyman", description: "Fixtures, fittings, mounting and small repairs." },
  { key: "painting", label: "Painting", description: "Interior and exterior painting and touch-ups." },
  { key: "carpentry", label: "Carpentry", description: "Doors, cabinets, furniture and woodwork repairs." },
  { key: "water_tank_cleaning", label: "Water Tank Cleaning", description: "Overhead and underground tank cleaning." },
] as const;

export const PROPERTY_TYPES = [
  { key: "house", label: "House" },
  { key: "apartment", label: "Apartment / Flat" },
  { key: "portion", label: "Upper / Lower Portion" },
  { key: "office", label: "Office" },
  { key: "shop", label: "Shop" },
  { key: "plot", label: "Plot" },
  { key: "other", label: "Other" },
] as const;

export const TIME_SLOTS = [
  { key: "morning", label: "Morning (9am – 12pm)" },
  { key: "afternoon", label: "Afternoon (12pm – 4pm)" },
  { key: "evening", label: "Evening (4pm – 8pm)" },
  { key: "anytime", label: "Any time" },
] as const;

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  assigned: "Assigned",
  awaiting_technician_acceptance: "Awaiting Technician",
  accepted: "Technician Confirmed",
  rejected: "Reassigning",
  rescheduling: "Rescheduling",
  on_the_way: "On The Way",
  in_progress: "In Progress",
  awaiting_customer_confirmation: "Awaiting Your Confirmation",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

/** Admin/technician-facing labels (more operational wording). */
export const OPS_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  ...STATUS_LABELS,
  awaiting_technician_acceptance: "Awaiting Technician Acceptance",
  accepted: "Accepted",
  rejected: "Rejected by Technician",
  awaiting_customer_confirmation: "Awaiting Customer Confirmation",
};

type Tone = "slate" | "amber" | "blue" | "indigo" | "emerald" | "rose" | "violet" | "sky";

export const STATUS_TONES: Record<MaintenanceStatus, Tone> = {
  pending: "amber",
  under_review: "sky",
  assigned: "indigo",
  awaiting_technician_acceptance: "indigo",
  accepted: "blue",
  rejected: "rose",
  rescheduling: "amber",
  on_the_way: "violet",
  in_progress: "violet",
  awaiting_customer_confirmation: "sky",
  completed: "emerald",
  cancelled: "slate",
  disputed: "rose",
};

export const TONE_CLASSES: Record<Tone, string> = {
  slate: "bg-slate-500/15 text-slate-600 ring-slate-500/30",
  amber: "bg-amber-500/15 text-amber-700 ring-amber-500/30",
  blue: "bg-blue-500/15 text-blue-700 ring-blue-500/30",
  indigo: "bg-indigo-500/15 text-indigo-700 ring-indigo-500/30",
  emerald: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30",
  rose: "bg-rose-500/15 text-rose-700 ring-rose-500/30",
  violet: "bg-violet-500/15 text-violet-700 ring-violet-500/30",
  sky: "bg-sky-500/15 text-sky-700 ring-sky-500/30",
};

/** Dark-surface variants for the admin and technician consoles. */
export const DARK_TONE_CLASSES: Record<Tone, string> = {
  slate: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  blue: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  indigo: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  rose: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  violet: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  sky: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
};

export const QUOTATION_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Awaiting customer approval",
  approved: "Approved",
  rejected: "Rejected",
};

/** Customer-facing progress steps (exceptional states map onto the nearest step). */
export const CUSTOMER_PROGRESS_STEPS = [
  { key: "submitted", label: "Submitted", statuses: ["pending"] },
  { key: "review", label: "Under review", statuses: ["under_review"] },
  { key: "dispatch", label: "Technician assigned", statuses: ["assigned", "awaiting_technician_acceptance", "rejected", "rescheduling", "accepted"] },
  { key: "visit", label: "Visit & work", statuses: ["on_the_way", "in_progress"] },
  { key: "confirm", label: "Your confirmation", statuses: ["awaiting_customer_confirmation", "disputed"] },
  { key: "done", label: "Completed", statuses: ["completed"] },
] as const;

export function progressIndex(status: MaintenanceStatus): number {
  return CUSTOMER_PROGRESS_STEPS.findIndex((step) => (step.statuses as readonly string[]).includes(status));
}

export function categoryLabel(key: string): string {
  return MAINTENANCE_CATEGORIES.find((category) => category.key === key)?.label ?? key;
}

export function formatDate(value?: string | null, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function formatMoney(value?: number | null): string {
  if (value == null) return "—";
  return `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value)}`;
}

export function timeSlotLabel(key?: string): string {
  return TIME_SLOTS.find((slot) => slot.key === key)?.label ?? "Any time";
}

export function eventLabel(event: string): string {
  const labels: Record<string, string> = {
    request_submitted: "Request submitted",
    status_changed: "Status updated",
    problem_photos_added: "Problem photos added",
    before_photos_added: "Before-work photos added",
    after_photos_added: "After-work photos added",
    technician_assigned: "Technician assigned",
    technician_reassigned: "Technician reassigned",
    quotation_saved: "Quotation saved",
    quotation_sent: "Quotation sent for approval",
    quotation_revised: "Quotation revised",
    quotation_approved: "Quotation approved",
    quotation_rejected: "Quotation rejected",
    payment_recorded: "Payment recorded",
    feedback_submitted: "Feedback submitted",
    complaint_raised: "Complaint raised",
    complaint_updated: "Complaint updated",
  };
  return labels[event] ?? event.replace(/_/g, " ");
}

export const MAX_UPLOAD_FILES = 6;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Client-side pre-check; the backend re-validates content, size and count. */
export function validateImageFiles(files: File[], remaining: number): string | null {
  if (!files.length) return "Select at least one image.";
  if (files.length > Math.min(MAX_UPLOAD_FILES, remaining)) {
    return `You can upload up to ${Math.min(MAX_UPLOAD_FILES, remaining)} more image(s).`;
  }
  const invalid = files.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
  if (invalid) return `${invalid.name} is not a JPEG, PNG or WebP image.`;
  const large = files.find((file) => file.size > MAX_UPLOAD_BYTES);
  if (large) return `${large.name} is larger than 10 MB.`;
  return null;
}
