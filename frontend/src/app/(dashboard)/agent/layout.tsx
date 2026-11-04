import React from "react";
import { AgentSidebar } from "@/components/crm/AgentSidebar";
import { AgentTopBar } from "@/components/crm/AgentTopBar";
import { AgentStoreHydrator } from "@/components/crm/AgentStoreHydrator";
import { AgentAccessGuard } from "@/components/crm/AgentAccessGuard";
import { AgentDashboardDataLoader } from "@/components/crm/AgentDashboardDataLoader";

export const metadata = {
  title: "Agent CRM & Dashboard | EstatePro Lahore",
  description: "Manage your ads, leads, calls and WhatsApp inquiries.",
};

export default function AgentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentAccessGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Clears legacy local storage and scopes transient data to this account. */}
        <AgentStoreHydrator />
        <AgentDashboardDataLoader />

        {/* Sidebar (desktop) + header and bottom nav (mobile) */}
        <AgentSidebar />

        {/* Main Agent Area */}
        <div className="flex-1 lg:pl-72 flex flex-col pb-20 lg:pb-8">
          <AgentTopBar />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AgentAccessGuard>
  );
}
