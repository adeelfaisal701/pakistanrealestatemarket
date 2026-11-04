import { AdminReportsManager } from "@/components/admin/AdminReportsManager";

export const metadata = {
  title: "Reports & Complaints | EstatePro Admin",
  description: "Review public marketplace reports and record moderation resolutions.",
};

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs text-slate-400">
          Dashboard <span className="px-1.5 text-slate-600">/</span> Reports &amp; Complaints
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Reports &amp; Complaints</h1>
        <p className="mt-1 text-sm text-slate-400">Review reported properties, advertisements and agent profiles.</p>
      </header>
      <AdminReportsManager />
    </div>
  );
}
