"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  House,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  X,
} from "lucide-react";
import apiClient, { type ApiEnvelope } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface BuyerProfile {
  name: string;
}

const sections = [
  { href: "/buyer", label: "Dashboard", icon: Home },
  { href: "/buyer/saved-properties", label: "Saved Properties", icon: Heart },
  { href: "/buyer/saved-searches", label: "Saved Searches", icon: Search },
  { href: "/buyer/requirements", label: "My Requirements", icon: ClipboardList },
  { href: "/buyer/inquiries", label: "Agent Inquiries", icon: MessageCircle },
  { href: "/buyer/notifications", label: "Notifications", icon: Bell },
  { href: "/buyer/profile", label: "Profile & Preferences", icon: Settings },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "B";
}

export function BuyerNavigation() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .get<ApiEnvelope<BuyerProfile>>("/buyer/profile")
      .then(({ data }) => {
        if (active) setProfile(data.data);
      })
      .catch(() => {
        if (active) setProfileError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("estatepro:auth-changed"));
    window.location.assign("/login");
  };

  const name = profile?.name || "Buyer";
  const nav = (
    <>
      <div className="mb-7 flex items-center gap-2.5 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <House className="h-5 w-5" />
        </span>
        <span className="text-[17px] font-extrabold tracking-tight text-white">
          Estate<span className="text-emerald-400">Pro</span>
        </span>
      </div>

      <div className="mb-7 flex items-center gap-3 rounded-xl border border-[#1c304e] bg-[#0d1b31] p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3551] text-sm font-bold text-emerald-300">
          {getInitials(name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {profileError ? "Profile unavailable" : name}
          </span>
          <span className="mt-0.5 block text-xs text-[#8fa2bd]">Buyer</span>
        </span>
      </div>

      <nav aria-label="Buyer account" className="space-y-1">
        {sections.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/buyer" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20"
                  : "text-[#aebed5] hover:bg-[#12223b] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-[#aebed5] transition-colors hover:bg-[#12223b] hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </nav>

      <div className="mt-auto pt-6">
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-[#10433e] via-[#10333a] to-[#10243b] p-4">
          <House className="absolute -bottom-3 -right-2 h-16 w-16 text-emerald-300/10" />
          <p className="relative text-sm font-bold leading-5 text-white">
            Find Your Dream Home With EstatePro
          </p>
          <Link
            href="/properties"
            className="relative mt-3 inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-[#03221f] hover:bg-emerald-400"
          >
            Explore Homes <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#1c304e] bg-[#07152b] px-4 lg:hidden">
        <Link href="/buyer" className="flex items-center gap-2 text-base font-extrabold text-white">
          <House className="h-5 w-5 text-emerald-400" />
          Estate<span className="text-emerald-400">Pro</span>
        </Link>
        <button
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#273b5b] text-white"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[212px] flex-col border-r border-[#1c304e] bg-[#07152b] px-4 py-5 lg:flex">
        {nav}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside
            aria-label="Buyer navigation menu"
            className="flex h-full w-[min(300px,85vw)] flex-col border-r border-[#1c304e] bg-[#07152b] px-4 py-5 pt-20"
            onClick={(event) => event.stopPropagation()}
          >
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
