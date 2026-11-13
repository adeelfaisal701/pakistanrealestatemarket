'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import Navbar from '@/components/marketplace/Navbar';
import { getApiErrorMessage } from '@/lib/api-client';
import { getPublishedProjects } from '@/lib/projects';
import type { DevelopmentProject } from '@/types/development-project';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPublishedProjects()
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
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Independent developments</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Real Estate Projects</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Explore published development projects, their amenities, and project-specific plans.
            </p>
          </div>
          <Link href="/" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">Back to home</Link>
        </div>

        {error ? (
          <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : loading ? (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">There are no published projects yet.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${encodeURIComponent(project.slug)}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-emerald-950 dark:to-slate-800">
                  {project.coverImage ? (
                    <img src={project.coverImage} alt={project.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Building2 className="h-10 w-10 text-emerald-700" /></div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold">{project.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">{project.developer}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{project.status}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600 dark:text-slate-300">{project.shortDescription}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700" />{project.location}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700">
                      {project.priceRange || 'View project'} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
