'use client';

import React, { useState } from 'react';
import { Search, MapPin, Home, DollarSign, Shield, Sparkles, ChevronDown } from 'lucide-react';
import { LAHORE_SOCIETIES } from '@/lib/mock-data';
import { PropertyType, PurposeType } from '@/types/property';

const PROPERTY_TYPES: PropertyType[] = ['House', 'Plot', 'Apartment', 'Commercial'];

const BUDGET_OPTIONS_BUY = [
  'Any Budget',
  'Under PKR 1 Crore',
  'PKR 1 Crore - 2.5 Crore',
  'PKR 2.5 Crore - 5 Crore',
  'PKR 5 Crore - 10 Crore',
  'PKR 10 Crore+',
];

const BUDGET_OPTIONS_RENT = [
  'Any Budget',
  'Under PKR 50,000 / mo',
  'PKR 50k - 1 Lakh / mo',
  'PKR 1 Lakh - 2 Lakh / mo',
  'PKR 2 Lakh - 5 Lakh / mo',
  'PKR 5 Lakh+ / mo',
];

export default function HeroSearch() {
  const [purpose, setPurpose] = useState<PurposeType>('Buy');
  const [society, setSociety] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(true);
  const [freshConfirmedOnly, setFreshConfirmedOnly] = useState<boolean>(true);

  const budgetOptions = purpose === 'Buy' ? BUDGET_OPTIONS_BUY : BUDGET_OPTIONS_RENT;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const element = document.getElementById('properties');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-8 sm:pt-14 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-80 sm:w-96 h-80 sm:h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

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

        {/* Tabbed Search Container */}
        <div className="pt-2 sm:pt-4 max-w-4xl mx-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/20 dark:border-slate-800 text-slate-900 dark:text-white text-left">
            {/* Buy / Rent Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit mb-5">
              <button
                type="button"
                onClick={() => setPurpose('Buy')}
                className={`flex-1 sm:flex-initial px-5 py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${
                  purpose === 'Buy'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Buy in Lahore
              </button>
              <button
                type="button"
                onClick={() => setPurpose('Rent')}
                className={`flex-1 sm:flex-initial px-5 py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${
                  purpose === 'Rent'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Rent in Lahore
              </button>
            </div>

            {/* Search Filters Form (Stacks vertically on mobile) */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Lahore Society Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Lahore Society
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600 dark:text-emerald-400 pointer-events-none flex-shrink-0" />
                    <select
                      value={society}
                      onChange={(e) => setSociety(e.target.value)}
                      className="w-full min-h-[48px] pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value="">All Lahore Societies</option>
                      {LAHORE_SOCIETIES.map((soc) => (
                        <option key={soc} value={soc}>
                          {soc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none flex-shrink-0" />
                  </div>
                </div>

                {/* Property Type Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Property Type
                  </label>
                  <div className="relative flex items-center">
                    <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600 dark:text-emerald-400 pointer-events-none flex-shrink-0" />
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full min-h-[48px] pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value="">All Types (House/Plot/Flat)</option>
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none flex-shrink-0" />
                  </div>
                </div>

                {/* Budget Range Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Budget Range
                  </label>
                  <div className="relative flex items-center">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600 dark:text-emerald-400 pointer-events-none flex-shrink-0" />
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full min-h-[48px] pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer appearance-none"
                    >
                      {budgetOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none flex-shrink-0" />
                  </div>
                </div>
              </div>

              {/* Checkbox Toggles & Search Button */}
              <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer flex-shrink-0"
                    />
                    <span className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Verified Listings Only</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      checked={freshConfirmedOnly}
                      onChange={(e) => setFreshConfirmedOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer flex-shrink-0"
                    />
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span>Freshly Confirmed (14 Days)</span>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] min-h-[48px]"
                >
                  <Search className="h-4 w-4 flex-shrink-0" />
                  <span>Find Properties</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Quick Search Tag Pills (Scrollable on mobile without wrapping awkwardly) */}
        <div className="flex items-center justify-start sm:justify-center gap-2 pt-2 text-xs text-slate-400 overflow-x-auto pb-2 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <span className="font-semibold text-slate-300 flex-shrink-0">Trending:</span>
          {['DHA Phase 6', 'Bahria Sector C', 'Johar Town G-1', 'Gulberg MM Alam', 'Lake City Golf'].map((tag) => (
            <a
              key={tag}
              href="#properties"
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-300 transition-colors"
            >
              {tag}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
