"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { Loader2, ShieldAlert } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { clearSession, destinationForRole, hasStoredSession, loginHref } from "@/lib/property-care-auth";
import { pc } from "@/components/property-care/PropertyCareUI";

type State =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "denied"; role: string }
  | { status: "error"; message: string };

/**
 * Client-side gate for the customer Property Care workspace. UX only — every
 * /maintenance customer API is independently restricted to the buyer role on
 * the backend. Signed-out visitors go to the Property Care sign-in (not the
 * Real Estate login), keeping their intended destination.
 */
export function CareAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "checking" });

  const check = useCallback(async () => {
    const returnTo = `${pathname}${window.location.search}`;
    if (!hasStoredSession()) {
      router.replace(loginHref(returnTo));
      return;
    }
    setState({ status: "checking" });
    try {
      const { data } = await apiClient.get<ApiEnvelope<{ role: string }>>("/users/profile");
      const role = data.data.role;
      if (role === "buyer") {
        setState({ status: "allowed" });
        return;
      }
      const elsewhere = destinationForRole(role);
      if (elsewhere) router.replace(elsewhere);
      else setState({ status: "denied", role });
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        clearSession();
        router.replace(loginHref(returnTo));
        return;
      }
      setState({ status: "error", message: getApiErrorMessage(requestError) });
    }
  }, [pathname, router]);

  useEffect(() => {
    void check();
  }, [attempt, check]);

  if (state.status === "allowed") return <>{children}</>;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f8fd] px-4 py-12 text-[#102b55]">
      {state.status === "checking" ? (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-[#5b6b82]"><Loader2 className="h-4 w-4 animate-spin" /> Opening Property Care…</p>
      ) : (
        <section className="w-full max-w-md rounded-3xl border border-[#e3ebf5] bg-white p-8 text-center shadow-[0_10px_30px_rgba(16,43,85,0.08)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><ShieldAlert className="h-7 w-7" /></span>
          <h1 className="mt-4 text-xl font-black">{state.status === "denied" ? "Customer account required" : "Couldn't open Property Care"}</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-[#5b6b82]">
            {state.status === "denied"
              ? `You're signed in with a ${state.role} account. Property Care requests are made from a customer account.`
              : state.message}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {state.status === "error" && <button type="button" onClick={() => setAttempt((value) => value + 1)} className={pc.primaryBtn}>Retry</button>}
            {state.status === "denied" && (
              <>
                <button type="button" onClick={() => { clearSession(); router.replace(loginHref(pathname)); }} className={pc.primaryBtn}>Sign in with a customer account</button>
                <Link href="/" className={pc.secondaryBtn}>Back to Ghar Safar</Link>
              </>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
