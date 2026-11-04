"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";

interface SavedPropertiesContextValue {
  propertyIds: Set<string>;
  loading: boolean;
  error: string;
  toggle: (propertyId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const SavedPropertiesContext = createContext<SavedPropertiesContextValue | null>(null);

function hasBuyerSession() {
  if (!localStorage.getItem("auth_token")) return false;
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") ?? "null") as {
      role?: unknown;
    } | null;
    return user?.role === "buyer";
  } catch (error) {
    console.error("Unable to read the current account role.", error);
    return false;
  }
}

export function BuyerSavedPropertiesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [propertyIds, setPropertyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!hasBuyerSession()) {
      setPropertyIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<string[]>>(
        "/buyer/saved-properties/ids",
      );
      setPropertyIds(new Set(response.data.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const handleAuthChange = () => void refresh();
    window.addEventListener("estatepro:auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("estatepro:auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [refresh]);

  const toggle = useCallback(async (propertyId: string) => {
    if (!hasBuyerSession()) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }

    const wasSaved = propertyIds.has(propertyId);
    setError("");
    setPropertyIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });

    try {
      if (wasSaved) {
        await apiClient.delete(`/buyer/saved-properties/${encodeURIComponent(propertyId)}`);
      } else {
        await apiClient.post("/buyer/saved-properties", { propertyId });
      }
      return true;
    } catch (requestError) {
      setPropertyIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });
      setError(
        getApiErrorMessage(requestError),
      );
      return false;
    }
  }, [propertyIds]);

  const value = useMemo(
    () => ({ propertyIds, loading, error, toggle, refresh }),
    [propertyIds, loading, error, toggle, refresh],
  );

  return (
    <SavedPropertiesContext.Provider value={value}>
      {error && (
        <p role="alert" className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-100 shadow-xl">
          {error}
        </p>
      )}
      {children}
    </SavedPropertiesContext.Provider>
  );
}

export function useBuyerSavedProperties() {
  const context = useContext(SavedPropertiesContext);
  if (!context) {
    throw new Error("useBuyerSavedProperties must be used within its provider.");
  }
  return context;
}
