'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building,
  Building2,
  Home,
  Layers,
  MapPin,
  Store,
} from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchPublicProperties } from '@/lib/public-properties';
import { getFeaturedProjects } from '@/lib/projects';
import type { MarketplaceProperty } from '@/types/marketplace';
import type { DevelopmentProject } from '@/types/development-project';
import HeroSearch from './HeroSearch';
import { FeaturedAgencies, FeaturedAgents } from './FeaturedDirectory';
import DualCTA from './DualCTA';
import Navbar from './Navbar';

function PropertyCategories() {
  const categories = [
    { title: 'Houses', description: 'Find a place to call home', type: 'House', icon: Home },
    { title: 'Plots', description: 'Explore land and plots', type: 'Plot', icon: Layers },
    { title: 'Apartments', description: 'Browse flats and apartments', type: 'Apartment', icon: Building },
    { title: 'Commercial', description: 'Find a space for business', type: 'Commercial', icon: Store },
  ];

  return (
    <section aria-labelledby="property-categories-heading" className="bg-white px-8 py-12">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1440px]">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Explore by type
            </p>
            <h2 id="property-categories-heading" className="text-3xl font-extrabold tracking-tight text-slate-900">
              Find the right property
            </h2>
          </div>
          <Link
            href="/properties"
            className="text-sm font-bold text-emerald-700 transition-colors hover:text-emerald-800"
          >
            View all properties <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-5">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.type}
                href={`/properties?propertyType=${category.type}`}
                className="group flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <Icon className="h-7 w-7" />
                </span>
                <span>
                  <span className="block text-lg font-bold text-slate-900">{category.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{category.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PopularLocations({
  properties,
  error,
}: {
  properties: MarketplaceProperty[];
  error: string;
}) {
  const locations = [
    'DHA Lahore',
    'Bahria Town Lahore',
    'Gulberg III',
    'Johar Town',
    'Lake City',
    'Model Town',
    'Valencia Town',
    'Askari 11',
  ];

  return (
    <section id="popular-locations" aria-labelledby="popular-locations-heading" className="border-y border-slate-200 bg-slate-100/60 px-5 py-8 dark:border-slate-800 dark:bg-slate-900/40 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1440px]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Lahore Societies
            </p>
            <h2 id="popular-locations-heading" className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Explore Top Neighborhoods in Lahore
            </h2>
          </div>
          <Link href="/properties?city=Lahore" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800">
            View All Locations <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {locations.map((location) => {
            const image = properties.find(
              (property) =>
                `${property.location.area} ${property.location.city}`.toLowerCase().includes(location.toLowerCase()) &&
                property.images.length > 0,
            )?.images[0];

            return (
              <Link
                key={location}
                href={`/properties?city=Lahore&area=${encodeURIComponent(location)}`}
                className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {image ? (
                  <img
                    src={image}
                    alt={`${location} property`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-200">
                    <MapPin className="h-8 w-8 text-emerald-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#071B2B]/90 via-[#071B2B]/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:p-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white sm:text-base">{location}</h3>
                    <p className="text-[10px] text-white/85 sm:text-xs">View available properties</p>
                  </div>
                  <MapPin className="h-4 w-4 shrink-0 text-[#00B889]" />
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}

export function OurProjects() {
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getFeaturedProjects()
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
    <section id="societies" aria-labelledby="projects-heading" className="scroll-mt-24 bg-white px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1440px]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Featured projects
            </p>
            <h2 id="projects-heading" className="text-2xl font-extrabold tracking-tight text-[#101D32]">
              Our Projects
            </h2>
          </div>
          <Link href="/projects" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800">
            View All Projects <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : loading ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading featured projects…</p>
        ) : projects.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No featured projects are available right now.</p>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${encodeURIComponent(project.slug)}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex aspect-[2.4/1] items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-emerald-950 dark:to-slate-800">
                {project.coverImage ? (
                  <img src={project.coverImage} alt={project.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Building2 className="h-9 w-9 text-emerald-700 dark:text-emerald-300" />
                )}
              </div>
              <div className="flex items-center justify-between gap-4 p-3 sm:p-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-white sm:text-base">
                    {project.name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {project.location}
                  </p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}

export default function DesktopMarketplace() {
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchPublicProperties({ limit: 100, sortBy: 'featured' })
      .then((results) => {
        if (!active) return;
        setProperties(results);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError));
        setProperties([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <HeroSearch desktop />
      <FeaturedAgents />
      <FeaturedAgencies />
      <PopularLocations properties={properties} error={loading ? '' : error} />
      <OurProjects />
      <DualCTA />
    </main>
  );
}
