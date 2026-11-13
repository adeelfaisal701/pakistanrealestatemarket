import type { Metadata } from "next";
import { NOINDEX_NOFOLLOW } from "@/lib/seo/metadata";

/** Private dashboards (admin, agent CRM, buyer, technician) are never indexed. */
export const metadata: Metadata = {
  robots: NOINDEX_NOFOLLOW,
};

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
