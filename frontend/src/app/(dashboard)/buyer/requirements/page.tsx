import { Suspense } from "react";
import { BuyerRequirementsManager } from "@/components/buyer/BuyerRequirementsManager";

export const metadata = {
  title: "My Requirements | Ghar Safar",
  description: "Create and manage your property requirements and review agent offers.",
};

export default function BuyerRequirementsPage() {
  return (
    <Suspense fallback={<p role="status" className="text-sm text-slate-500">Loading requirements…</p>}>
      <BuyerRequirementsManager />
    </Suspense>
  );
}
