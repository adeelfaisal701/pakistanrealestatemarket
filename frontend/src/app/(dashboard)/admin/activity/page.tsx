import { AdminActivityLog } from "@/components/admin/AdminActivityLog";

export const metadata = {
  title: "Admin Activity Log | Ghar Safar",
  description: "Search the persistent audit trail of admin moderation actions.",
};

export default function AdminActivityPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs text-slate-400">
          Dashboard <span className="px-1.5 text-slate-600">/</span> Activity Log
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Activity Log</h1>
        <p className="mt-1 text-sm text-slate-400">Persistent, admin-only audit records for sensitive platform actions.</p>
      </header>
      <AdminActivityLog />
    </div>
  );
}
