import axios, { type AxiosInstance, type AxiosResponse } from "axios";

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

function normalizeLoopbackImageUrls(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index];
      if (typeof item === "string") {
        value[index] = normalizeLoopbackImageUrl(item);
      } else {
        normalizeLoopbackImageUrls(item, seen);
      }
    }
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      (value as Record<string, unknown>)[key] = normalizeLoopbackImageUrl(item);
    } else {
      normalizeLoopbackImageUrls(item, seen);
    }
  }
}

function normalizeLoopbackImageUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      !isLocalNetworkHost(hostname) ||
      !url.pathname.startsWith("/api/v1/properties/images/")
    ) {
      return value;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

function isLocalNetworkHost(hostname: string): boolean {
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return true;
  const octets = hostname.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }
  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
}

/**
 * Global Axios API Client instance configured with interceptors
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token if present in client storage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// A 401 from an individual API can be endpoint-specific. The auth guards
// validate the session through /users/profile before clearing persisted auth.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    normalizeLoopbackImageUrls(response.data);
    return response;
  },
  (error) => Promise.reject(error)
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(body?.message)) return body.message.join(", ");
    if (body?.message) return body.message;
    if (error.code === "ECONNABORTED") {
      return "The server took too long to respond. Please try again.";
    }
    if (!error.response) {
      return `Unable to reach the API at ${API_BASE_URL}. Confirm the backend is running and the API proxy is configured correctly.`;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default apiClient;
