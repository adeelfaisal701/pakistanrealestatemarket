import { CustomerMaintenanceDetail } from "@/components/maintenance/customer/CustomerMaintenanceDetail";

export const metadata = {
  title: "Maintenance Request | Ghar Safar",
  description: "Track the status of your maintenance request.",
};

export default async function BuyerMaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerMaintenanceDetail id={id} />;
}
