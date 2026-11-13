import { LegacyRouteRedirect } from "@/components/property-care/LegacyRouteRedirect";

/** Property Care operations moved to its own workspace at /care-ops. */
export default function AdminMaintenanceRedirect() {
  return <LegacyRouteRedirect to="/care-ops" dark />;
}
