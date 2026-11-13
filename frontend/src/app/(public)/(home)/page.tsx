import Navbar from '@/components/marketplace/Navbar';
import HeroSearch from '@/components/marketplace/HeroSearch';
import { FeaturedAgents, FeaturedAgencies } from '@/components/marketplace/FeaturedDirectory';
import PopularLocations from '@/components/marketplace/PopularLocations';
import DualCTA from '@/components/marketplace/DualCTA';
import MobileMarketplace from '@/components/marketplace/MobileMarketplace';
import DesktopMarketplace, { OurProjects } from '@/components/marketplace/DesktopMarketplace';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo/structured-data';

export const metadata = buildMetadata({
  title: 'Ghar Safar | Houses, Plots & Property for Sale and Rent in Lahore',
  description:
    'Find verified houses, plots, apartments and commercial property for sale and rent in Lahore. Compare real listings, contact trusted agents and agencies directly on WhatsApp — Ghar Safar, Har Khwab Ki Manzil, Apna Ghar.',
  path: '/',
  keywords: [
    'property for sale in Lahore',
    'houses for sale in Lahore',
    'houses for rent in Lahore',
    'plots for sale in Lahore',
    'real estate agencies in Pakistan',
    'property dealers in Lahore',
  ],
});

export default function LandingPage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      {/* ── Mobile layout (< 768px) ── */}
      <div className="md:hidden">
        <MobileMarketplace />
      </div>

      {/* ── Tablet layout (768px–1279px) ── */}
      <div className="hidden md:block xl:hidden">
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
          <Navbar />
          <HeroSearch />
          <FeaturedAgents />
          <FeaturedAgencies />
          <PopularLocations />
          <OurProjects />
          <DualCTA />
        </div>
      </div>

      {/* ── Desktop layout (≥ 1280px) ── */}
      <div className="hidden xl:block">
        <DesktopMarketplace />
      </div>
    </>
  );
}
