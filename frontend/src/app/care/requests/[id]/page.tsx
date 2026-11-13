import { CustomerMaintenanceDetail } from "@/components/maintenance/customer/CustomerMaintenanceDetail";

export default async function CareRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerMaintenanceDetail id={id} />;
}
