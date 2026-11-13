import { TechnicianJobDetail } from "@/components/technician/TechnicianJobDetail";
import { TechnicianPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TechnicianPreviewShell><TechnicianJobDetail id={id} /></TechnicianPreviewShell>;
}
