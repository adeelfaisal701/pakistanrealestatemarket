'use client';

import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-client';
import { getAdminProject, saveAdminProject } from '@/lib/projects';
import type {
  DevelopmentProject,
  DevelopmentProjectPayload,
  DevelopmentProjectStatus,
  ProjectPaymentMilestone,
} from '@/types/development-project';

const STATUSES: DevelopmentProjectStatus[] = [
  'Coming Soon',
  'Launched',
  'Available',
  'Completed',
];

const EMPTY_PAYLOAD: DevelopmentProjectPayload = {
  name: '',
  developer: '',
  slug: '',
  shortDescription: '',
  description: '',
  location: '',
  projectType: '',
  categories: [],
  priceRange: '',
  status: 'Coming Soon',
  coverImage: '',
  gallery: [],
  amenities: [],
  additionalInformation: {},
  paymentPlan: { enabled: false, milestones: [] },
  isPublished: false,
  isFeatured: false,
  displayOrder: 0,
};

function parseAmount(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function milestoneRows(value: string): ProjectPaymentMilestone[] {
  return lines(value).map((line) => {
    const [title = '', amount = '0', dueAfter = ''] = line.split('|');
    return {
      title: title.trim(),
      amount: Number(amount.trim()),
      ...(dueAfter.trim() ? { dueAfter: dueAfter.trim() } : {}),
    };
  });
}

function toPayload(project: DevelopmentProject): DevelopmentProjectPayload {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = project;
  return {
    ...payload,
    paymentPlan: {
      ...payload.paymentPlan,
      enabled: Boolean(payload.paymentPlan?.enabled),
      milestones: payload.paymentPlan?.milestones ?? [],
    },
    additionalInformation: payload.additionalInformation ?? {},
  };
}

export function ProjectEditor({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<DevelopmentProjectPayload>(EMPTY_PAYLOAD);
  const [initialLoading, setInitialLoading] = useState(Boolean(projectId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState<File>();
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [paymentPlanFile, setPaymentPlanFile] = useState<File>();
  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : payload.coverImage || ''),
    [coverFile, payload.coverImage],
  );
  const galleryPreviews = useMemo(
    () => galleryFiles.map((file) => URL.createObjectURL(file)),
    [galleryFiles],
  );

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    getAdminProject(projectId)
      .then((project) => {
        if (active) setPayload(toPayload(project));
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(
    () => () => {
      if (coverFile) URL.revokeObjectURL(coverPreview);
      galleryPreviews.forEach((url) => URL.revokeObjectURL(url));
    },
    [coverFile, coverPreview, galleryPreviews],
  );

  const update = <K extends keyof DevelopmentProjectPayload>(
    key: K,
    value: DevelopmentProjectPayload[K],
  ) => setPayload((current) => ({ ...current, [key]: value }));

  const updatePayment = <K extends keyof DevelopmentProjectPayload['paymentPlan']>(
    key: K,
    value: DevelopmentProjectPayload['paymentPlan'][K],
  ) =>
    setPayload((current) => ({
      ...current,
      paymentPlan: { ...current.paymentPlan, [key]: value },
    }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await saveAdminProject(payload, {
        cover: coverFile,
        gallery: galleryFiles,
        paymentPlanFile,
      }, projectId);
      router.push('/admin/projects');
      router.refresh();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return <p className="p-8 text-sm text-slate-400">Loading project…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/projects"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Project Management
      </Link>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
          Independent development projects
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {projectId ? 'Edit Project' : 'Add Project'}
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </p>
        )}

        <section className="grid gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:grid-cols-2">
          <h2 className="text-base font-bold text-white sm:col-span-2">Project details</h2>
          <Field label="Project name">
            <input required maxLength={160} value={payload.name} onChange={(event) => update('name', event.target.value)} />
          </Field>
          <Field label="Developer / company">
            <input required maxLength={160} value={payload.developer} onChange={(event) => update('developer', event.target.value)} />
          </Field>
          <Field label="Unique project slug">
            <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={160} value={payload.slug} onChange={(event) => update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/--+/g, '-'))} />
          </Field>
          <Field label="Location">
            <input required maxLength={200} value={payload.location} onChange={(event) => update('location', event.target.value)} />
          </Field>
          <Field label="Project type">
            <input required maxLength={100} placeholder="Housing society, apartments…" value={payload.projectType} onChange={(event) => update('projectType', event.target.value)} />
          </Field>
          <Field label="Status">
            <select value={payload.status} onChange={(event) => update('status', event.target.value as DevelopmentProjectStatus)}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Categories (comma separated)">
            <input value={payload.categories.join(', ')} onChange={(event) => update('categories', event.target.value.split(',').map((part) => part.trim()).filter(Boolean))} />
          </Field>
          <Field label="Starting price / range">
            <input maxLength={160} placeholder="From PKR 5,000,000" value={payload.priceRange ?? ''} onChange={(event) => update('priceRange', event.target.value)} />
          </Field>
          <Field label="Landing page display order">
            <input type="number" min="0" step="1" value={payload.displayOrder} onChange={(event) => update('displayOrder', Math.max(0, Number(event.target.value) || 0))} />
          </Field>
          <Field label="Short description" className="sm:col-span-2">
            <textarea required maxLength={300} rows={2} value={payload.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} />
          </Field>
          <Field label="Full description" className="sm:col-span-2">
            <textarea required maxLength={12000} rows={6} value={payload.description} onChange={(event) => update('description', event.target.value)} />
          </Field>
          <Field label="Amenities (one per line)" className="sm:col-span-2">
            <textarea rows={4} value={payload.amenities.join('\n')} onChange={(event) => update('amenities', lines(event.target.value))} />
          </Field>
          <Field label="Additional information (one Label: Value per line)" className="sm:col-span-2">
            <textarea
              rows={4}
              value={Object.entries(payload.additionalInformation).map(([key, value]) => `${key}: ${value}`).join('\n')}
              onChange={(event) => update('additionalInformation', Object.fromEntries(lines(event.target.value).map((line) => {
                const separator = line.indexOf(':');
                return separator < 0 ? [line, ''] : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
              }).filter(([key, value]) => Boolean(key && value))))}
            />
          </Field>
        </section>

        <section className="grid gap-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-base font-bold text-white">Project imagery</h2>
          <Field label="Cover image (JPEG, PNG, or WebP)">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0])} />
          </Field>
          {coverPreview && (
            <div className="relative h-48 overflow-hidden rounded-xl border border-slate-700">
              <img src={coverPreview} alt="Project cover preview" className="h-full w-full object-cover" />
              <button type="button" onClick={() => { setCoverFile(undefined); update('coverImage', ''); }} aria-label="Remove cover image" className="absolute right-2 top-2 rounded-full bg-slate-950/80 p-2 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <Field label="Add gallery images (up to 20 per upload)">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setGalleryFiles(Array.from(event.target.files ?? []))} />
          </Field>
          {(payload.gallery.length > 0 || galleryPreviews.length > 0) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {payload.gallery.map((image, index) => (
                <div key={`${image}-${index}`} className="relative aspect-video overflow-hidden rounded-lg">
                  <img src={image} alt={`Project gallery ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => update('gallery', payload.gallery.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove gallery image ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1.5 text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {galleryPreviews.map((image, index) => (
                <div key={image} className="relative aspect-video overflow-hidden rounded-lg">
                  <img src={image} alt={`New gallery image ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setGalleryFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove new gallery image ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1.5 text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Payment plan</h2>
              <p className="mt-1 text-xs text-slate-400">Project-specific payment schedule and document.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <input type="checkbox" checked={payload.paymentPlan.enabled} onChange={(event) => updatePayment('enabled', event.target.checked)} />
              Enable
            </label>
          </div>
          {payload.paymentPlan.enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payment plan title">
                <input value={payload.paymentPlan.title ?? ''} onChange={(event) => updatePayment('title', event.target.value)} />
              </Field>
              <Field label="Total price">
                <input type="number" min="0" value={payload.paymentPlan.totalPrice ?? ''} onChange={(event) => updatePayment('totalPrice', parseAmount(event.target.value))} />
              </Field>
              <Field label="Booking amount">
                <input type="number" min="0" value={payload.paymentPlan.bookingAmount ?? ''} onChange={(event) => updatePayment('bookingAmount', parseAmount(event.target.value))} />
              </Field>
              <Field label="Confirmation amount">
                <input type="number" min="0" value={payload.paymentPlan.confirmationAmount ?? ''} onChange={(event) => updatePayment('confirmationAmount', parseAmount(event.target.value))} />
              </Field>
              <Field label="Down payment amount">
                <input type="number" min="0" value={payload.paymentPlan.downPaymentAmount ?? ''} onChange={(event) => updatePayment('downPaymentAmount', parseAmount(event.target.value))} />
              </Field>
              <Field label="Down payment percentage">
                <input type="number" min="0" max="100" value={payload.paymentPlan.downPaymentPercentage ?? ''} onChange={(event) => updatePayment('downPaymentPercentage', parseAmount(event.target.value))} />
              </Field>
              <Field label="Installment duration">
                <input placeholder="3 years" value={payload.paymentPlan.installmentDuration ?? ''} onChange={(event) => updatePayment('installmentDuration', event.target.value)} />
              </Field>
              <Field label="Installment frequency">
                <select value={payload.paymentPlan.installmentFrequency ?? ''} onChange={(event) => updatePayment('installmentFrequency', event.target.value)}>
                  <option value="">Select frequency</option>
                  {['Monthly', 'Quarterly', 'Bi-Annual', 'Annual', 'Other'].map((frequency) => <option key={frequency}>{frequency}</option>)}
                </select>
              </Field>
              <Field label="Installments (one Title | Amount | Due after per line)" className="sm:col-span-2">
                <textarea rows={4} value={(payload.paymentPlan.milestones ?? []).map((item) => `${item.title} | ${item.amount} | ${item.dueAfter ?? ''}`).join('\n')} onChange={(event) => updatePayment('milestones', milestoneRows(event.target.value))} />
              </Field>
              <Field label="Possession amount">
                <input type="number" min="0" value={payload.paymentPlan.possessionAmount ?? ''} onChange={(event) => updatePayment('possessionAmount', parseAmount(event.target.value))} />
              </Field>
              <Field label="Charges and notes" className="sm:col-span-2">
                <textarea rows={3} value={payload.paymentPlan.notes ?? ''} onChange={(event) => updatePayment('notes', event.target.value)} />
              </Field>
              <Field label="Upload payment plan PDF or image">
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setPaymentPlanFile(event.target.files?.[0])} />
              </Field>
              {(paymentPlanFile || payload.paymentPlan.documentUrl) && (
                <div className="flex items-center gap-3 text-sm text-emerald-200">
                  {payload.paymentPlan.documentUrl && !paymentPlanFile && (
                    <a href={payload.paymentPlan.documentUrl} target="_blank" rel="noreferrer" className="underline">View current payment plan</a>
                  )}
                  {paymentPlanFile?.name}
                  <button type="button" onClick={() => { setPaymentPlanFile(undefined); updatePayment('documentUrl', undefined); }} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800" aria-label="Remove payment plan document">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <input type="checkbox" checked={payload.isPublished} onChange={(event) => update('isPublished', event.target.checked)} />
              Published on public site
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <input type="checkbox" checked={payload.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} />
              Featured project
            </label>
          </div>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
            <Upload className="h-4 w-4" /> {saving ? 'Saving…' : projectId ? 'Save changes' : 'Create project'}
          </button>
        </section>
      </form>
    </div>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block min-w-0 space-y-1.5 text-sm font-medium text-slate-300 ${className}`}>
      <span>{label}</span>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ className?: string }>, {
            className: 'min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400',
          })
        : children}
    </label>
  );
}
