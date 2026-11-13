import { LegacyRouteRedirect } from "@/components/property-care/LegacyRouteRedirect";

/** Kept so existing notification links keep working. */
export default async function BuyerMaintenanceDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LegacyRouteRedirect to={`/care/requests/${encodeURIComponent(id)}`} dark />;
}
