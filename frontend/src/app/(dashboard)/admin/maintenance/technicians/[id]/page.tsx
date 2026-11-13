import { LegacyRouteRedirect } from "@/components/property-care/LegacyRouteRedirect";

export default async function AdminTechnicianRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LegacyRouteRedirect to={`/care-ops/technicians/${encodeURIComponent(id)}`} dark />;
}
