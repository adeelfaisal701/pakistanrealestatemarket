import { AdminAgencyDirectory } from "@/components/admin/AdminAgencyDirectory";

export const metadata = {
  title: "Agency Directory | EstatePro Admin",
  description: "Review agencies associated with registered agent records.",
};

export default function AdminAgenciesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs text-slate-400">
          Dashboard <span className="px-1.5 text-slate-600">/</span> Agency Directory
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Agency Directory</h1>
        <p className="mt-1 text-sm text-slate-400">Agency affiliations derived from the canonical agent records.</p>
      </header>
      <AdminAgencyDirectory />
    </div>
  );
}
