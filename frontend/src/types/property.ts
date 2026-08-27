export type PropertyType = 'House' | 'Plot' | 'Apartment' | 'Commercial';
export type PurposeType = 'Buy' | 'Rent';
export type VerificationLevel = 'Level 1' | 'Level 2' | 'Level 3';

export interface Property {
  id: string;
  title: string;
  price: string;
  location: string;
  society: string;
  beds: number;
  baths: number;
  area: string;
  type: PropertyType;
  purpose: PurposeType;
  imageUrl: string;
  freshnessBadge: string;
  verificationLevel: VerificationLevel;
  agentName: string;
  agentPhone: string;
  isFeatured?: boolean;
}
