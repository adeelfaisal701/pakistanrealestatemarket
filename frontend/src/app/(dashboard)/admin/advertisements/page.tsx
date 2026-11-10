import { AdminAdvertisementManager } from "@/components/admin/AdminAdvertisementManager";

export const metadata = {
  title: "Advertisement Management | Ghar Safar Admin",
  description: "Review and manage database-backed property advertisements.",
};

export default function AdminAdvertisementsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs text-slate-400">
          Dashboard <span className="px-1.5 text-slate-600">/</span> Advertisements
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Advertisements</h1>
        <p className="mt-1 text-sm text-slate-400">Persisted advertisement status, associated property, agent and moderation history.</p>
      </header>
      <AdminAdvertisementManager />
    </div>
  );
}
