"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";
import { clearAgentDashboardData } from "@/lib/agent-session-data";
import { useAgentStore } from "@/lib/agent-store";
import { Building2, LoaderCircle } from "lucide-react";

interface Profile {
  id?: string;
  _id?: string;
  role: string;
  avatarUrl?: string | null;
  agencyAddress?: string | null;
}

type AccessState =
  | { status: "checking" }
  | { status: "allowed"; userId: string }
  | { status: "denied"; role: string }
  | { status: "error"; message: string };

export function AgentAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [access, setAccess] = useState<AccessState>({ status: "checking" });

  const checkAccess = useCallback(async () => {
    setAccess({ status: "checking" });
    const token = localStorage.getItem("auth_token");
    if (!token) {
      clearAgentDashboardData(
        localStorage,
        useAgentStore.getState().clearAccountData,
      );
      const returnTo = `${pathname}${window.location.search}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    try {
      const response = await apiClient.get<ApiEnvelope<Profile>>("/users/profile");
      const profile = response.data.data;
      const role = profile.role;
      if (role === "agent" || role === "admin") {
        if (
          role === "agent" &&
          (!profile.avatarUrl?.trim() || !profile.agencyAddress?.trim())
        ) {
          const returnTo = `${pathname}${window.location.search}`;
          router.replace(
            `/agent/profile-completion?returnTo=${encodeURIComponent(returnTo)}`,
          );
          return;
        }
        const userId =
          profile.id ??
          profile._id ??
          localStorage.getItem("auth_user") ??
          "authenticated";
        setAccess({ status: "allowed", userId });
      } else {
        clearAgentDashboardData(
          localStorage,
          useAgentStore.getState().clearAccountData,
        );
        setAccess({ status: "denied", role });
      }
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        clearAgentDashboardData(
          localStorage,
          useAgentStore.getState().clearAccountData,
        );
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        window.dispatchEvent(new Event("estatepro:auth-changed"));
        const returnTo = `${pathname}${window.location.search}`;
        router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      setAccess({ status: "error", message: getApiErrorMessage(requestError) });
    }
  }, [pathname, router]);

  useEffect(() => {
    void checkAccess();
    const handleAuthChange = () => {
      clearAgentDashboardData(
        localStorage,
        useAgentStore.getState().clearAccountData,
      );
      void checkAccess();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "auth_user" || event.key === "auth_token") {
        handleAuthChange();
      }
    };
    window.addEventListener("estatepro:auth-changed", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("estatepro:auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [attempt, checkAccess]);

  if (access.status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
        <section className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F2] text-[#008F68]">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-[#071B2B]">EstatePro Agent CRM</h1>
          <p role="status" className="mt-2 inline-flex items-center gap-2 text-sm text-[#64748B]">
            <LoaderCircle className="h-4 w-4 animate-spin text-[#00B889]" />
            Verifying agent account access…
          </p>
        </section>
      </main>
    );
  }

  if (access.status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Agent account required
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This account is registered as a {access.role}. Only agent accounts
            can manage listings. If you already have an agent account, sign in
            with that account. Otherwise, register as an agent or ask an
            administrator to review your account role.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login?returnTo=%2Fagent"
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Sign in as an agent
            </Link>
            <button
              type="button"
              onClick={() => {
                clearAgentDashboardData(
                  localStorage,
                  useAgentStore.getState().clearAccountData,
                );
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                window.dispatchEvent(new Event("estatepro:auth-changed"));
                router.push("/agent/register");
              }}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-500 dark:border-slate-700 dark:text-slate-200"
            >
              Sign out and register as an agent
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (access.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <section className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Could not verify your account
          </h1>
          <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
            {access.message}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return <div key={access.userId}>{children}</div>;
}
