'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  Menu,
  X,
  Search,
  ShieldCheck,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Heart,
  ArrowRight,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { fetchPublicProperties } from '@/lib/public-properties';
import { getApiErrorMessage } from '@/lib/api-client';
import { formatPKR, formatLandArea } from '@/lib/utils';
import type { MarketplaceProperty } from '@/types/marketplace';
import type { DevelopmentProject } from '@/types/development-project';
import { useBuyerSavedProperties } from '@/components/buyer/BuyerSavedPropertiesProvider';
import { FeaturedAgencies, FeaturedAgents } from './FeaturedDirectory';
import { getLandingProjects } from '@/lib/projects';
import { PagedCarousel } from './PagedCarousel';

/* ─────────────────────── HELPERS ─────────────────────── */
function HouseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}
const searchLabels = [
  'Search Properties',
  'Search Flats',
  'Search Houses',
  'Search Apartments',
  'Search Plazas',
  'Search Shops',
  'Search Plots',
];

/* ─────────────────────── MOBILE HEADER ─────────────────────── */
function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-30 border-b border-slate-200/80 bg-white/95 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-md min-[360px]:px-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex min-h-12 min-w-0 items-center gap-2">
          <Image
            src="/images/ghar-safar-logo.png"
            unoptimized
            alt="Ghar Safar logo"
            width={798}
            height={768}
            className="h-[70px] w-[72px] shrink-0 object-contain max-[359px]:h-[62px] max-[359px]:w-16"
          />
          <span className="flex min-w-0 flex-col">
            <span className="whitespace-nowrap text-[19px] font-extrabold leading-5 text-[#101D32] max-[359px]:text-[18px]">
              Ghar <span className="text-[#00B889]">Safar</span>
            </span>
            <span className="whitespace-nowrap text-[8px] font-medium leading-3 tracking-[0.1em] text-[#101D32]/70 max-[359px]:text-[7px] max-[359px]:tracking-[0.06em]">
              YOUR PROPERTY DESTINATION
            </span>
          </span>
        </Link>

        {/* Right icons */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/buyer/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#101D32] transition-colors hover:bg-slate-100 active:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B889]"
          >
            <Bell className="h-5 w-5" />
          </Link>
          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#101D32] transition-colors hover:bg-slate-100 active:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B889]"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Slide-down menu */}
      {menuOpen && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-[#071B2B]/95 p-3 shadow-2xl backdrop-blur">
          {[
            { label: 'Home', href: '/' },
            { label: 'Properties', href: '/properties' },
            { label: 'Post Property', href: '/post-property' },
            { label: 'Agent CRM', href: '/agent' },
            { label: 'Sign In', href: '/login' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold text-white hover:bg-emerald-800/50 min-h-[44px]"
            >
              <span>{item.label}</span>
              <ChevronRight className="h-4 w-4 text-emerald-400" />
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

/* ─────────────────────── HERO SECTION ─────────────────────── */
function MobileHero() {
  const router = useRouter();
  const [selectedHeroOption, setSelectedHeroOption] = useState<'Property' | 'Maintenance'>('Property');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchLabelIndex, setSearchLabelIndex] = useState(0);
  const [searchLabelVisible, setSearchLabelVisible] = useState(true);
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('');

  useEffect(() => {
    let transitionTimeout: number | undefined;
    const intervalId = window.setInterval(() => {
      setSearchLabelVisible(false);
      transitionTimeout = window.setTimeout(() => {
        setSearchLabelIndex((index) => (index + 1) % searchLabels.length);
        setSearchLabelVisible(true);
      }, 180);
    }, 3500);

    return () => {
      window.clearInterval(intervalId);
      if (transitionTimeout !== undefined) window.clearTimeout(transitionTimeout);
    };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (location.trim()) params.set('area', location.trim());
    if (propertyType) params.set('propertyType', propertyType);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minArea) params.set('minArea', minArea);
    if (maxArea) params.set('maxArea', maxArea);
    if (areaUnit) params.set('areaUnit', areaUnit);
    router.push(`/properties?${params.toString()}`);
  }

  function clearFilters() {
    setCity('');
    setLocation('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setAreaUnit('');
  }

  return (
    <section className="relative isolate min-h-[520px] overflow-hidden bg-[#071B2B] sm:min-h-[540px]">
      {/* Hero background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/mobile hero section.png"
          alt="Luxury property"
          fill
          className="object-cover object-[58%_center]"
          priority
          sizes="100vw"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071B2B]/90 via-[#071B2B]/60 to-[#071B2B]/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071B2B]/20 via-transparent to-[#071B2B]/90" />
      </div>

      {/* Header inside hero */}
      <MobileHeader />

      {/* Hero text + search */}
      <div className="relative z-10 mx-auto flex min-h-[520px] w-full max-w-lg flex-col px-4 pb-5 pt-24 sm:min-h-[540px]">
        <p className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-[#071B2B]/55 px-3 py-1.5 text-[10px] font-semibold text-white/95 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#00B889]" />
          <span className="truncate">Pakistan&apos;s Trusted Real Estate Platform</span>
        </p>
        <h1 className="mb-1 max-w-[360px] text-[clamp(2rem,9vw,2.7rem)] font-black leading-[1.02] tracking-tight text-white">
          Har Khwab
          <br />
          <span className="text-[#00B889]">Ki Manzil,</span> Apna Ghar.
        </h1>
        <p className="mb-4 text-sm font-medium text-white/90">
          Buy, Rent or Invest with Confidence
        </p>

        {/* Switch between the Property and Maintenance experiences. */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex w-fit items-center gap-1 rounded-full border border-white/10 bg-[#071B2B]/75 p-1 backdrop-blur">
            {(['Property', 'Maintenance'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setSelectedHeroOption(opt);
                  if (opt === 'Maintenance') router.push('/maintenance');
                }}
                className={`flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-all ${
                  selectedHeroOption === opt
                    ? 'bg-[#00B889] text-white shadow'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {opt === 'Property' ? (
                  <HouseIcon className="h-3.5 w-3.5" />
                ) : (
                  <Building2 className="h-3.5 w-3.5" />
                )}
                {opt}
              </button>
            ))}
          </div>
        </div>

        {!filtersOpen ? (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00B889] to-[#008F68] px-4 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.99]"
          >
            <Search className="h-4 w-4" />
            <span className="relative inline-block whitespace-nowrap text-center" aria-live="off">
              <span className="invisible" aria-hidden="true">Search Apartments</span>
              <span className={`absolute inset-0 transition-all duration-300 ${searchLabelVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}>
                {searchLabels[searchLabelIndex]}
              </span>
            </span>
          </button>
        ) : (
          <form onSubmit={handleSearch} className="rounded-2xl border border-white/70 bg-white p-3 text-[#101D32] shadow-xl shadow-[#071B2B]/25">
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0 text-[11px] font-semibold">
                City
                <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Any city" className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm" />
              </label>
              <label className="min-w-0 text-[11px] font-semibold">
                Location
                <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Area or society" className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm" />
              </label>
              <label className="col-span-2 text-[11px] font-semibold">
                Property Type
                <select aria-label="Property Type" value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm">
                  <option value="">Any type</option>
                  <option value="House">House</option>
                  <option value="Flat">Apartment</option>
                  <option value="Upper Portion">Upper Portion</option>
                  <option value="Lower Portion">Lower Portion</option>
                  <option value="Plot">Plot</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </label>
              <label className="min-w-0 text-[11px] font-semibold">
                Minimum Price
                <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Any" className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm" />
              </label>
              <label className="min-w-0 text-[11px] font-semibold">
                Maximum Price
                <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any" className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm" />
              </label>
              <label className="min-w-0 text-[11px] font-semibold">
                Minimum Area
                <input type="number" min="0" value={minArea} onChange={(event) => setMinArea(event.target.value)} placeholder="Any" className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm" />
              </label>
              <label className="min-w-0 text-[11px] font-semibold">
                Maximum Area
                <input type="number" min="0" value={maxArea} onChange={(event) => setMaxArea(event.target.value)} placeholder="Any" className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm" />
              </label>
              <label className="col-span-2 text-[11px] font-semibold">
                Area Unit
                <select aria-label="Area Unit" value={areaUnit} onChange={(event) => setAreaUnit(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-2 text-sm">
                  <option value="">Any unit</option>
                  <option value="Marla">Marla</option>
                  <option value="Kanal">Kanal</option>
                  <option value="SqFt">Sq Ft</option>
                  <option value="SqYd">Sq Yd</option>
                </select>
              </label>
              <button type="submit" className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00B889] to-[#008F68] px-4 text-sm font-bold text-white shadow-md">
                <Search className="h-4 w-4" />
                Search Properties
              </button>
              <button type="button" onClick={clearFilters} className="col-span-2 min-h-9 text-sm font-semibold text-[#008F68]">
                Clear Filters
              </button>
            </div>
          </form>
        )}
        <nav aria-label="Property categories" className="mt-auto -mx-1 grid min-h-0 max-h-[145px] w-[calc(100%+0.5rem)] flex-1 grid-cols-3 grid-rows-2 gap-2">
          {[
            { label: 'Plots', type: 'Plot', icon: '/images/icons/plots.svg' },
            { label: 'Houses', type: 'House', icon: '/images/icons/houses.svg' },
            { label: 'Shops', type: 'Commercial', icon: '/images/icons/shops.svg' },
            { label: 'Commercial', type: 'Commercial', icon: '/images/icons/commercial.svg' },
            { label: 'Apartments', type: 'Flat', icon: '/images/icons/apartments.svg' },
            { label: 'Plaza', type: 'Commercial', icon: '/images/icons/plaza.svg' },
          ].map((category) => (
            <Link
              key={category.label}
              href={`/properties?propertyType=${encodeURIComponent(category.type)}`}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-1 py-1 text-sm font-semibold leading-tight text-white/95 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B889]"
            >
              <Image
                src={category.icon}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="whitespace-nowrap">{category.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

/* ─────────────────────── PROPERTY CATEGORIES ─────────────────────── */
/* ─────────────────────── FEATURED PROPERTIES ─────────────────────── */
function MobileFeaturedCard({ property }: { property: MarketplaceProperty }) {
  const { propertyIds, toggle } = useBuyerSavedProperties();
  const [saving, setSaving] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const saved = propertyIds.has(property.id);

  async function toggleSaved() {
    if (saving) return;
    setSaving(true);
    try {
      await toggle(property.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-200 overflow-hidden">
        {property.images?.[0] && !imgErr ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No image
          </div>
        )}
        {/* Favourite */}
        <button
          type="button"
          onClick={() => void toggleSaved()}
          disabled={saving}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved properties' : 'Save property'}
          className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-white/90 shadow"
        >
          <Heart
            className={`h-4 w-4 ${saved ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
          />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-1.5">
          <span className="shrink-0 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {property.purpose === 'Sale' ? 'For Sale' : 'For Rent'}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap text-[10px] font-medium text-slate-500">
            <Eye className="h-3 w-3 shrink-0" />
            <span>{(property.viewsCount ?? 0).toLocaleString('en-US')} Views</span>
          </span>
        </div>
        <div className="text-emerald-700 font-bold text-sm mb-0.5">
          {formatPKR(property.price)}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
          <MapPin className="h-3 w-3 text-emerald-500 flex-shrink-0" />
          <span className="truncate">
            {property.location.area}, {property.location.city}
          </span>
        </div>

        {/* Features row */}
        <div className="flex items-center gap-2 text-[10px] text-slate-600 mb-3">
          {property.features?.bedrooms !== undefined && (
            <span className="flex items-center gap-0.5">
              <Bed className="h-3 w-3 text-emerald-500" />
              {property.features.bedrooms}
            </span>
          )}
          {property.features?.bathrooms !== undefined && (
            <span className="flex items-center gap-0.5">
              <Bath className="h-3 w-3 text-emerald-500" />
              {property.features.bathrooms}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Maximize2 className="h-3 w-3 text-emerald-500" />
            {formatLandArea(property.areaSize, property.areaUnit)}
          </span>
        </div>

        {/* View Details button */}
        <Link
          href={`/property/${encodeURIComponent(property.id)}`}
          className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 transition-colors"
        >
          View Details
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function MobileFeaturedProperties({
  properties,
  loading,
  error,
}: {
  properties: MarketplaceProperty[];
  loading: boolean;
  error: string;
}) {
  const featured = properties.slice(0, 6);

  return (
    <section className="bg-slate-50 px-3 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold text-slate-900">Featured Properties</h2>
        <Link
          href="/properties"
          className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white h-56 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="py-6 text-center text-sm text-red-700">
          {error}
        </p>
      ) : featured.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {featured.map((p) => (
            <MobileFeaturedCard key={p.id} property={p} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-8">No properties available</p>
      )}
    </section>
  );
}

/* ─────────────────────── POPULAR LOCATIONS ─────────────────────── */
export const LOCATIONS = [
  { name: 'Lahore', href: '/properties?city=Lahore', image: '/images/Lahore.jpg', comingSoon: false },
  { name: 'Karachi', href: '/properties?city=Karachi', image: '/images/Karachi.jpg', comingSoon: true },
  { name: 'Islamabad', href: '/properties?city=Islamabad', image: '/images/Islamabad.jpg', comingSoon: true },
  { name: 'Rawalpindi', href: '/properties?city=Rawalpindi', image: '/images/Rawalpindi.jpg', comingSoon: true },
];

function MobilePopularLocations({
  properties,
  error,
}: {
  properties: MarketplaceProperty[];
  error: string;
}) {
  return (
    <section id="popular-locations" className="border-t border-[#E2E8F0] bg-white px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#008F68]">Explore Top Cities</p>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#101D32]">Popular Locations</h2>
        </div>
        <Link
          href="/properties"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#008F68]"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LOCATIONS.map((location) => {
          const image = properties.find(
            (property) =>
              property.location.city.toLowerCase() === location.name.toLowerCase() &&
              property.images.length > 0,
          )?.images[0];
          const listedCount = properties.filter(
            (property) => property.location.city.toLowerCase() === location.name.toLowerCase(),
          ).length;

          const cardContent = (
            <>
              <img
                src={location.image}
                alt={`${location.name} city`}
                className={`h-full w-full object-cover transition-transform duration-300 ${location.comingSoon ? '' : 'group-hover:scale-105'}`}
                loading="lazy"
              />
              {location.comingSoon && (
                <span className="absolute right-2 top-2 rounded-full border border-white/30 bg-[#071B2B]/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
                  Soon
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-[#071B2B]/95 via-[#071B2B]/45 to-transparent px-2.5 pb-2.5 pt-7 text-xs font-bold text-white sm:px-3 sm:text-sm">
                <MapPin className="h-4 w-4 shrink-0 text-[#00B889]" />
                <span className="min-w-0">
                  <span className="block truncate">{location.name}</span>
                  <span className="block text-[9px] font-medium text-white/85">
                    {listedCount > 0 ? `${listedCount} featured listings` : 'Explore listings'}
                  </span>
                </span>
              </span>
            </>
          );

          return location.comingSoon ? (
            <div
              key={location.name}
              aria-disabled="true"
              className="relative aspect-[16/10] min-w-0 cursor-default overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-200 opacity-90 shadow-sm"
            >
              {cardContent}
            </div>
          ) : (
            <Link
              key={location.name}
              href={location.href}
              className="group relative aspect-[16/10] min-w-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-200 shadow-sm"
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────── OUR PROJECTS ─────────────────────── */
export function MobileProjects() {
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getLandingProjects()
      .then((results) => {
        if (active) setProjects(results);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="societies" className="scroll-mt-20 bg-white px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#008F68]">Featured Projects</p>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#101D32]">Our Projects</h2>
        </div>
        <Link
          href="/projects"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700"
        >
          View All Projects <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>
      ) : loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-[108px] animate-pulse rounded-2xl border border-[#E2E8F0] bg-slate-50" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="rounded-xl border border-[#E2E8F0] bg-slate-50 p-4 text-xs text-[#64748B]">No projects are available right now.</p>
      ) : (
      <PagedCarousel
        items={projects}
        pageSize={3}
        label="Our projects"
        pageClassName="grid gap-3"
        getKey={(project) => project.id}
        renderItem={(project) => (
          <Link
            href={`/projects/${encodeURIComponent(project.slug)}`}
            className="group flex h-[108px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-2.5 shadow-[0_1px_3px_rgba(16,29,50,0.06)] transition-colors hover:border-emerald-300"
          >
            <div className="relative h-[86px] w-[34%] max-w-32 shrink-0 overflow-hidden rounded-xl bg-[#EAF7F2]">
              {project.coverImage ? (
                <img src={project.coverImage} alt={project.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-full items-center justify-center text-[#008F68]">
                  <Building2 className="h-7 w-7" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-xs font-bold leading-tight text-[#101D32]">{project.name}</div>
              <div className="mt-1 flex min-w-0 items-center gap-1 truncate text-[10px] text-[#64748B]">
                <MapPin className="h-3 w-3 shrink-0 text-[#008F68]" />
                {project.location}
              </div>
              <div className="mt-1 line-clamp-1 text-[10px] text-slate-500">{project.shortDescription}</div>
              {project.priceRange && <div className="mt-1 truncate text-xs font-extrabold text-[#008F68]">{project.priceRange}</div>}
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300 text-[#008F68] transition-colors group-hover:bg-[#008F68] group-hover:text-white">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        )}
      />
      )}
    </section>
  );
}

/* ─────────────────────── LIST PROPERTY CTA ─────────────────────── */
function MobileListCTA() {
  return (
    <section className="bg-white px-4 py-4 sm:px-6">
      <div className="relative mx-auto flex max-w-7xl flex-col items-stretch gap-3 overflow-hidden rounded-2xl border border-[#008F68]/30 bg-gradient-to-r from-[#071B2B] via-[#0B2538] to-[#064E3B] p-4 shadow-sm sm:gap-5 sm:px-6">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -bottom-10 -right-6 h-32 w-32 rounded-full border-[18px] border-white/[0.05]" />
        <div className="pointer-events-none absolute -right-2 -top-8 h-20 w-20 rounded-full bg-[#00B889]/10 blur-xl" />

        <div className="relative flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00B889] text-white">
            <HouseIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold leading-tight text-white sm:text-base">
              List Your Property with Ghar Safar
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-white/75 sm:text-xs">
              Get more visibility and reach serious buyers
            </p>
          </div>
        </div>

        {/* Button */}
        <Link
          href="/post-property"
          className="relative inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#00B889] px-4 text-xs font-bold text-[#071B2B] transition-colors hover:bg-emerald-300 sm:w-auto sm:self-start"
        >
          Add Property Free
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────── ROOT EXPORT ─────────────────────── */
export default function MobileMarketplace() {
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [propertiesError, setPropertiesError] = useState('');

  useEffect(() => {
    let active = true;
    setPropertiesError('');
    fetchPublicProperties({ limit: 6, sortBy: 'featured' })
      .then((results) => {
        if (active) setProperties(results);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setPropertiesError(getApiErrorMessage(requestError));
        setProperties([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <MobileHero />
      <FeaturedAgents />
      <FeaturedAgencies />
      <MobilePopularLocations properties={properties} error={propertiesError} />
      <MobileProjects />
      <MobileListCTA />
    </div>
  );
}
