import PropertyDetailsClient from "./property-details-client";

interface PropertyDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailsPage({
  params,
}: PropertyDetailsPageProps) {
  const { id } = await params;
  return <PropertyDetailsClient propertyId={id} />;
}
