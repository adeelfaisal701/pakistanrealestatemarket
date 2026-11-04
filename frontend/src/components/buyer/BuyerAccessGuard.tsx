"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";

interface Profile {
  role: string;
}

type AccessState =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "denied"; role: string }
  | { status: "error"; message: string };

export function BuyerAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [access, setAccess] = useState<AccessState>({ status: "checking" });

  const checkAccess = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      const returnTo = `${pathname}${window.location.search}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    setAccess({ status: "checking" });
    try {
      const response = await apiClient.get<ApiEnvelope<Profile>>("/users/profile");
      const role = response.data.data.role;
      setAccess(role === "buyer" ? { status: "allowed" } : { status: "denied", role });
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        const returnTo = `${pathname}${window.location.search}`;
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      setAccess({ status: "error", message: getApiErrorMessage(requestError) });
    }
  }, [pathname, router]);

  useEffect(() => {
    void checkAccess();
  }, [attempt, checkAccess]);

  if (access.status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p role="status" className="text-sm text-slate-500">Verifying buyer account access…</p>
      </main>
    );
  }

  if (access.status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Buyer account required</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This account has the {access.role} role. Buyer account features are available to buyer accounts.
          </p>
          <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
            Sign in with a buyer account
          </Link>
        </section>
      </main>
    );
  }

  if (access.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Could not verify buyer access</h1>
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{access.message}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-6 min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
            Retry
          </button>
        </section>
      </main>
    );
  }

  return children;
}
