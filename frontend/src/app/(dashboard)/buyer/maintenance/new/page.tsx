import { LegacyRouteRedirect } from "@/components/property-care/LegacyRouteRedirect";

export default async function BuyerMaintenanceNewRedirect({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <LegacyRouteRedirect to={category ? `/care/new?category=${encodeURIComponent(category)}` : "/care/new"} dark />;
}
