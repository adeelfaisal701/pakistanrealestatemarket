import axios, { type AxiosInstance, type AxiosResponse } from "axios";

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

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
  (response: AxiosResponse) => response,
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
