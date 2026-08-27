'use client';

import React from 'react';
import { MapPin, TrendingUp, ArrowUpRight, Building2 } from 'lucide-react';
import { LAHORE_SOCIETIES } from '@/lib/mock-data';

const SOCIETY_DETAILS = [
  {
    name: 'DHA Lahore',
    tag: 'Phases 1 to 9 Prism',
    count: '340+ Active Listings',
    avgPrice: 'PKR 4.5 Cr avg.',
    highlight: 'Top Prime Area',
  },
  {
    name: 'Bahria Town Lahore',
    tag: 'Sectors A to F',
    count: '280+ Active Listings',
    avgPrice: 'PKR 2.2 Cr avg.',
    highlight: 'Highest Demand',
  },
  {
    name: 'Gulberg III',
    tag: 'MM Alam & Main Blvd',
    count: '150+ Commercials/Flats',
    avgPrice: 'PKR 3.8 Cr avg.',
    highlight: 'Commercial Hub',
  },
  {
    name: 'Johar Town',
    tag: 'Blocks G, H, J, R',
    count: '210+ Active Listings',
    avgPrice: 'PKR 2.8 Cr avg.',
    highlight: 'Central Location',
  },
  {
    name: 'Lake City',
    tag: 'Golf & Bella Vista',
    count: '120+ Active Listings',
    avgPrice: 'PKR 1.9 Cr avg.',
    highlight: 'Ring Road Access',
  },
  {
    name: 'Model Town',
    tag: 'Blocks A to M',
    count: '95+ Active Listings',
    avgPrice: 'PKR 6.2 Cr avg.',
    highlight: 'Heritage & Luxury',
  },
  {
    name: 'Valencia Town',
    tag: 'Blocks A to P',
    count: '140+ Active Listings',
    avgPrice: 'PKR 2.1 Cr avg.',
    highlight: 'Family Friendly',
  },
  {
    name: 'Askari 11',
    tag: 'Sector A, B, C',
    count: '85+ Active Listings',
    avgPrice: 'PKR 3.2 Cr avg.',
    highlight: 'Maximum Security',
  },
];

export default function PopularLocations() {
  return (
    <section id="societies" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-100/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              <MapPin className="h-3.5 w-3.5" />
              Lahore Societies
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Explore Top Neighborhoods in Lahore
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Direct access to verified property listings across Lahore’s most demanded housing societies.
            </p>
          </div>
        </div>

        {/* Societies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SOCIETY_DETAILS.map((soc) => (
            <a
              key={soc.name}
              href="#properties"
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {soc.highlight}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {soc.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {soc.tag}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {soc.count}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {soc.avgPrice}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Societies Quick Chips Carousel / Cloud */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 mr-2">
            Other Lahore Areas:
          </span>
          {[
            'Faisal Town',
            'Garden Town',
            'Sui Gas Society',
            'WAPDA Town',
            'State Life Phase 1',
            'Park View City',
            'Al-Kabir Town',
            'Central Park Housing',
            'LDA Avenue 1',
          ].map((area) => (
            <a
              key={area}
              href="#properties"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-colors font-medium shadow-2xs"
            >
              {area}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
