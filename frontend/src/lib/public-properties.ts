import apiClient, { type ApiEnvelope } from "@/lib/api-client";
import {
  normalizePublicProperty,
  type MarketplaceProperty,
  type PublicPropertyRecord,
} from "@/types/marketplace";
import type { PaginationMeta } from "@/types";

export interface PublicPropertiesPage {
  properties: MarketplaceProperty[];
  pagination: PaginationMeta;
}

export async function fetchPublicProperties(
  params: Record<string, string | number | undefined> = {},
): Promise<MarketplaceProperty[]> {
  const response = await apiClient.get<ApiEnvelope<PublicPropertyRecord[]>>(
    "/properties",
    { params },
  );
  return response.data.data.map(normalizePublicProperty);
}

export async function fetchPublicPropertiesPage(
  params: Record<string, string | number | undefined> = {},
): Promise<PublicPropertiesPage> {
  const response = await apiClient.get<
    ApiEnvelope<PublicPropertyRecord[]> & { meta?: PaginationMeta }
  >("/properties", { params });
  if (!response.data.meta) {
    throw new Error("The property search response did not include pagination details.");
  }
  return {
    properties: response.data.data.map(normalizePublicProperty),
    pagination: response.data.meta,
  };
}

export async function fetchPublicProperty(
  propertyId: string,
): Promise<MarketplaceProperty> {
  const response = await apiClient.get<ApiEnvelope<PublicPropertyRecord>>(
    `/properties/${encodeURIComponent(propertyId)}`,
  );
  return normalizePublicProperty(response.data.data);
}
