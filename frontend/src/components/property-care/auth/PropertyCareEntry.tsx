"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import apiClient, { type ApiEnvelope } from "@/lib/api-client";
import { clearSession, destinationForRole, hasStoredSession } from "@/lib/property-care-auth";

/**
 * Sends signed-in customers to /care, technicians to /technician and admins
 * to /care-ops, based on the backend-verified role. Everyone else sees the
 * public Property Care landing page.
 */
export function PropertyCareEntry() {
  const router = useRouter();
  useEffect(() => {
    if (!hasStoredSession()) {
      router.replace("/maintenance");
      return;
    }
    apiClient
      .get<ApiEnvelope<{ role: string }>>("/users/profile")
      .then(({ data }) => router.replace(destinationForRole(data.data.role) ?? "/maintenance"))
      .catch(() => {
        clearSession();
        router.replace("/maintenance");
      });
  }, [router]);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f8fd]">
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-[#5b6b82]"><Loader2 className="h-4 w-4 animate-spin" /> Opening Property Care…</p>
    </main>
  );
}
