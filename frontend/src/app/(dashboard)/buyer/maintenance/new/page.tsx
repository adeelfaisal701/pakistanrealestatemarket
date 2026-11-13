import { Suspense } from "react";
import { CustomerMaintenanceRequestForm } from "@/components/maintenance/customer/CustomerMaintenanceRequestForm";

export const metadata = {
  title: "Request a Service | Ghar Safar Property Care",
  description: "Submit a home maintenance request to Ghar Safar.",
};

export default function NewMaintenanceRequestPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-center text-sm text-slate-400">Loading form…</p>}>
      <CustomerMaintenanceRequestForm />
    </Suspense>
  );
}
