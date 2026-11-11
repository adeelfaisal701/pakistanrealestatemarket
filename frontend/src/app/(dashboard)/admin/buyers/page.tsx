import { AdminBuyerManager } from "@/components/admin/AdminBuyerManager";

export const metadata = {
  title: "Buyer Accounts | Ghar Safar Admin",
  description: "Manage buyer accounts, access, and retained records.",
};

export default function AdminBuyersPage() {
  return <AdminBuyerManager />;
}