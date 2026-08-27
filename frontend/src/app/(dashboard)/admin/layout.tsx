import React from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Super Admin Central | EstatePro Lahore",
  description: "Platform analytics, agent verification approvals, and property moderation dashboard.",
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Isolated Admin Sidebar & Mobile Nav */}
      <AdminSidebar pendingAgentsCount={2} pendingPropertiesCount={2} />

      {/* Main Admin Content Container */}
      <div className="flex-1 lg:pl-72 flex flex-col pb-20 lg:pb-8">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
