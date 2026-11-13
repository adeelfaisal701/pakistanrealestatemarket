import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin/AdminAccessGuard";
import { OpsShell } from "@/components/care-ops/OpsShell";

export const metadata: Metadata = {
  title: "Property Care Operations | Ghar Safar",
  description: "Maintenance dispatch, technicians, quotations, payments and complaints.",
  robots: { index: false, follow: false },
};

/** Admin Property Care Operations workspace — independent of the Real Estate admin layout. */
export default function CareOpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessGuard>
      <OpsShell>{children}</OpsShell>
    </AdminAccessGuard>
  );
}
