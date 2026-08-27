export type LeadStatus = 'New' | 'Contacted' | 'Site Visit' | 'Negotiation' | 'Closed';

export type PropertyRequirement = 'Buy' | 'Rent';

export type PropertyType = 'House' | 'Plot' | 'Apartment' | 'Commercial';

export interface CRMLead {
  id: string;
  clientName: string;
  clientPhone: string;
  requirement: PropertyRequirement;
  propertyType: PropertyType;
  budgetMin: string;
  budgetMax: string;
  preferredSocieties: string[];
  status: LeadStatus;
  createdAt: string;
  notes?: string;
}

export interface AgentPropertyListing {
  id: string;
  title: string;
  price: string;
  society: string;
  area: string;
  beds: number;
  baths: number;
  status: 'Active' | 'Draft' | 'Sold' | 'Rented';
  createdAt: string;
  purpose?: PropertyRequirement;
  propertyType?: PropertyType;
  imageUrl?: string;
  description?: string;
}
