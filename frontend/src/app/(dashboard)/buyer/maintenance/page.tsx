import { CustomerMaintenanceList } from "@/components/maintenance/customer/CustomerMaintenanceList";

export const metadata = {
  title: "Property Care | Ghar Safar",
  description: "Track your managed home maintenance requests.",
};

export default function BuyerMaintenancePage() {
  return <CustomerMaintenanceList />;
}
