import Navbar from '@/components/marketplace/Navbar';
import HeroSearch from '@/components/marketplace/HeroSearch';
import { FeaturedAgents, FeaturedAgencies } from '@/components/marketplace/FeaturedDirectory';
import PopularLocations from '@/components/marketplace/PopularLocations';
import DualCTA from '@/components/marketplace/DualCTA';
import MobileMarketplace from '@/components/marketplace/MobileMarketplace';
import DesktopMarketplace, { OurProjects } from '@/components/marketplace/DesktopMarketplace';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo/structured-data';
import SponsoredSlot from '@/components/promotions/SponsoredSlot';
import LiveUpdatesTicker from '@/components/daily-updates/LiveUpdatesTicker';
import LatestNews from '@/components/daily-updates/LatestNews';

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
          <LiveUpdatesTicker />
          <LatestNews className="px-4 py-5 sm:px-6 lg:px-8" innerClassName="mx-auto max-w-7xl" />
          <FeaturedAgents />
          <FeaturedAgencies />
          <PopularLocations />
          <SponsoredSlot
            placement="home_featured"
            className="bg-white px-4 pt-8 sm:px-6 lg:px-8"
            innerClassName="mx-auto max-w-7xl"
          />
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
