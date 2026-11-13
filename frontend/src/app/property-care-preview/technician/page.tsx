import { TechnicianDashboard } from "@/components/technician/TechnicianDashboard";
import { TechnicianPreviewShell } from "@/components/property-care/preview/PreviewShells";

export default function Page() {
  return <TechnicianPreviewShell><TechnicianDashboard /></TechnicianPreviewShell>;
}
