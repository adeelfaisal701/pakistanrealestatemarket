import { AdminMaintenanceRequestDetail } from "@/components/admin/maintenance/AdminMaintenanceRequestDetail";
import { AdminPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPreviewShell><AdminMaintenanceRequestDetail id={id} /></AdminPreviewShell>;
}
