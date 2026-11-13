import { CustomerMaintenanceDetail } from "@/components/maintenance/customer/CustomerMaintenanceDetail";
import { BuyerPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuyerPreviewShell><CustomerMaintenanceDetail id={id} /></BuyerPreviewShell>;
}
