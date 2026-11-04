"use client";

import { useEffect, useState } from "react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  DEFAULT_AGENT_IDENTITY,
  mapAgentIdentity,
  type AgentIdentity,
  type AgentProfile,
} from "@/lib/agent-identity";

interface AgentIdentityState extends AgentIdentity {
  error: string | null;
}

export function useAgentIdentity(): AgentIdentityState {
  const [identity, setIdentity] = useState<AgentIdentityState>({
    ...DEFAULT_AGENT_IDENTITY,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let requestId = 0;
    const updateIdentity = async () => {
      const currentRequestId = ++requestId;
      setIdentity({ ...DEFAULT_AGENT_IDENTITY, error: null });
      try {
        const response = await apiClient.get<ApiEnvelope<AgentProfile>>("/users/profile");
        if (active && currentRequestId === requestId) {
          setIdentity({ ...mapAgentIdentity(response.data.data), error: null });
        }
      } catch (requestError) {
        if (active && currentRequestId === requestId) {
          setIdentity({
            ...DEFAULT_AGENT_IDENTITY,
            error: getApiErrorMessage(requestError),
          });
        }
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "auth_user" || event.key === "auth_token") {
        void updateIdentity();
      }
    };

    void updateIdentity();
    window.addEventListener("estatepro:auth-changed", updateIdentity);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      requestId += 1;
      window.removeEventListener("estatepro:auth-changed", updateIdentity);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return identity;
}
