import React from "react";
import { AgentSidebar } from "@/components/crm/AgentSidebar";
import { AgentTopBar } from "@/components/crm/AgentTopBar";
import { AgentStoreHydrator } from "@/components/crm/AgentStoreHydrator";
import { AgentAccessGuard } from "@/components/crm/AgentAccessGuard";
import { AgentDashboardDataLoader } from "@/components/crm/AgentDashboardDataLoader";

export const metadata = {
  title: "Agent CRM & Dashboard | Ghar Safar",
  description: "Manage your ads, leads, calls and WhatsApp inquiries.",
};

export default function AgentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentAccessGuard>
      <div className="agent-crm-shell min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col max-md:bg-white">
        {/* Clears legacy local storage and scopes transient data to this account. */}
        <AgentStoreHydrator />
        <AgentDashboardDataLoader />

        {/* Sidebar (desktop) and menu navigation (mobile) */}
        <AgentSidebar />

        {/* Main Agent Area */}
        <div className="flex-1 lg:pl-72 flex flex-col pb-0 lg:pb-8">
          <AgentTopBar />
          <main className="agent-crm-main mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 max-md:px-3 max-md:py-4">
            {children}
          </main>
        </div>
      </div>
    </AgentAccessGuard>
  );
}
