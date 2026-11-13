import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

/** Public Maintenance pages; adds optional GA4 (only when configured). */
export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GoogleAnalytics />
    </>
  );
}
