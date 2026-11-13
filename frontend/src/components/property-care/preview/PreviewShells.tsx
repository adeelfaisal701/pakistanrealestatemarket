"use client";

/**
 * UI PREVIEW ONLY (development). Installs the sample-data axios adapter while
 * a /property-care-preview page is mounted and restores the real adapter on
 * unmount. The route layout returns 404 in production builds.
 */
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import apiClient from "@/lib/api-client";
import { previewAdapter } from "@/lib/property-care-preview/mock-adapter";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { BuyerNavigation } from "@/components/buyer/BuyerNavigation";
import { TechnicianChrome } from "@/components/technician/TechnicianShell";

let originalAdapter: typeof apiClient.defaults.adapter | undefined;
let installCount = 0;

function installPreviewAdapter() {
  if (installCount === 0) {
    originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = previewAdapter;
  }
  installCount += 1;
}

function uninstallPreviewAdapter() {
  installCount = Math.max(0, installCount - 1);
  if (installCount === 0 && originalAdapter !== undefined) {
    apiClient.defaults.adapter = originalAdapter;
  }
}

export function PreviewProvider({ children }: { children: ReactNode }) {
  // Install synchronously before children mount so their first fetch is mocked.
  const [installed] = useState(() => {
    if (typeof window !== "undefined") installPreviewAdapter();
    return true;
  });
  useEffect(() => () => uninstallPreviewAdapter(), []);
  if (!installed) return null;
  return (
    <>
      <div role="note" className="bg-amber-400 px-4 py-1 text-center text-[11px] font-bold text-amber-950">
        UI preview · sample data only · actions disabled · not production
      </div>
      {children}
    </>
  );
}

export function BuyerPreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="buyer-shell min-h-screen bg-[#061326] text-slate-100">
      <BuyerNavigation />
      <main className="buyer-main mx-auto min-h-screen max-w-[1500px] px-4 pb-8 pt-20 sm:px-6 lg:ml-[212px] lg:px-7 lg:py-7">
        {children}
      </main>
    </div>
  );
}

export function TechnicianPreviewShell({ children }: { children: ReactNode }) {
  const pathname = usePathname().replace(/^\/property-care-preview/, "");
  return (
    <TechnicianChrome profile={{ name: "Imran Ali (sample)", availability: "available" }} pathname={pathname} onSignOut={() => undefined}>
      {children}
    </TechnicianChrome>
  );
}

export function AdminPreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a1222] text-slate-100">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 lg:pl-64">
        <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-7 xl:px-8">{children}</main>
      </div>
    </div>
  );
}
