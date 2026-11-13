"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AddPropertyForm } from "@/components/crm/AddPropertyForm";

type AccessState = "checking" | "agent" | "unauthorized";

export default function PostPropertyPage() {
  const router = useRouter();
  const [accessState, setAccessState] = useState<AccessState>("checking");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const user = localStorage.getItem("auth_user");
    if (!token || !user) {
      router.replace("/login?returnTo=%2Fpost-property");
      return;
    }

    try {
      const authenticatedUser: { role?: string } = JSON.parse(user);
      setAccessState(
        authenticatedUser.role === "agent" || authenticatedUser.role === "admin"
          ? "agent"
          : "unauthorized",
      );
    } catch {
      router.replace("/login?returnTo=%2Fpost-property");
    }
  }, [router]);

  if (accessState === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p role="status" className="text-sm text-slate-500">Checking account access...</p>
      </main>
    );
  }

  if (accessState === "unauthorized") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Agent account required</h1>
          <p className="mt-2 text-sm text-slate-500">
            Property posting is available to agent accounts. Sign in with an agent account or register as an agent.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login?returnTo=%2Fpost-property"
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Switch account
            </Link>
            <Link
              href="/agent/register"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-500 dark:border-slate-700 dark:text-slate-200"
            >
              Register as an agent
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:p-6">
          <div>
            <Link
              href="/agent"
              className="mb-2 inline-flex min-h-[30px] items-center gap-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
            >
              <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Back to Agent Dashboard</span>
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Post a Property
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Submit a property listing for admin review.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
              <span>Server submission · admin review required</span>
            </div>
          </div>
        </header>
        <AddPropertyForm />
      </div>
    </main>
  );
}
