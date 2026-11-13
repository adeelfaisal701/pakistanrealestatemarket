import { LegacyRouteRedirect } from "@/components/property-care/LegacyRouteRedirect";

/** Kept so existing notification links keep working. */
export default async function AdminMaintenanceRequestRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LegacyRouteRedirect to={`/care-ops/requests/${encodeURIComponent(id)}`} dark />;
}
