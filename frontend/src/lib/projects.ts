import { apiClient, type ApiEnvelope } from '@/lib/api-client';
import type {
  DevelopmentProject,
  DevelopmentProjectPayload,
} from '@/types/development-project';

async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export function getFeaturedProjects(): Promise<DevelopmentProject[]> {
  return unwrap(apiClient.get<ApiEnvelope<DevelopmentProject[]>>('/projects/featured'));
}

export function getPublishedProjects(): Promise<DevelopmentProject[]> {
  return unwrap(apiClient.get<ApiEnvelope<DevelopmentProject[]>>('/projects'));
}

/** Published projects for the landing-page carousels, featured ones first (stable otherwise). */
export function getLandingProjects(): Promise<DevelopmentProject[]> {
  return getPublishedProjects().then((results) =>
    [...results].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)),
  );
}

export function getPublishedProject(slug: string): Promise<DevelopmentProject> {
  return unwrap(
    apiClient.get<ApiEnvelope<DevelopmentProject>>(
      `/projects/${encodeURIComponent(slug)}`,
    ),
  );
}

export function getAdminProjects(): Promise<DevelopmentProject[]> {
  return unwrap(
    apiClient.get<ApiEnvelope<DevelopmentProject[]>>('/admin/projects'),
  );
}

export function getAdminProject(id: string): Promise<DevelopmentProject> {
  return unwrap(
    apiClient.get<ApiEnvelope<DevelopmentProject>>(
      `/admin/projects/${encodeURIComponent(id)}`,
    ),
  );
}

export function saveAdminProject(
  payload: DevelopmentProjectPayload,
  files: {
    cover?: File;
    gallery: File[];
    paymentPlanFile?: File;
  },
  id?: string,
): Promise<DevelopmentProject> {
  const formData = new FormData();
  formData.append('project', JSON.stringify(payload));
  if (files.cover) formData.append('cover', files.cover);
  files.gallery.forEach((file) => formData.append('gallery', file));
  if (files.paymentPlanFile && payload.paymentPlan.enabled) {
    formData.append('paymentPlanFile', files.paymentPlanFile);
  }
  return unwrap(
    id
      ? apiClient.patch<ApiEnvelope<DevelopmentProject>>(
          `/admin/projects/${encodeURIComponent(id)}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
      : apiClient.post<ApiEnvelope<DevelopmentProject>>(
          '/admin/projects',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        ),
  );
}

export function deleteAdminProject(id: string): Promise<{ id: string; deleted: boolean }> {
  return unwrap(
    apiClient.delete<ApiEnvelope<{ id: string; deleted: boolean }>>(
      `/admin/projects/${encodeURIComponent(id)}`,
    ),
  );
}
