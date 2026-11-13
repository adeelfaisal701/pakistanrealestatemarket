import { LegacyRouteRedirect } from "@/components/property-care/LegacyRouteRedirect";

/** Property Care moved to its own customer workspace at /care. */
export default function BuyerMaintenanceRedirect() {
  return <LegacyRouteRedirect to="/care" dark />;
}
