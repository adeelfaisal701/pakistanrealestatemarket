import { AdminTechnicianProfile } from "@/components/admin/maintenance/AdminTechnicianProfile";

export default async function CareOpsTechnicianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTechnicianProfile id={id} />;
}
