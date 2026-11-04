/**
 * Pakistan Real Estate Marketplace & Agent CRM - Core TypeScript Types
 */

export type UserRole = "buyer" | "agent" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  agencyName?: string;
  city?: string;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PropertyType = "House" | "Flat" | "Upper Portion" | "Lower Portion" | "Plot" | "Commercial";
export type PropertyPurpose = "Sale" | "Rent";
export type AreaUnit = "Marla" | "Kanal" | "SqFt" | "SqYd";
export type PropertyStatus = "draft" | "pending_approval" | "published" | "sold" | "rejected";

export interface PropertyLocation {
  city: string; // Lahore, Karachi, Islamabad, Rawalpindi, etc.
  area: string; // DHA Phase 6, Bahria Town, Gulberg, etc.
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyFeatures {
  bedrooms?: number;
  bathrooms?: number;
  servantQuarter?: boolean;
  parkingSpaces?: number;
  furnished?: boolean;
  electricityMeter?: boolean;
  gasConnection?: boolean;
  waterSupply?: boolean;
  rooms?: Record<string, number>;
  outdoor?: Record<string, number>;
  interior?: string[];
  furnishing?: "Furnished" | "Semi-furnished" | "Unfurnished";
  community?: string[];
  nearby?: string[];
}

export interface Property {
  id: string;
  title: string;
  description: string;
  purpose: PropertyPurpose;
  propertyType: PropertyType;
  price: number; // in PKR
  areaSize: number;
  areaUnit: AreaUnit;
  location: PropertyLocation;
  features?: PropertyFeatures;
  images: string[];
  agentId: string;
  agent?: User;
  status: PropertyStatus;
  isFeatured?: boolean;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = "new" | "contacted" | "site_visit_scheduled" | "negotiation" | "closed_won" | "lost";
export type LeadSource = "marketplace" | "direct_whatsapp" | "phone_call" | "referral";

export interface Lead {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  propertyId?: string;
  propertyTitle?: string;
  agentId: string;
  status: LeadStatus;
  source: LeadSource;
  budget?: number;
  interestedCity?: string;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilterParams {
  city?: string;
  area?: string;
  purpose?: PropertyPurpose;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  areaUnit?: AreaUnit;
  bedrooms?: number;
  page?: number;
  limit?: number;
  sortBy?: "price_asc" | "price_desc" | "newest" | "featured";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}
