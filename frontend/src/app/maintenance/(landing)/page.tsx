import MaintenanceLandingPage from '@/components/maintenance/MaintenanceLandingPage';
import { PROPERTY_CARE_SERVICES } from '@/lib/property-care-services';
import { MAINTENANCE_SHARE_IMAGE, buildMetadata } from '@/lib/seo/metadata';
import { MAINTENANCE_BRAND, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo/site';
import { JsonLd } from '@/lib/seo/structured-data';

export const metadata = buildMetadata({
  title: 'Home Maintenance & Property Repair Services in Lahore | Ghar Safar Property Care',
  description:
    'Book verified plumbers, electricians, AC technicians, painters, carpenters and handymen in Lahore. Upfront quotations, photo proof of work and every repair tracked until you are satisfied.',
  path: '/maintenance',
  fallbackImage: MAINTENANCE_SHARE_IMAGE,
  keywords: [
    'home maintenance services in Lahore',
    'property repair services Lahore',
    'AC repair Lahore',
    'plumbing services Lahore',
    'electrician Lahore',
  ],
});

export default function MaintenancePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Home maintenance and property repair',
          serviceType: 'Home maintenance',
          url: absoluteUrl('/maintenance'),
          provider: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
          brand: { '@type': 'Brand', name: MAINTENANCE_BRAND },
          areaServed: { '@type': 'City', name: 'Lahore' },
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Property Care services',
            itemListElement: PROPERTY_CARE_SERVICES.map((service) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: service.title,
                description: service.tagline,
                url: absoluteUrl(`/maintenance/services/${service.slug}`),
              },
            })),
          },
        }}
      />
      <MaintenanceLandingPage />
    </>
  );
}
