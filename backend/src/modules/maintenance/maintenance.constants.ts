/**
 * Ghar Safar Property Care — shared domain constants and the validated job
 * status workflow. This file is intentionally free of framework/database
 * dependencies so the workflow rules can be unit tested in isolation.
 */

export const MAINTENANCE_CATEGORIES = [
  { key: 'plumbing', label: 'Plumbing', description: 'Leaks, blockages, taps, geysers and water lines.' },
  { key: 'electrical', label: 'Electrical', description: 'Wiring, sockets, breakers, lights and fans.' },
  { key: 'ac_repair', label: 'AC Repair & Maintenance', description: 'Servicing, gas refill, installation and repairs.' },
  { key: 'general_handyman', label: 'General Handyman', description: 'Fixtures, fittings, mounting and small repairs.' },
  { key: 'painting', label: 'Painting', description: 'Interior and exterior painting and touch-ups.' },
  { key: 'carpentry', label: 'Carpentry', description: 'Doors, cabinets, furniture and woodwork repairs.' },
  { key: 'water_tank_cleaning', label: 'Water Tank Cleaning', description: 'Overhead and underground tank cleaning.' },
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number]['key'];
export const MAINTENANCE_CATEGORY_KEYS = MAINTENANCE_CATEGORIES.map(
  (category) => category.key,
) as MaintenanceCategory[];

export const MAINTENANCE_PROPERTY_TYPES = [
  'house',
  'apartment',
  'portion',
  'office',
  'shop',
  'plot',
  'other',
] as const;
export type MaintenancePropertyType = (typeof MAINTENANCE_PROPERTY_TYPES)[number];

export const MAINTENANCE_TIME_SLOTS = ['morning', 'afternoon', 'evening', 'anytime'] as const;
export type MaintenanceTimeSlot = (typeof MAINTENANCE_TIME_SLOTS)[number];

export enum MaintenanceStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  ASSIGNED = 'assigned',
  AWAITING_TECHNICIAN_ACCEPTANCE = 'awaiting_technician_acceptance',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  RESCHEDULING = 'rescheduling',
  ON_THE_WAY = 'on_the_way',
  IN_PROGRESS = 'in_progress',
  AWAITING_CUSTOMER_CONFIRMATION = 'awaiting_customer_confirmation',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export const MAINTENANCE_STATUS_VALUES = Object.values(MaintenanceStatus);

export type MaintenanceActorRole = 'customer' | 'technician' | 'admin' | 'system';

/**
 * Normal lifecycle transitions. Every status change in the service layer is
 * checked against this map (plus the actor-specific rules below).
 */
export const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.PENDING]: [MaintenanceStatus.UNDER_REVIEW, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.UNDER_REVIEW]: [MaintenanceStatus.ASSIGNED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.ASSIGNED]: [
    MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
    MaintenanceStatus.RESCHEDULING,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE]: [
    MaintenanceStatus.ACCEPTED,
    MaintenanceStatus.REJECTED,
    MaintenanceStatus.RESCHEDULING,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.ACCEPTED]: [
    MaintenanceStatus.ON_THE_WAY,
    MaintenanceStatus.RESCHEDULING,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.REJECTED]: [MaintenanceStatus.RESCHEDULING, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.RESCHEDULING]: [MaintenanceStatus.ASSIGNED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.ON_THE_WAY]: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.RESCHEDULING],
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION],
  [MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION]: [
    MaintenanceStatus.COMPLETED,
    MaintenanceStatus.DISPUTED,
  ],
  [MaintenanceStatus.COMPLETED]: [MaintenanceStatus.DISPUTED],
  [MaintenanceStatus.DISPUTED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

/**
 * Exceptional transitions only an admin may perform, always with a reason.
 * These let operations resolve disputes, stalled visits and other edge cases.
 */
export const ADMIN_EXCEPTION_TRANSITIONS: Partial<Record<MaintenanceStatus, MaintenanceStatus[]>> = {
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.RESCHEDULING, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.ON_THE_WAY]: [MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION]: [MaintenanceStatus.IN_PROGRESS],
  [MaintenanceStatus.DISPUTED]: [
    MaintenanceStatus.RESCHEDULING,
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.COMPLETED,
    MaintenanceStatus.CANCELLED,
  ],
};

/** Statuses an admin can set directly through the generic status endpoint. */
export const ADMIN_DIRECT_STATUS_TARGETS: MaintenanceStatus[] = [
  MaintenanceStatus.UNDER_REVIEW,
  MaintenanceStatus.RESCHEDULING,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.COMPLETED,
  MaintenanceStatus.CANCELLED,
];

/** Statuses a technician can move a job to through the status endpoint. */
export const TECHNICIAN_STATUS_TARGETS: MaintenanceStatus[] = [
  MaintenanceStatus.ON_THE_WAY,
  MaintenanceStatus.IN_PROGRESS,
];

/** Statuses from which a customer may cancel their own request. */
export const CUSTOMER_CANCELLABLE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.PENDING,
  MaintenanceStatus.UNDER_REVIEW,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
  MaintenanceStatus.ACCEPTED,
  MaintenanceStatus.REJECTED,
  MaintenanceStatus.RESCHEDULING,
];

/** Statuses from which the admin may (re)assign a technician. */
export const ASSIGNABLE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.UNDER_REVIEW,
  MaintenanceStatus.RESCHEDULING,
  MaintenanceStatus.REJECTED,
  MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
  MaintenanceStatus.ACCEPTED,
  MaintenanceStatus.ON_THE_WAY,
  MaintenanceStatus.DISPUTED,
];

/** Statuses in which the assigned technician may add work notes and photos. */
export const TECHNICIAN_WORKING_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.ACCEPTED,
  MaintenanceStatus.ON_THE_WAY,
  MaintenanceStatus.IN_PROGRESS,
];

/** Jobs that still occupy a technician (used for workload and deactivation checks). */
export const TECHNICIAN_ACTIVE_JOB_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
  MaintenanceStatus.ACCEPTED,
  MaintenanceStatus.ON_THE_WAY,
  MaintenanceStatus.IN_PROGRESS,
];

/** Statuses where the quotation may still be edited or sent by an admin. */
export const QUOTATION_EDITABLE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.UNDER_REVIEW,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE,
  MaintenanceStatus.ACCEPTED,
  MaintenanceStatus.REJECTED,
  MaintenanceStatus.RESCHEDULING,
  MaintenanceStatus.ON_THE_WAY,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.DISPUTED,
];

export function isNormalTransition(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  return MAINTENANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isAdminExceptionTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): boolean {
  return ADMIN_EXCEPTION_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns whether `actor` may move a job from `from` to `to`. Assignment and
 * acceptance transitions are deliberately excluded here: those happen only
 * through their dedicated service methods, which carry extra checks.
 */
export function canTransition(
  actor: MaintenanceActorRole,
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): boolean {
  if (from === to) return false;
  switch (actor) {
    case 'admin':
      if (!ADMIN_DIRECT_STATUS_TARGETS.includes(to)) return false;
      return isNormalTransition(from, to) || isAdminExceptionTransition(from, to);
    case 'technician':
      return TECHNICIAN_STATUS_TARGETS.includes(to) && isNormalTransition(from, to);
    case 'customer':
      if (to === MaintenanceStatus.CANCELLED) {
        return CUSTOMER_CANCELLABLE_STATUSES.includes(from);
      }
      if (to === MaintenanceStatus.COMPLETED || to === MaintenanceStatus.DISPUTED) {
        return isNormalTransition(from, to);
      }
      return false;
    case 'system':
      return isNormalTransition(from, to);
    default:
      return false;
  }
}

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.PENDING]: 'Pending',
  [MaintenanceStatus.UNDER_REVIEW]: 'Under Review',
  [MaintenanceStatus.ASSIGNED]: 'Assigned',
  [MaintenanceStatus.AWAITING_TECHNICIAN_ACCEPTANCE]: 'Awaiting Technician Acceptance',
  [MaintenanceStatus.ACCEPTED]: 'Accepted',
  [MaintenanceStatus.REJECTED]: 'Rejected by Technician',
  [MaintenanceStatus.RESCHEDULING]: 'Rescheduling',
  [MaintenanceStatus.ON_THE_WAY]: 'On The Way',
  [MaintenanceStatus.IN_PROGRESS]: 'In Progress',
  [MaintenanceStatus.AWAITING_CUSTOMER_CONFIRMATION]: 'Awaiting Customer Confirmation',
  [MaintenanceStatus.COMPLETED]: 'Completed',
  [MaintenanceStatus.CANCELLED]: 'Cancelled',
  [MaintenanceStatus.DISPUTED]: 'Disputed',
};

export function categoryLabel(key: string): string {
  return MAINTENANCE_CATEGORIES.find((category) => category.key === key)?.label ?? key;
}

export const DEFAULT_COMPLETION_CHECKLIST = [
  'Problem resolved and tested',
  'Work area cleaned',
  'Before and after photos uploaded',
  'Customer walked through the completed work',
];

export const MAX_PROBLEM_IMAGES = 8;
export const MAX_WORK_PHOTOS_PER_KIND = 12;
export const MAX_IMAGES_PER_UPLOAD = 6;

export enum TechnicianAvailability {
  AVAILABLE = 'available',
  BUSY = 'busy',
  UNAVAILABLE = 'unavailable',
  ON_LEAVE = 'on_leave',
}

export enum QuotationStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  COMPLETED = 'completed',
}

export enum ComplaintStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
}

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'mobile_wallet', 'other'] as const;
