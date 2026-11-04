import apiClient, { type ApiEnvelope } from "@/lib/api-client";
import {
  normalizePublicProperty,
  type MarketplaceProperty,
  type PublicPropertyRecord,
} from "@/types/marketplace";

export async function fetchPublicProperties(
  params: Record<string, string | number | undefined> = {},
): Promise<MarketplaceProperty[]> {
  const response = await apiClient.get<ApiEnvelope<PublicPropertyRecord[]>>(
    "/properties",
    { params },
  );
  return response.data.data.map(normalizePublicProperty);
}

export async function fetchPublicProperty(
  propertyId: string,
): Promise<MarketplaceProperty> {
  const response = await apiClient.get<ApiEnvelope<PublicPropertyRecord>>(
    `/properties/${encodeURIComponent(propertyId)}`,
  );
  return normalizePublicProperty(response.data.data);
}
