import React from "react";
import { AgentSidebar } from "@/components/crm/AgentSidebar";

export const metadata = {
  title: "Agent CRM & Dashboard | EstatePro Lahore",
  description: "Manage buyer inquiries, property inventory, auto-matching, and 1-tap WhatsApp pitches.",
};

export default function AgentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Isolated Agent Sidebar & Mobile Nav */}
      <AgentSidebar activeInventoryCount={5} totalLeadsCount={5} />

      {/* Main Agent Area */}
      <div className="flex-1 lg:pl-72 flex flex-col pb-20 lg:pb-8">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
