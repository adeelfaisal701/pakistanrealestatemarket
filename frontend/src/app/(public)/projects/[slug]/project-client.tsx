'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, CheckCircle2, MapPin } from 'lucide-react';
import Navbar from '@/components/marketplace/Navbar';
import { getApiErrorMessage } from '@/lib/api-client';
import { getPublishedProject } from '@/lib/projects';
import type { DevelopmentProject } from '@/types/development-project';

function formatCurrency(value?: number) {
  if (value === undefined || value === null) return undefined;
  return `PKR ${new Intl.NumberFormat('en-PK').format(value)}`;
}

export default function ProjectDetailsPage({
  slug,
  initialProject,
}: {
  slug: string;
  /** Project fetched on the server so the page is rendered for search engines. */
  initialProject?: DevelopmentProject;
}) {
  const [project, setProject] = useState<DevelopmentProject | undefined>(initialProject);
  const [loading, setLoading] = useState(!initialProject);
  const [error, setError] = useState('');
  const initialConsumed = useRef(false);

  useEffect(() => {
    let active = true;
    if (initialProject?.slug === slug && !initialConsumed.current) {
      initialConsumed.current = true;
      return;
    }
    initialConsumed.current = true;
    getPublishedProject(slug)
      .then((result) => {
        if (active) setProject(result);
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
    // initialProject is a one-time seed for the first render only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const gallery = project
    ? [...new Set([project.coverImage, ...project.gallery].filter((image): image is string => Boolean(image)))]
    : [];
  const paymentPlan = project?.paymentPlan?.enabled ? project.paymentPlan : undefined;

  return (
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>

        {loading ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading project…</p>
        ) : error || !project ? (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error || 'Project not found.'}
          </div>
        ) : (
          <>
            <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="relative m-3 aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-200 md:m-0 md:aspect-[2.4/1] md:rounded-none md:min-h-0">
                {project.coverImage ? (
                  <img src={project.coverImage} alt={project.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"><Building2 className="h-14 w-14 text-emerald-700" /></div>
                )}
                <div className="absolute inset-0 hidden bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent md:block" />
                <div className="absolute inset-x-0 bottom-0 hidden p-8 text-white md:block">
                  <span className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950">{project.status}</span>
                  <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{project.name}</h1>
                  <p className="mt-2 text-sm text-white/85">{project.developer}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/90">
                    <MapPin className="h-4 w-4 text-emerald-300" />{project.location}
                  </p>
                  {project.priceRange && <p className="mt-3 text-lg font-bold text-emerald-200">{project.priceRange}</p>}
                </div>
              </div>

              <div className="min-w-0 px-5 pb-5 pt-2 md:hidden">
                <span className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950">{project.status}</span>
                <h1 className="mt-4 min-w-0 break-words text-3xl font-extrabold leading-tight [overflow-wrap:anywhere]">{project.name}</h1>
                <p className="mt-2 break-words text-sm text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{project.developer}</p>
                <p className="mt-3 flex min-w-0 items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">{project.location}</span>
                </p>
                {project.priceRange && <p className="mt-3 break-words text-lg font-bold text-emerald-600 [overflow-wrap:anywhere] dark:text-emerald-300">{project.priceRange}</p>}
              </div>

              <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <article className="min-w-0">
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{project.shortDescription}</p>
                  <h2 className="mt-7 text-xl font-bold">About the project</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{project.description}</p>
                  {project.categories.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {project.categories.map((category) => <span key={category} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{category}</span>)}
                    </div>
                  )}
                </article>
                <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                  <h2 className="text-sm font-bold">Project overview</h2>
                  <dl className="mt-3 divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <InfoRow label="Developer" value={project.developer} />
                    <InfoRow label="Type" value={project.projectType} />
                    <InfoRow label="Location" value={project.location} />
                    {project.priceRange && <InfoRow label="Starting price" value={project.priceRange} />}
                  </dl>
                </aside>
              </div>
            </section>

            {gallery.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl font-bold">Project gallery</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.map((image, index) => (
                    <img key={image} src={image} alt={`${project.name} gallery image ${index + 1}`} className="aspect-[4/3] w-full rounded-2xl border border-slate-200 object-cover dark:border-slate-800" loading="lazy" />
                  ))}
                </div>
              </section>
            )}

            {project.amenities.length > 0 && (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                <h2 className="text-xl font-bold">Amenities & facilities</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {project.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{amenity}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {Object.keys(project.additionalInformation ?? {}).length > 0 && (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                <h2 className="text-xl font-bold">Additional information</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Object.entries(project.additionalInformation).map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {paymentPlan && (
              <section className="mt-8 rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900 dark:bg-slate-900 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Project payment plan</p>
                    <h2 className="mt-1 text-xl font-bold">{paymentPlan.title || 'Payment schedule'}</h2>
                  </div>
                  {paymentPlan.totalPrice !== undefined && (
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-right dark:bg-emerald-950/50">
                      <p className="text-[10px] font-bold uppercase text-emerald-700">Total price</p>
                      <p className="mt-1 text-sm font-extrabold">{formatCurrency(paymentPlan.totalPrice)}</p>
                    </div>
                  )}
                </div>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <AmountCard label="Booking amount" value={paymentPlan.bookingAmount} />
                  <AmountCard label="Confirmation amount" value={paymentPlan.confirmationAmount} />
                  <AmountCard label="Down payment" value={paymentPlan.downPaymentAmount} suffix={paymentPlan.downPaymentPercentage !== undefined ? ` (${paymentPlan.downPaymentPercentage}%)` : undefined} />
                  <AmountCard label="Installment duration" text={paymentPlan.installmentDuration} />
                  <AmountCard label="Installment frequency" text={paymentPlan.installmentFrequency} />
                  <AmountCard label="Possession amount" value={paymentPlan.possessionAmount} />
                </dl>
                {paymentPlan.milestones.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold">Installment schedule</h3>
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      {paymentPlan.milestones.map((milestone, index) => (
                        <div key={`${milestone.title}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3 text-sm last:border-b-0 dark:border-slate-700">
                          <span className="font-semibold">{milestone.title}{milestone.dueAfter ? <span className="ml-2 text-xs font-normal text-slate-500">· {milestone.dueAfter}</span> : null}</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(milestone.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {paymentPlan.notes && <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{paymentPlan.notes}</p>}
                {paymentPlan.documentUrl && (
                  <a href={paymentPlan.documentUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
                    View payment plan document
                  </a>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function AmountCard({
  label,
  value,
  text,
  suffix,
}: {
  label: string;
  value?: number;
  text?: string;
  suffix?: string;
}) {
  const display = text || (value !== undefined ? `${formatCurrency(value)}${suffix ?? ''}` : undefined);
  if (!display) return null;
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold">{display}</p>
    </div>
  );
}
