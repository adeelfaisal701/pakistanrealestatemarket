import apiClient, { type ApiEnvelope } from "@/lib/api-client";

export interface PublicAgent {
  id: string;
  name: string;
  phone?: string;
  agencyName?: string;
  agencyAddress?: string;
  city?: string;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface PublicAgency {
  name: string;
  agentCount: number;
  locations: string[];
  officeAddresses?: string[];
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface PublicAgencyProfile extends PublicAgency {
  agents: PublicAgent[];
  isVerified?: boolean;
  description?: string;
  agencyType?: string;
  officeAddress?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  galleryUrls?: string[];
}

export interface ManagedAgencyProfile extends PublicAgencyProfile {
  description: string;
  agencyType: string;
  officeAddress: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  coverImageUrl: string;
  galleryUrls: string[];
}

const requestCache = new Map<string, Promise<unknown>>();

function cachedGet<T>(key: string, url: string): Promise<T> {
  const cached = requestCache.get(key) as Promise<T> | undefined;
  if (cached) return cached;

  const request = apiClient
    .get<ApiEnvelope<T>>(url)
    .then((response) => response.data.data)
    .catch((error: unknown) => {
      requestCache.delete(key);
      throw error;
    });
  requestCache.set(key, request);
  return request;
}

export function fetchFeaturedAgents(): Promise<PublicAgent[]> {
  return cachedGet("featured-agents", "/users/public/featured-agents");
}

export async function fetchPublicAgents(): Promise<PublicAgent[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<PublicAgent[]>>(
      "/users/public/agents",
    );
    return response.data.data;
  } catch {
    return fetchFeaturedAgents();
  }
}

export function fetchFeaturedAgencies(): Promise<PublicAgency[]> {
  return cachedGet("featured-agencies", "/users/public/featured-agencies");
}

export async function fetchPublicAgent(id: string): Promise<PublicAgent> {
  const response = await apiClient.get<ApiEnvelope<PublicAgent>>(
    `/users/public/agents/${encodeURIComponent(id)}`,
  );
  return response.data.data;
}

export async function fetchPublicAgency(name: string): Promise<PublicAgencyProfile> {
  const response = await apiClient.get<ApiEnvelope<PublicAgencyProfile>>(
    "/agencies/public",
    { params: { name } },
  );
  return response.data.data;
}

export async function fetchManagedAgencyProfile(): Promise<ManagedAgencyProfile> {
  const response = await apiClient.get<ApiEnvelope<ManagedAgencyProfile>>(
    "/agencies/manage/profile",
  );
  return response.data.data;
}

export async function updateManagedAgencyProfile(
  formData: FormData,
): Promise<ManagedAgencyProfile> {
  const response = await apiClient.patch<ApiEnvelope<ManagedAgencyProfile>>(
    "/agencies/manage/profile",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  requestCache.delete("featured-agencies");
  return response.data.data;
}

export async function removeAgencyAgent(agentId: string): Promise<void> {
  await apiClient.delete(`/agencies/manage/agents/${encodeURIComponent(agentId)}`);
}
