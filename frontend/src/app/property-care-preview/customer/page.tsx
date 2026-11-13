import { CustomerMaintenanceList } from "@/components/maintenance/customer/CustomerMaintenanceList";
import { BuyerPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default function Page() {
  return <BuyerPreviewShell><CustomerMaintenanceList /></BuyerPreviewShell>;
}
