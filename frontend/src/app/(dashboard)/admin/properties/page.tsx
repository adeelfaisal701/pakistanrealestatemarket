import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PropertyModerationGrid } from "@/components/admin/PropertyModerationGrid";

export const metadata = {
  title: "Property Moderation | Super Admin",
  description: "Review real property records submitted to the marketplace.",
};

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialSearch = Array.isArray(params.search)
    ? params.search[0] ?? ""
    : params.search ?? "";

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs text-slate-400">
            Dashboard <span className="px-1.5 text-slate-600">/</span> Property Moderation
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Property Moderation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Review real listings, inventory and linked advertisement status.
          </p>
        </div>
        <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 sm:self-auto">
          <ArrowLeft className="h-4 w-4" />
          Overview
        </Link>
      </header>
      <PropertyModerationGrid key={initialSearch} initialSearch={initialSearch} />
    </div>
  );
}
