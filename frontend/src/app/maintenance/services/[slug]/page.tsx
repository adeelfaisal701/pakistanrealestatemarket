import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailPage } from "@/components/property-care/ServiceDetailPage";
import { PROPERTY_CARE_SERVICES, findServiceBySlug } from "@/lib/property-care-services";
import { MAINTENANCE_SHARE_IMAGE, buildMetadata } from "@/lib/seo/metadata";
import { MAINTENANCE_BRAND, SITE_NAME, SITE_URL, absoluteUrl, truncateText } from "@/lib/seo/site";
import { JsonLd } from "@/lib/seo/structured-data";

/** Only the real Property Care services exist; any other slug is a hard 404. */
export const dynamicParams = false;

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
  if (!service) notFound();
  return buildMetadata({
    title: `${service.title} Services in Lahore | ${MAINTENANCE_BRAND}`,
    description: truncateText(
      `${service.summary} Book verified ${service.title.toLowerCase()} technicians in Lahore with an upfront quotation and photo proof of work.`,
    ),
    path: `/maintenance/services/${service.slug}`,
    fallbackImage: MAINTENANCE_SHARE_IMAGE,
    keywords: [`${service.title.toLowerCase()} services in Lahore`, `${service.title.toLowerCase()} Lahore`, "home maintenance Lahore"],
  });
}

export default async function MaintenanceServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: `${service.title} services in Lahore`,
          serviceType: service.title,
          description: service.summary,
          url: absoluteUrl(`/maintenance/services/${service.slug}`),
          provider: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
          brand: { "@type": "Brand", name: MAINTENANCE_BRAND },
          areaServed: { "@type": "City", name: "Lahore" },
        }}
      />
      <ServiceDetailPage service={service} />
    </>
  );
}
