'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Edit3, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-client';
import { deleteAdminProject, getAdminProjects } from '@/lib/projects';
import type { DevelopmentProject } from '@/types/development-project';

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProject, setBusyProject] = useState('');
  const [error, setError] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await getAdminProjects());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function removeProject(project: DevelopmentProject) {
    if (!window.confirm(`Delete "${project.name}"? This will remove the project record.`)) return;
    setBusyProject(project.id);
    setError('');
    try {
      await deleteAdminProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyProject('');
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Development content</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Project Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Manage independent development projects, their payment plans, and public visibility.
          </p>
        </div>
        <Link href="/admin/projects/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400">
          <Plus className="h-4 w-4" /> Add project
        </Link>
      </header>

      {error && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
          <button type="button" onClick={() => void loadProjects()} className="font-bold underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-sm text-slate-400">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center">
          <Building2 className="mx-auto h-9 w-9 text-slate-500" />
          <h2 className="mt-3 text-lg font-bold text-white">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-400">Create a development project independently from property listings.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="divide-y divide-slate-800">
            {projects.map((project) => (
              <article key={project.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-800 sm:w-36">
                  {project.coverImage ? (
                    <img src={project.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Building2 className="h-8 w-8 text-slate-500" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold text-white">{project.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${project.isPublished ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                      {project.isPublished ? 'Published' : 'Draft'}
                    </span>
                    {project.isFeatured && <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold text-amber-200">Featured</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">{project.developer} · {project.location}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{project.shortDescription}</p>
                  <p className="mt-2 text-[11px] text-slate-500">Order {project.displayOrder} · {project.status} · {project.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {project.isPublished && (
                    <Link href={`/projects/${encodeURIComponent(project.slug)}`} target="_blank" aria-label={`View ${project.name} public page`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                  <button type="button" onClick={() => router.push(`/admin/projects/${project.id}`)} aria-label={`Edit ${project.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={busyProject === project.id} onClick={() => void removeProject(project)} aria-label={`Delete ${project.name}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/20 text-red-300 hover:bg-red-950/40 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
