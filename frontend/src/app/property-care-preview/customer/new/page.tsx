import { Suspense } from "react";
import { CustomerMaintenanceRequestForm } from "@/components/maintenance/customer/CustomerMaintenanceRequestForm";
import { BuyerPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default function Page() {
  return <BuyerPreviewShell><Suspense><CustomerMaintenanceRequestForm /></Suspense></BuyerPreviewShell>;
}
