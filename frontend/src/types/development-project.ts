export type DevelopmentProjectStatus =
  | 'Coming Soon'
  | 'Launched'
  | 'Available'
  | 'Completed';

export interface ProjectPaymentMilestone {
  title: string;
  amount: number;
  dueAfter?: string;
}

export interface ProjectPaymentPlan {
  enabled: boolean;
  title?: string;
  totalPrice?: number;
  bookingAmount?: number;
  confirmationAmount?: number;
  downPaymentAmount?: number;
  downPaymentPercentage?: number;
  installmentDuration?: string;
  installmentFrequency?: string;
  milestones: ProjectPaymentMilestone[];
  possessionAmount?: number;
  notes?: string;
  documentUrl?: string;
}

export interface DevelopmentProject {
  id: string;
  name: string;
  developer: string;
  slug: string;
  shortDescription: string;
  description: string;
  location: string;
  projectType: string;
  categories: string[];
  priceRange?: string;
  status: DevelopmentProjectStatus;
  coverImage?: string;
  gallery: string[];
  amenities: string[];
  additionalInformation: Record<string, string>;
  paymentPlan: ProjectPaymentPlan;
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type DevelopmentProjectPayload = Omit<
  DevelopmentProject,
  'id' | 'createdAt' | 'updatedAt'
>;
