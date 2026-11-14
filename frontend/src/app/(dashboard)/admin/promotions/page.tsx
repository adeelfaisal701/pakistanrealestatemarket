import { AdminPromotionsManager } from "@/components/admin/promotions/AdminPromotionsManager";

export const metadata = {
  title: "Sponsored Campaigns | Ghar Safar Admin",
  description: "Manage sponsored banner and video campaigns, placements, schedules and performance.",
};

export default function AdminPromotionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs text-slate-400">
          Dashboard <span className="px-1.5 text-slate-600">/</span> Sponsored Campaigns
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Sponsored Campaigns</h1>
        <p className="mt-1 text-sm text-slate-400">
          Advertiser banners and videos shown across the marketplace — separate from agents&apos; property advertisements.
        </p>
      </header>
      <AdminPromotionsManager />
    </div>
  );
}
