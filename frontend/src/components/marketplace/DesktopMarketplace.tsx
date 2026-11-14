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
import { getLandingProjects } from '@/lib/projects';
import type { MarketplaceProperty } from '@/types/marketplace';
import type { DevelopmentProject } from '@/types/development-project';
import HeroSearch from './HeroSearch';
import { FeaturedAgencies, FeaturedAgents } from './FeaturedDirectory';
import DualCTA from './DualCTA';
import Navbar from './Navbar';
import { useMediaQuery } from '@/hooks/use-media-query';
import { VerticalScrollList } from './VerticalScrollList';
import SponsoredSlot from '@/components/promotions/SponsoredSlot';

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

function ProjectCard({ project }: { project: DevelopmentProject }) {
  return (
    <Link
      href={`/projects/${encodeURIComponent(project.slug)}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(16,29,50,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_30px_rgba(16,29,50,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-emerald-950 dark:to-slate-800">
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Building2 aria-hidden="true" className="h-9 w-9 text-emerald-700 dark:text-emerald-300" />
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
          {project.status}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-bold text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-white">
          {project.name}
        </h3>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="truncate">{project.location}</span>
        </p>
        {project.shortDescription && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{project.shortDescription}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="min-w-0 truncate text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
            {project.priceRange || project.projectType}
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:border-emerald-800 dark:text-emerald-300">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function OurProjects() {
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
          <div className="grid grid-cols-3 gap-4 lg:gap-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[320px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No projects are available right now.</p>
        ) : (
          <VerticalScrollList visibleCount={3} label="Our projects" className="grid grid-cols-3 gap-4 lg:gap-5">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </VerticalScrollList>
        )}
        <SponsoredSlot placement="projects_section" layout="inline" className="mt-6" />
      </div>
    </section>
  );
}

export default function DesktopMarketplace() {
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The landing page mounts every layout and hides the others with CSS; only the
  // visible desktop layout needs this (large) listings request.
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  useEffect(() => {
    if (!isDesktop) return;
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
  }, [isDesktop]);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <HeroSearch desktop />
      <FeaturedAgents />
      <FeaturedAgencies />
      <PopularLocations properties={properties} error={loading ? '' : error} />
      <SponsoredSlot
        placement="home_featured"
        className="bg-white px-5 pt-8 sm:px-8 sm:pt-10"
        innerClassName="mx-auto max-w-7xl 2xl:max-w-[1440px]"
      />
      <OurProjects />
      <DualCTA />
    </main>
  );
}
