import Navbar from '@/components/marketplace/Navbar';
import HeroSearch from '@/components/marketplace/HeroSearch';
import TrustBanner from '@/components/marketplace/TrustBanner';
import PropertyGrid from '@/components/marketplace/PropertyGrid';
import PopularLocations from '@/components/marketplace/PopularLocations';
import DualCTA from '@/components/marketplace/DualCTA';
import Footer from '@/components/marketplace/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <Navbar />
      <HeroSearch />
      <TrustBanner />
      <PropertyGrid />
      <PopularLocations />
      <DualCTA />
      <Footer />
    </div>
  );
}
