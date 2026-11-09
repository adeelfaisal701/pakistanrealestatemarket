'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Building2, Building, House, LandPlot, Search, Store } from 'lucide-react';

export default function HeroSearch({ desktop = false }: { desktop?: boolean }) {
  const router = useRouter();
  const [selectedHeroOption, setSelectedHeroOption] = useState<'Property' | 'Maintenance'>('Property');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (city.trim()) query.set('city', city.trim());
    if (location.trim()) query.set('area', location.trim());
    if (propertyType) query.set('propertyType', propertyType);
    if (minPrice) query.set('minPrice', minPrice);
    if (maxPrice) query.set('maxPrice', maxPrice);
    if (minArea) query.set('minArea', minArea);
    if (maxArea) query.set('maxArea', maxArea);
    if (areaUnit) query.set('areaUnit', areaUnit);
    router.push(`/properties?${query.toString()}`);
  };

  const clearFilters = () => {
    setCity('');
    setLocation('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setAreaUnit('');
  };

  return (
    <section
      className={`relative px-4 sm:px-6 lg:px-8 text-white overflow-hidden ${
        desktop
          ? 'min-h-[660px] flex items-center rounded-b-[32px] py-20'
          : 'pt-8 sm:pt-14 pb-16 sm:pb-24 bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950'
      }`}
    >
      {desktop && (
        <div className="absolute inset-0">
          <Image
            src="/images/mobile hero section.png"
            alt=""
            fill
            priority
            sizes="99vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a2a1f]/90 via-[#0a2a1f]/75 to-[#0a2a1f]/55" />
        </div>
      )}
      {!desktop && (
        <>
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-40 w-80 sm:w-96 h-80 sm:h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      <div className="relative max-w-5xl mx-auto text-center space-y-5 sm:space-y-6">
        {/* Top Freshness Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold shadow-inner max-w-full">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="truncate">100% Active Availability • 14-Day Confirmed</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-2xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Find Genuine & Fresh <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
            Real Estate in Lahore
          </span>
        </h1>

        <p className="text-xs sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed px-2">
          Explore authentic houses, plots, and apartments across Bahria Town, DHA, Johar Town & Gulberg with 1-tap WhatsApp agent access.
        </p>

        <div className="pt-2 sm:pt-4 max-w-4xl mx-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/20 dark:border-slate-800 text-slate-900 dark:text-white text-left">
            {/* Switch between the Property and Maintenance experiences. */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit mb-5">
              {(['Property', 'Maintenance'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSelectedHeroOption(option);
                    if (option === 'Maintenance') router.push('/maintenance');
                  }}
                  className={`flex-1 sm:flex-initial px-5 py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${
                    selectedHeroOption === option
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {!filtersOpen ? (
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] min-h-[48px]"
              >
                <Search className="h-4 w-4 flex-shrink-0" />
                <span>Search Properties</span>
              </button>
            ) : (
              <form onSubmit={handleSearch} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'City', value: city, update: setCity, placeholder: 'Any city' },
                    { label: 'Location', value: location, update: setLocation, placeholder: 'Area or society' },
                  ].map((field) => (
                    <label key={field.label} className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                      {field.label}
                      <input value={field.value} onChange={(event) => field.update(event.target.value)} placeholder={field.placeholder} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    </label>
                  ))}
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                    Property Type
                    <select aria-label="Property Type" value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value="">Any type</option>
                      <option value="House">House</option>
                      <option value="Flat">Apartment</option>
                      <option value="Upper Portion">Upper Portion</option>
                      <option value="Lower Portion">Lower Portion</option>
                      <option value="Plot">Plot</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </label>
                  {[
                    { label: 'Minimum Price', value: minPrice, update: setMinPrice },
                    { label: 'Maximum Price', value: maxPrice, update: setMaxPrice },
                    { label: 'Minimum Area', value: minArea, update: setMinArea },
                    { label: 'Maximum Area', value: maxArea, update: setMaxArea },
                  ].map((field) => (
                    <label key={field.label} className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                      {field.label}
                      <input type="number" min="0" value={field.value} onChange={(event) => field.update(event.target.value)} placeholder="Any" className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    </label>
                  ))}
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                    Area Unit
                    <select aria-label="Area Unit" value={areaUnit} onChange={(event) => setAreaUnit(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value="">Any unit</option>
                      <option value="Marla">Marla</option>
                      <option value="Kanal">Kanal</option>
                      <option value="SqFt">Sq Ft</option>
                      <option value="SqYd">Sq Yd</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:justify-end">
                  <button type="button" onClick={clearFilters} className="min-h-11 rounded-xl px-5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    Clear Filters
                  </button>
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-600/30">
                    <Search className="h-4 w-4" />
                    Search Properties
                  </button>
                </div>
              </form>
            )}
            <nav aria-label="Property categories" className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { label: 'Plots', type: 'Plot', Icon: LandPlot },
                { label: 'Houses', type: 'House', Icon: House },
                { label: 'Shops', type: 'Commercial', Icon: Store },
                { label: 'Commercial', type: 'Commercial', Icon: Building2 },
                { label: 'Apartments', type: 'Flat', Icon: Building },
              ].map(({ label, type, Icon }) => (
                <Link
                  key={label}
                  href={`/properties?propertyType=${encodeURIComponent(type)}`}
                  className="flex min-w-[72px] flex-1 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Icon aria-hidden="true" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Quick Search Tag Pills (Scrollable on mobile without wrapping awkwardly) */}
        <div className="flex items-center justify-start sm:justify-center gap-2 pt-2 text-xs text-slate-400 overflow-x-auto pb-2 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <span className="font-semibold text-slate-300 flex-shrink-0">Trending:</span>
          {['DHA Phase 6', 'Bahria Sector C', 'Johar Town G-1', 'Gulberg MM Alam', 'Lake City Golf'].map((tag) => (
            <Link
              key={tag}
              href={`/properties?city=Lahore&area=${encodeURIComponent(tag)}`}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-300 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
