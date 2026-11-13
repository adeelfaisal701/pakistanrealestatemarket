import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailPage } from "@/components/property-care/ServiceDetailPage";
import { PROPERTY_CARE_SERVICES, findServiceBySlug } from "@/lib/property-care-services";

export function generateStaticParams() {
  return PROPERTY_CARE_SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) return { title: "Service not found | Ghar Safar" };
  return {
    title: `${service.title} Services | Ghar Safar Property Care`,
    description: service.summary,
  };
}

export default async function MaintenanceServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) notFound();
  return <ServiceDetailPage service={service} />;
}
