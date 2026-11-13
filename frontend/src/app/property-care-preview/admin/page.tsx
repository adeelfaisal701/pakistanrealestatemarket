import { AdminMaintenanceDashboard } from "@/components/admin/maintenance/AdminMaintenanceDashboard";
import { AdminPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default function Page() {
  return <AdminPreviewShell><AdminMaintenanceDashboard /></AdminPreviewShell>;
}
