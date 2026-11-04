"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAgentStore } from "@/lib/agent-store";
import {
  getAgentAccountId,
  synchronizeAgentDashboardAccount,
} from "@/lib/agent-session-data";

export function AgentStoreHydrator() {
  const accountId = useRef<string | null>(null);
  const clearAccountData = useAgentStore((state) => state.clearAccountData);

  const synchronizeAccount = useCallback(() => {
    const nextAccountId = getAgentAccountId(
      localStorage.getItem("auth_user"),
    );
    accountId.current = synchronizeAgentDashboardAccount(
      localStorage,
      accountId.current,
      nextAccountId,
      clearAccountData,
    );
  }, [clearAccountData]);

  useEffect(() => {
    synchronizeAccount();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "auth_user" || event.key === "auth_token") {
        synchronizeAccount();
      }
    };

    window.addEventListener("estatepro:auth-changed", synchronizeAccount);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("estatepro:auth-changed", synchronizeAccount);
      window.removeEventListener("storage", handleStorage);
    };
  }, [synchronizeAccount]);

  return null;
}
