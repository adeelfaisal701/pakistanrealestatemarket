import Navbar from '@/components/marketplace/Navbar';
import HeroSearch from '@/components/marketplace/HeroSearch';
import { FeaturedAgents, FeaturedAgencies } from '@/components/marketplace/FeaturedDirectory';
import PopularLocations from '@/components/marketplace/PopularLocations';
import DualCTA from '@/components/marketplace/DualCTA';
import MobileMarketplace from '@/components/marketplace/MobileMarketplace';
import DesktopMarketplace, { OurProjects } from '@/components/marketplace/DesktopMarketplace';

export default function LandingPage() {
  return (
    <>
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
