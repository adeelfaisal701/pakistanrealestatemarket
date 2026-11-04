"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";

const MAIN_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface Profile {
  role: string;
}

type AccessState =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "denied"; role: string }
  | { status: "error"; message: string };

export function AdminAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [access, setAccess] = useState<AccessState>({ status: "checking" });

  const checkAccess = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    setAccess({ status: "checking" });
    try {
      const response = await apiClient.get<ApiEnvelope<Profile>>("/users/profile");
      const role = response.data.data.role;
      setAccess(role === "admin" ? { status: "allowed" } : { status: "denied", role });
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <p role="status" className="text-sm text-slate-400">Verifying administrator access…</p>
      </main>
    );
  }

  if (access.status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
        <section className="max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h1 className="text-xl font-bold">Administrator access required</h1>
          <p className="mt-2 text-sm text-slate-400">
            This account has the {access.role} role. Admin tools are available only to authorized administrators.
          </p>
          <Link href={MAIN_SITE_URL} className="mt-6 inline-flex rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white">
            Return to marketplace
          </Link>
        </section>
      </main>
    );
  }

  if (access.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
        <section className="max-w-lg rounded-3xl border border-red-900 bg-slate-900 p-8 text-center">
          <h1 className="text-xl font-bold">Could not verify administrator access</h1>
          <p role="alert" className="mt-2 text-sm text-red-300">{access.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-6 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  return children;
}
