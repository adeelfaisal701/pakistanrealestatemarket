import { AdminTechnicianProfile } from "@/components/admin/maintenance/AdminTechnicianProfile";
import { AdminPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPreviewShell><AdminTechnicianProfile id={id} /></AdminPreviewShell>;
}
