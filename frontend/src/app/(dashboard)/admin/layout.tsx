import React from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAccessGuard } from "@/components/admin/AdminAccessGuard";

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
    <AdminAccessGuard>
      <div className="flex min-h-screen flex-col bg-[#0a1222] text-slate-100">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 lg:pl-64">
          <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-7 xl:px-8">
            {children}
          </main>
        </div>
      </div>
    </AdminAccessGuard>
  );
}
