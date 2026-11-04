'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PropertyCard } from './property-card';
import { Sparkles, ArrowRight, Building, Home, Layers, Store } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchPublicProperties } from '@/lib/public-properties';
import type { MarketplaceProperty } from '@/types/marketplace';

export default function PropertyGrid() {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('All');
  const [publicProperties, setPublicProperties] = useState<MarketplaceProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchPublicProperties({ limit: 100, sortBy: 'featured' })
      .then((properties) => {
        if (!active) return;
        setPublicProperties(properties);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError));
        setPublicProperties([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredProperties = publicProperties.filter((item) => {
    const matchesType =
      selectedType === 'All' ||
      item.propertyType === selectedType ||
      (selectedType === 'Apartment' && item.propertyType === 'Flat');
    const matchesPurpose =
      selectedPurpose === 'All' ||
      (selectedPurpose === 'Buy' && item.purpose === 'Sale') ||
      item.purpose === selectedPurpose;
    return matchesType && matchesPurpose;
  });

  return (
    <section id="properties" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 sm:mb-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Published Listings ({publicProperties.length})</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Featured Properties in Pakistan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse current published listings from agents across Pakistan.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {/* Purpose Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold w-full sm:w-auto">
            {['All', 'Buy', 'Rent'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPurpose(p)}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg transition-all min-h-[38px] ${
                  selectedPurpose === p
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p === 'All' ? 'All Purpose' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Property Type Category Chips (Horizontal Scrollable with Smooth Momentum) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none text-xs font-bold -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { label: 'All Listings', value: 'All', icon: Layers },
          { label: 'Houses & Villas', value: 'House', icon: Home },
          { label: 'Plots & Land', value: 'Plot', icon: Layers },
          { label: 'Apartments & Flats', value: 'Apartment', icon: Building },
          { label: 'Commercial Properties', value: 'Commercial', icon: Store },
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedType === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedType(cat.value)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all min-h-[42px] ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Properties Grid: Strict 1-column on mobile (<640px) */}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Loading published properties…
        </p>
      ) : error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Building className="h-12 w-12 text-slate-400 mx-auto mb-3 flex-shrink-0" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No properties found
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your filters or check back later for new listings.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedType('All');
              setSelectedPurpose('All');
            }}
            className="mt-4 px-4 py-2.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 rounded-xl hover:bg-emerald-100 min-h-[40px]"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* View All Bottom Banner */}
      <div className="mt-10 sm:mt-12 text-center">
        <Link
          href="/properties"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-xs min-h-[46px]"
        >
          <span>Explore All Published Properties</span>
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
        </Link>
      </div>
    </section>
  );
}
