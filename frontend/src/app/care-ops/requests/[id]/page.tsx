import { AdminMaintenanceRequestDetail } from "@/components/admin/maintenance/AdminMaintenanceRequestDetail";

export default async function CareOpsRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminMaintenanceRequestDetail id={id} />;
}
