"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  ClipboardList,
  ChevronRight,
  ExternalLink,
  Gavel,
  Home,
  LayoutDashboard,
  Landmark,
  Menu,
  Megaphone,
  MessageSquareWarning,
  Search,
  Shield,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const navigation = [
  {
    name: "Overview & Analytics",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Platform insights",
  },
  {
    name: "Agent Approvals",
    href: "/admin/agents",
    icon: Users,
    description: "Verify local brokers",
  },
  {
    name: "Buyer Accounts",
    href: "/admin/buyers",
    icon: Users,
    description: "Manage buyer access and records",
  },
  {
    name: "Property Moderation",
    href: "/admin/properties",
    icon: Gavel,
    description: "Approve or hide listings",
  },
  {
    name: "Project Management",
    href: "/admin/projects",
    icon: Landmark,
    description: "Independent development projects",
  },
  {
    name: "Client Requirements",
    href: "/admin/requirements",
    icon: ClipboardList,
    description: "Review buyer requests and offers",
  },
  {
    name: "Property Care",
    href: "/admin/maintenance",
    icon: Wrench,
    description: "Maintenance dispatch & technicians",
  },
  {
    name: "Agency Directory",
    href: "/admin/agencies",
    icon: Building2,
    description: "Registered agencies",
  },
  {
    name: "Advertisements",
    href: "/admin/advertisements",
    icon: Megaphone,
    description: "Publish, pause or remove ads",
  },
  {
    name: "Reports & Complaints",
    href: "/admin/reports",
    icon: MessageSquareWarning,
    description: "Review public reports",
  },
  {
    name: "Activity Log",
    href: "/admin/activity",
    icon: Activity,
    description: "Track admin activities",
  },
];

interface AdminIdentity {
  name: string;
  email?: string;
}

function getStoredAdmin(): AdminIdentity | null {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    const user: unknown = JSON.parse(raw);
    if (!user || typeof user !== "object" || !("name" in user)) return null;
    const name = user.name;
    const email = "email" in user ? user.email : undefined;
    if (typeof name !== "string" || !name.trim()) return null;
    return {
      name: name.trim(),
      ...(typeof email === "string" ? { email } : {}),
    };
  } catch (error) {
    console.error("Unable to read administrator identity.", error);
    return null;
  }
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isOverview = pathname === "/admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    setAdmin(getStoredAdmin());
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = globalSearch.trim();
    router.push(query ? `/admin/properties?search=${encodeURIComponent(query)}` : "/admin/properties");
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

  const renderNavigation = () => (
    <>
      <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Admin Management
      </p>
      <nav aria-label="Admin management" className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-emerald-600/25 text-white ring-1 ring-inset ring-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-emerald-600 text-white" : "text-slate-400 group-hover:text-emerald-300",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.name}</span>
                <span className={cn("mt-0.5 block truncate text-[10px]", active ? "text-emerald-200/80" : "text-slate-500")}>
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Cross Portals
      </p>
      <nav aria-label="Other portals" className="space-y-1">
        <Link
          href={`${MAIN_SITE_URL}/agent`}
          className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white"
        >
          <Users className="h-4 w-4 text-slate-400" />
          <span className="flex-1">Agent CRM Portal</span>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </Link>
        <Link
          href={MAIN_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white"
        >
          <ExternalLink className="h-4 w-4 text-slate-400" />
          <span className="flex-1">Public Marketplace</span>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </Link>
      </nav>
    </>
  );

  const initials = admin?.name
    ? admin.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "A";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800/90 bg-[#0b1426] text-slate-100 lg:flex">
        <Link href="/admin" className="flex h-[66px] shrink-0 items-center gap-3 border-b border-slate-800/90 px-5">
          <Image
            src="/images/ghar-safar-logo.png"
            unoptimized
            alt="Ghar Safar logo"
            width={40}
            height={39}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="min-w-0">
            <span className="block text-base font-extrabold tracking-tight text-white">Ghar Safar</span>
            <span className="block text-[10px] text-slate-400">Control Panel</span>
          </span>
        </Link>

        <div className="mx-5 my-3 flex justify-center">
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-300 ring-1 ring-inset ring-rose-500/20">
            Super Admin
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {renderNavigation()}
        </div>

        <div className="m-3 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Platform Control
          </div>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            Keep the marketplace safe and trustworthy.
          </p>
          <Link
            href="/admin/activity"
            className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-lg bg-emerald-700 px-3 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            View Activity Log <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      <header className={cn(
        "sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-800/90 bg-[#0b1426]/95 px-3 text-white backdrop-blur lg:ml-64 lg:px-5",
        isOverview && "max-md:min-h-[60px] max-md:border-slate-200 max-md:bg-white max-md:px-3 max-md:text-[#101D32]",
      )}>
        <button
          type="button"
          aria-label={menuOpen ? "Close admin navigation" : "Open admin navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden",
            isOverview && "max-md:order-3 max-md:ml-1 max-md:text-slate-700 max-md:hover:bg-slate-100",
          )}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link
          href="/admin"
          aria-label="Ghar Safar Admin home"
          className={cn(
            "hidden items-center gap-2",
            isOverview && "max-md:flex max-md:order-1",
          )}
        >
          <Image
            src="/images/ghar-safar-logo.png"
            unoptimized
            alt="Ghar Safar logo"
            width={40}
            height={39}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight text-[#006B45]">Ghar Safar</span>
            <span className="block text-[10px] text-slate-500">Admin Dashboard</span>
          </span>
        </Link>
        <form onSubmit={submitSearch} role="search" className={cn(
          "flex min-w-0 max-w-3xl flex-1 items-center",
          isOverview && "max-md:hidden",
        )}>
          <label className="flex h-10 w-full items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/70 px-4 text-slate-400 transition-colors focus-within:border-emerald-500/70 focus-within:bg-slate-800">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="search"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Search properties, agents, or locations..."
              aria-label="Search admin properties, agents, or locations"
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </label>
        </form>

        <div className={cn(
          "ml-auto flex shrink-0 items-center gap-2 sm:gap-3",
          isOverview && "max-md:order-2 max-md:ml-auto",
        )}>
          <span className="hidden text-right sm:block">
            <span className="block text-xs font-semibold text-slate-100">{admin?.name ?? "Admin"}</span>
            <span className="block text-[10px] text-slate-400">{admin?.email ?? "Administrator"}</span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-600/25 text-xs font-bold text-emerald-100">
            {initials}
          </span>
          <span className="hidden text-xs font-medium text-slate-300 sm:block">Admin</span>
          <Shield className="hidden h-4 w-4 text-emerald-300 sm:block" />
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/70"
          />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-slate-800 bg-[#0b1426] p-3 text-slate-100 shadow-2xl">
            <div className="flex h-12 items-center justify-between border-b border-slate-800 px-2 pb-3">
              <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
                <Image
                  src="/images/ghar-safar-logo.png"
                  unoptimized
                  alt="Ghar Safar logo"
                  width={36}
                  height={35}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <span className="text-sm font-bold">Ghar Safar Admin</span>
              </Link>
              <button
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{renderNavigation()}</div>
          </aside>
        </div>
      )}
    </>
  );
}
