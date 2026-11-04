"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { useAgentStore } from "@/lib/agent-store";
import { mapAgentLead, type AgentLeadResponse } from "@/lib/agent-lead-data";

export function AgentDashboardDataLoader() {
  const replaceCrmLeads = useAgentStore((state) => state.replaceCrmLeads);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let requestId = 0;
    const loadLeads = () => {
      const accountId = localStorage.getItem("auth_user");
      const currentRequestId = ++requestId;
      setError("");

      apiClient
        .get<ApiEnvelope<AgentLeadResponse[]>>("/crm/leads")
        .then((response) => {
          if (
            active &&
            currentRequestId === requestId &&
            accountId === localStorage.getItem("auth_user")
          ) {
            replaceCrmLeads(response.data.data.map(mapAgentLead));
          }
        })
        .catch((requestError: unknown) => {
          if (
            active &&
            currentRequestId === requestId &&
            accountId === localStorage.getItem("auth_user")
          ) {
            replaceCrmLeads([]);
            setError(getApiErrorMessage(requestError));
          }
        });
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "auth_user" || event.key === "auth_token") loadLeads();
    };
    loadLeads();
    window.addEventListener("estatepro:auth-changed", loadLeads);
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      requestId += 1;
      window.removeEventListener("estatepro:auth-changed", loadLeads);
      window.removeEventListener("storage", handleStorage);
    };
  }, [replaceCrmLeads]);

  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      Could not load live leads: {error}{" "}
      <Link href="/login" className="font-semibold underline underline-offset-2">Sign in</Link>
    </p>
  );
}
