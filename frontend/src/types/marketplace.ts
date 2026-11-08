import type { AreaUnit, PropertyPurpose, PropertyType } from "./index";

export interface PublicPropertyAgent {
  _id?: string;
  name?: string;
  phone?: string;
  agencyName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  city?: string;
}

export interface PropertyFeatureData {
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

export interface MarketplaceProperty {
  id: string;
  title: string;
  description: string;
  purpose: PropertyPurpose;
  propertyType: PropertyType;
  price: number;
  areaSize: number;
  areaUnit: AreaUnit;
  location: {
    city: string;
    area: string;
  };
  features?: PropertyFeatureData;
  images: string[];
  agent?: PublicPropertyAgent;
  status: string;
  availabilityStatus?: string;
  isFeatured?: boolean;
  viewsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicPropertyRecord extends Omit<MarketplaceProperty, "id" | "agent"> {
  _id: string;
  agentId?: string | (PublicPropertyAgent & { _id?: string });
}

export function normalizePublicProperty(
  property: PublicPropertyRecord,
): MarketplaceProperty {
  const agent =
    property.agentId && typeof property.agentId === "object"
      ? property.agentId
      : undefined;

  return {
    ...property,
    id: String(property._id),
    images: property.images ?? [],
    agent,
  };
}
