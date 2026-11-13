"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/maintenance", label: "Overview & Requests", match: (path: string) => path === "/admin/maintenance" || path.startsWith("/admin/maintenance/requests") },
  { href: "/admin/maintenance/technicians", label: "Technicians", match: (path: string) => path.startsWith("/admin/maintenance/technicians") },
];

export function AdminMaintenanceTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Property Care sections" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-1">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition",
              active ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
