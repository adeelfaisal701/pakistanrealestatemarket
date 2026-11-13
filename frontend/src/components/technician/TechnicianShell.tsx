"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { Bell, BriefcaseBusiness, History, House, LogOut, ShieldAlert, UserRound } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface TechnicianProfile {
  id: string;
  name: string;
  availability: string;
  categories: string[];
}

type AccessState =
  | { status: "checking" }
  | { status: "allowed"; profile: TechnicianProfile }
  | { status: "denied"; message: string }
  | { status: "error"; message: string };

const NAV = [
  { href: "/technician", label: "Home", icon: House, match: (path: string) => path === "/technician" },
  { href: "/technician/jobs", label: "Jobs", icon: BriefcaseBusiness, match: (path: string) => path.startsWith("/technician/jobs") },
  { href: "/technician/history", label: "History", icon: History, match: (path: string) => path.startsWith("/technician/history") },
  { href: "/technician/profile", label: "Profile", icon: UserRound, match: (path: string) => path.startsWith("/technician/profile") },
];

const AVAILABILITY_STYLES: Record<string, string> = {
  available: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30",
  busy: "bg-amber-400/15 text-amber-200 ring-amber-300/30",
  unavailable: "bg-slate-400/15 text-slate-200 ring-slate-300/30",
  on_leave: "bg-indigo-400/15 text-indigo-200 ring-indigo-300/30",
};

/**
 * Client-side gate and app chrome for the technician console. This is a UX
 * convenience only; every technician API is independently protected by
 * backend role and assignment checks.
 */
export function TechnicianShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [access, setAccess] = useState<AccessState>({ status: "checking" });

  const check = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace(`/property-care/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    setAccess({ status: "checking" });
    try {
      const profile = await apiClient.get<ApiEnvelope<{ role: string }>>("/users/profile");
      if (profile.data.data.role !== "technician") {
        setAccess({ status: "denied", message: `This account has the ${profile.data.data.role} role. The technician console is only for Ghar Safar technicians.` });
        return;
      }
      const { data } = await apiClient.get<ApiEnvelope<TechnicianProfile>>("/maintenance/technician/profile");
      setAccess({ status: "allowed", profile: data.data });
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        router.replace(`/property-care/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      if (axios.isAxiosError(requestError) && requestError.response?.status === 403) {
        setAccess({ status: "denied", message: getApiErrorMessage(requestError) });
        return;
      }
      setAccess({ status: "error", message: getApiErrorMessage(requestError) });
    }
  }, [pathname, router]);

  useEffect(() => {
    void check();
  }, [attempt, check]);

  const signOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("estatepro:auth-changed"));
    window.location.assign("/property-care/login");
  };

  if (access.status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f9ff] px-4">
        <p role="status" className="flex items-center gap-3 text-sm font-semibold text-[#64748b]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1660d0] border-t-transparent" aria-hidden="true" />
          Verifying technician access…
        </p>
      </main>
    );
  }
  if (access.status !== "allowed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f9ff] px-4 py-12">
        <section className="w-full max-w-md rounded-3xl border border-[#e2e9f3] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,39,71,0.08)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert className="h-7 w-7" /></span>
          <h1 className="mt-4 text-xl font-black text-[#0f2747]">{access.status === "denied" ? "Technician access required" : "Could not verify access"}</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-[#64748b]">{access.message}</p>
          <div className="mt-6 flex flex-col gap-2">
            {access.status === "error" && (
              <button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-12 rounded-2xl bg-[#1660d0] px-5 text-sm font-bold text-white">Retry</button>
            )}
            <button type="button" onClick={signOut} className="min-h-12 rounded-2xl border border-[#d2ddec] px-5 text-sm font-bold text-[#1660d0]">Sign out</button>
          </div>
        </section>
      </main>
    );
  }

  return <TechnicianChrome profile={access.profile} pathname={pathname} onSignOut={signOut}>{children}</TechnicianChrome>;
}

/** Presentational chrome — shared by the real shell and the dev-only UI preview. */
export function TechnicianChrome({
  profile,
  pathname,
  onSignOut,
  children,
}: {
  profile: { name: string; availability: string };
  pathname: string;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const initials = profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="min-h-screen bg-[#f5f9ff] text-[#0f2747]">
      <header className="sticky top-0 z-30 bg-[#0b2c5f] text-white shadow-[0_6px_20px_rgba(11,37,69,0.25)]">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/technician" className="flex items-center gap-2.5">
            <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={36} height={35} className="h-8 w-8 rounded-lg bg-white/95 object-contain p-0.5" />
            <span className="leading-tight">
              <span className="block text-sm font-black">Ghar Safar</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9fc3f5]">Technician</span>
            </span>
          </Link>
          <nav aria-label="Technician sections" className="ml-6 hidden items-center gap-1 sm:flex">
            {NAV.map(({ href, label, match }) => (
              <Link key={href} href={href} aria-current={match(pathname) ? "page" : undefined} className={cn("rounded-xl px-3 py-2 text-sm font-bold transition", match(pathname) ? "bg-white/15 text-white" : "text-white/70 hover:text-white")}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <span className={cn("hidden rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset min-[380px]:inline-flex", AVAILABILITY_STYLES[profile.availability] ?? AVAILABILITY_STYLES.unavailable)}>
              {profile.availability.replace("_", " ")}
            </span>
            <Link href="/technician/updates" aria-label="Notifications" className={cn("flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10", pathname.startsWith("/technician/updates") ? "bg-white/15 text-white" : "text-white/80")}>
              <Bell className="h-4 w-4" />
            </Link>
            <Link href="/technician/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-black" title={profile.name}>{initials}</Link>
            <button type="button" onClick={onSignOut} aria-label="Sign out" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-32 pt-5 sm:px-6 sm:pb-10 sm:pt-7">{children}</main>

      <nav aria-label="Technician navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2e9f3] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,39,71,0.08)] backdrop-blur sm:hidden">
        <div className="grid h-16 grid-cols-4">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition", active ? "text-[#1660d0]" : "text-[#94a3b8]")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-[#eaf2fe]")}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
