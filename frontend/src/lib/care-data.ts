"use client";

/**
 * Read-only data hooks for the Property Care dashboards. They only call
 * EXISTING Property Care endpoints (no new APIs). Aggregate views that have
 * no dedicated endpoint yet (payments, passport, complaints) are derived
 * from the existing list + detail endpoints with a bounded number of calls.
 */
import { useCallback, useEffect, useState } from "react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import type {
  AdminMaintenanceRequest,
  CustomerMaintenanceRequest,
  MaintenanceListItem,
  Paginated,
} from "@/types/maintenance";

export const DETAIL_FETCH_CAP = 20;

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    run()
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [run, attempt]);
  return { data, loading, error, reload: () => setAttempt((value) => value + 1) };
}

/** All of the signed-in customer's requests (latest 50). */
export function useCustomerRequests() {
  return useAsync(async () => {
    const { data } = await apiClient.get<ApiEnvelope<Paginated<MaintenanceListItem>>>("/maintenance/requests", {
      params: { scope: "all", page: 1, limit: 50 },
    });
    return data.data;
  }, []);
}

/** Customer request details for a filtered subset (bounded to DETAIL_FETCH_CAP calls). */
export function useCustomerRequestDetails(filter: (item: MaintenanceListItem) => boolean, key: string) {
  return useAsync(async () => {
    const { data } = await apiClient.get<ApiEnvelope<Paginated<MaintenanceListItem>>>("/maintenance/requests", {
      params: { scope: "all", page: 1, limit: 50 },
    });
    const selected = data.data.items.filter(filter);
    const details = await Promise.all(
      selected.slice(0, DETAIL_FETCH_CAP).map((item) =>
        apiClient
          .get<ApiEnvelope<CustomerMaintenanceRequest>>(`/maintenance/requests/${encodeURIComponent(item.id)}`)
          .then((response) => response.data.data),
      ),
    );
    return { details, total: selected.length, truncated: selected.length > DETAIL_FETCH_CAP };
  }, [key]);
}

/** Admin request list with optional filters (max 100 per page, existing endpoint). */
export function useAdminRequests(params: Record<string, string | number | undefined>, key: string) {
  return useAsync(async () => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== "" && value !== "all"));
    const { data } = await apiClient.get<ApiEnvelope<Paginated<MaintenanceListItem>>>("/admin/maintenance/requests", { params: clean });
    return data.data;
  }, [key]);
}

/** Admin request details for a filtered list (bounded). */
export function useAdminRequestDetails(
  params: Record<string, string | number | undefined>,
  key: string,
  filter: (item: MaintenanceListItem) => boolean = () => true,
) {
  return useAsync(async () => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== "" && value !== "all"));
    const { data } = await apiClient.get<ApiEnvelope<Paginated<MaintenanceListItem>>>("/admin/maintenance/requests", {
      params: { limit: 100, ...clean },
    });
    const items = data.data.items.filter(filter);
    const details = await Promise.all(
      items.slice(0, DETAIL_FETCH_CAP).map((item) =>
        apiClient
          .get<ApiEnvelope<AdminMaintenanceRequest>>(`/admin/maintenance/requests/${encodeURIComponent(item.id)}`)
          .then((response) => response.data.data),
      ),
    );
    return { details, total: data.data.total, truncated: items.length > DETAIL_FETCH_CAP };
  }, [key]);
}

export function useApiGet<T>(url: string | null, params?: Record<string, string | number | undefined>, key = "") {
  return useAsync(async () => {
    if (!url) return null as T;
    const { data } = await apiClient.get<ApiEnvelope<T>>(url, { params });
    return data.data;
  }, [url, key]);
}

/** Group list items by day for trend charts (last `days` days). */
export function dailyTrend(items: Array<{ createdAt: string }>, days = 14) {
  const buckets: Array<{ label: string; value: number; key: string }> = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    buckets.push({ key: date.toDateString(), label: date.toLocaleDateString("en-PK", { day: "numeric", month: "short" }), value: 0 });
  }
  for (const item of items) {
    const key = new Date(item.createdAt).toDateString();
    const bucket = buckets.find((entry) => entry.key === key);
    if (bucket) bucket.value += 1;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

export function countBy<T>(items: T[], keyOf: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}
