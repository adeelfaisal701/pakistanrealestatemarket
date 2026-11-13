import { AdminMaintenanceRequestDetail } from "@/components/admin/maintenance/AdminMaintenanceRequestDetail";

export default async function AdminMaintenanceRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminMaintenanceRequestDetail id={id} />;
}
