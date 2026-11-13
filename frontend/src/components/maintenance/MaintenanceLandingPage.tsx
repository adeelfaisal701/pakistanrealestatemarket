'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Facebook,
  Headset,
  House,
  Instagram,
  ListChecks,
  Mail,
  MapPin,
  MessageSquareWarning,
  Phone,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
  Youtube,
} from 'lucide-react';
import { PROPERTY_CARE_SERVICES, REQUEST_SERVICE_PATH } from '@/lib/property-care-services';
import { ServiceIcon, pc } from '@/components/property-care/PropertyCareUI';
import { MaintenanceHeader, MaintenanceHeroSearch, MaintenanceMobileHero } from './MaintenanceHero';

/*
 * Layout note: below `md` (768px — the same breakpoint the hero switches at)
 * every section uses an app-style mobile layout; `md:` classes restore the
 * desktop/tablet layout.
 */

const steps = [
  {
    title: 'Submit your request',
    description: 'Choose a service, describe the problem, add photos and a preferred visit time.',
    icon: ClipboardList,
  },
  {
    title: 'We review & assign',
    description: 'Our operations team reviews it and dispatches a verified technician with the right skills.',
    icon: UserRoundCheck,
  },
  {
    title: 'Approve the quotation',
    description: 'You see a clear breakdown of inspection, labour and materials before chargeable work starts.',
    icon: ReceiptText,
  },
  {
    title: 'Track & confirm',
    description: 'Follow every step, review before/after photos and confirm when you are satisfied.',
    icon: CheckCircle2,
  },
];

const promises = [
  {
    title: 'Admin-vetted technicians',
    description: 'Every technician is onboarded and managed by Ghar Safar — you never have to search or negotiate.',
    icon: ShieldCheck,
  },
  {
    title: 'Upfront quotations',
    description: 'Itemised pricing you approve in the app before chargeable work begins.',
    icon: ReceiptText,
  },
  {
    title: 'Photo proof of work',
    description: 'Before and after photos and a completion checklist on every job.',
    icon: Camera,
  },
  {
    title: 'You confirm completion',
    description: 'A job closes only when you confirm it — or raise a complaint we follow up on.',
    icon: ListChecks,
  },
];

const qualityPoints = [
  {
    title: 'Rated by customers',
    description: 'After every completed job you rate the service. Ratings feed into how our team assigns future work.',
    icon: Star,
  },
  {
    title: 'Before & after evidence',
    description: 'Technicians upload photos and complete a checklist before asking you to confirm.',
    icon: Camera,
  },
  {
    title: 'Complaints followed up',
    description: 'Raise a concern from your request page and our team reviews it until it is resolved.',
    icon: MessageSquareWarning,
  },
];

const faqs = [
  {
    question: 'How do I book a service?',
    answer:
      'Choose a service and sign in with your Ghar Safar account to submit a request. You get a reference ID instantly and can track every step online.',
  },
  {
    question: 'Do I choose the technician?',
    answer:
      'No. Ghar Safar operations review every request and assign a verified technician with the right skills for your area. Their name and phone appear in your request once they confirm the visit.',
  },
  {
    question: 'How is pricing decided?',
    answer:
      'Ghar Safar sends a transparent quotation — inspection, labour and materials — for your approval before chargeable work begins.',
  },
  {
    question: 'What if I am not satisfied?',
    answer:
      'Before a job is closed you confirm the work. If something is wrong, raise a complaint from your request page and our team will review it with you.',
  },
  {
    question: 'Which areas do you cover?',
    answer: 'Property Care currently serves Lahore. Submit a request and our team will confirm availability for your area.',
  },
];

const sectionX = 'px-4 sm:px-6 lg:px-8';
const container = 'mx-auto max-w-[1180px]';
const softShadow = 'shadow-[0_1px_2px_rgba(15,39,71,0.04),0_12px_32px_-22px_rgba(15,39,71,0.28)]';
const hideScrollbar = '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  align = 'center',
  tone = 'light',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  /** `center` centres from md up; on phones headings stay left-aligned. */
  align?: 'center' | 'left';
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <div className={align === 'center' ? 'max-w-2xl md:mx-auto md:text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${dark ? 'text-care-300' : 'text-care-600'}`}>{eyebrow}</p>
      )}
      <h2 id={id} className={`mt-2 text-[clamp(1.6rem,5vw,2.5rem)] font-extrabold leading-[1.12] tracking-[-0.03em] md:mt-2.5 ${dark ? 'text-white' : 'text-care-ink'}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-2.5 text-[14px] leading-6 md:mt-3 md:text-[15px] md:leading-7 ${dark ? 'text-white/70' : 'text-[#64748b]'}`}>{description}</p>
      )}
    </div>
  );
}

export default function MaintenanceLandingPage() {
  const [serviceSearch, setServiceSearch] = useState('');
  const [showStickyCta, setShowStickyCta] = useState(false);
  // Display-only hint; dashboards verify the account role with the backend.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    try {
      setSignedIn(Boolean(localStorage.getItem('auth_token')));
    } catch {
      setSignedIn(false);
    }
  }, []);
  const normalizedSearch = serviceSearch.trim().toLowerCase();
  const visibleServices = useMemo(
    () =>
      PROPERTY_CARE_SERVICES.filter((service) =>
        `${service.title} ${service.tagline} ${service.commonJobs.join(' ')}`.toLowerCase().includes(normalizedSearch),
      ),
    [normalizedSearch],
  );

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 560);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function findService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="overflow-x-clip bg-white text-care-ink">
      {/* Header (tablet/desktop) and hero — mirrors the Property landing hero at each breakpoint. */}
      <MaintenanceHeader signedIn={signedIn} />
      <MaintenanceMobileHero signedIn={signedIn} />
      <div className="hidden md:block xl:hidden">
        <MaintenanceHeroSearch />
      </div>
      <div className="hidden xl:block">
        <MaintenanceHeroSearch desktop />
      </div>

      {/* Services — on phones a rounded "sheet" rising over the hero's bottom padding. */}
      <section
        id="services"
        aria-labelledby="services-heading"
        className={`relative z-10 -mt-4 scroll-mt-4 rounded-t-[26px] bg-white pb-12 pt-8 md:mt-0 md:scroll-mt-20 md:rounded-none md:border-b md:border-[#e6ecf5] md:bg-care-50 md:py-20 ${sectionX}`}
      >
        <span aria-hidden="true" className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-[#dbe4f0] md:hidden" />
        <div className={container}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              align="left"
              id="services-heading"
              eyebrow="Our services"
              title="What can we help with?"
              description="Pick a service to see what's covered, or request a visit straight away."
            />
            <form
              onSubmit={findService}
              role="search"
              className="flex w-full items-center gap-2 rounded-full border border-[#d4deeb] bg-white p-1.5 shadow-[0_1px_2px_rgba(15,39,71,0.05)] transition focus-within:border-care-500 focus-within:ring-4 focus-within:ring-care-500/10 md:rounded-xl lg:max-w-md"
            >
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 pl-3">
                <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-[#64748b]" />
                <span className="sr-only">Search maintenance services</span>
                <input
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Search e.g. leaking tap, AC service"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-care-ink outline-none placeholder:text-[#94a3b8] md:text-sm"
                />
              </label>
              <button type="submit" className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-care-600 px-5 text-xs font-bold text-white transition hover:bg-care-700 md:rounded-lg md:px-4">
                Find
              </button>
            </form>
          </div>

          {visibleServices.length ? (
            <ul className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:gap-4 lg:grid-cols-4">
              {visibleServices.map((service) => (
                <li key={service.key}>
                  <Link
                    href={`/maintenance/services/${service.slug}`}
                    className={`group flex h-full flex-col rounded-2xl border border-[#e2e9f3] bg-white p-4 ${softShadow} transition duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:border-care-300 hover:shadow-[0_18px_40px_-24px_rgba(15,39,71,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-500 md:p-5 md:shadow-[0_1px_2px_rgba(15,39,71,0.04)]`}
                  >
                    <span className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-care-100 text-care-600 transition-colors group-hover:bg-care-600 group-hover:text-white md:h-12 md:w-12">
                        <ServiceIcon category={service.key} className="h-[22px] w-[22px] md:h-6 md:w-6" />
                      </span>
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a9bcd6] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-care-600 md:h-5 md:w-5" />
                    </span>
                    <span className="mt-3.5 text-[14px] font-bold leading-snug text-care-ink md:mt-4 md:text-[15px]">{service.title}</span>
                    <span className="mt-1 line-clamp-2 text-[12px] leading-[1.45] text-[#64748b] md:text-[13px] md:leading-5">{service.tagline}</span>
                    <span className="mt-4 hidden flex-wrap gap-1.5 md:flex">
                      {service.commonJobs.slice(0, 2).map((job) => (
                        <span key={job} className="max-w-full truncate rounded-full border border-care-100 bg-care-50 px-2.5 py-1 text-[11px] font-semibold text-care-700">
                          {job}
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
              {!normalizedSearch && (
                <li>
                  {/* Phones: a solid blue tile that completes the 2-column grid. */}
                  <Link
                    href={REQUEST_SERVICE_PATH}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-care-600 to-care-800 p-4 text-white shadow-[0_16px_32px_-18px_rgba(22,96,208,0.85)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-500 focus-visible:ring-offset-2 md:hidden"
                  >
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-white/10" />
                    <span className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
                        <Sparkles aria-hidden="true" className="h-[22px] w-[22px]" />
                      </span>
                      <ArrowRight aria-hidden="true" className="h-4 w-4 text-white/80" />
                    </span>
                    <span className="mt-3.5 text-[14px] font-bold leading-snug">Not sure what you need?</span>
                    <span className="mt-1 text-[12px] leading-[1.45] text-care-100">Describe the problem and we will route it.</span>
                  </Link>
                  {/* Tablet & desktop: dashed fallback card. */}
                  <Link
                    href={REQUEST_SERVICE_PATH}
                    className="group hidden h-full flex-col rounded-2xl border border-dashed border-care-300 bg-white/70 p-5 transition hover:border-care-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-500 md:flex"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-care-600 text-white shadow-[0_10px_22px_-10px_rgba(22,96,208,0.7)]">
                      <Sparkles aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="mt-4 block text-[15px] font-bold leading-tight text-care-700">Not sure what you need?</span>
                    <span className="mt-1 block text-[13px] leading-5 text-[#475569]">Describe the problem and we will route it.</span>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-care-600">
                      Describe your problem <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#cdd9e9] bg-white px-4 py-10 text-center md:mt-8">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-care-100 text-care-600">
                <Search aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm text-[#475569]">No services match “{serviceSearch}”.</p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <button type="button" onClick={() => setServiceSearch('')} className={pc.secondaryBtn}>Clear search</button>
                <Link href={REQUEST_SERVICE_PATH} className={pc.primaryBtn}>Describe your problem</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works — phones: one card with a numbered vertical stepper. */}
      <section id="how-it-works" aria-labelledby="how-heading" className={`scroll-mt-4 bg-care-50 py-12 md:scroll-mt-20 md:bg-white md:py-20 ${sectionX}`}>
        <div className={container}>
          <SectionHeading
            id="how-heading"
            eyebrow="How it works"
            title="One request. We handle the rest."
            description="Ghar Safar is a managed service, not a directory — our team coordinates every job for you."
          />
          <ol className={`relative mt-7 rounded-2xl border border-[#e2e9f3] bg-white p-5 ${softShadow} md:mt-12 md:grid md:grid-cols-4 md:gap-6 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
            <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-care-200 via-care-300 to-care-200 md:block" />
            {steps.map(({ title, description, icon: Icon }, index) => (
              <li key={title} className="relative flex gap-4 pb-6 last:pb-0 md:flex-col md:items-center md:pb-0 md:text-center">
                {index < steps.length - 1 && (
                  <span aria-hidden="true" className="absolute bottom-1 left-[19.5px] top-11 w-px bg-gradient-to-b from-care-300 to-care-100 md:hidden" />
                )}
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-care-600 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(22,96,208,0.8)] md:h-14 md:w-14 md:rounded-2xl md:shadow-[0_14px_30px_-12px_rgba(22,96,208,0.65)] md:ring-8 md:ring-white">
                  <span className="md:hidden">{index + 1}</span>
                  <Icon aria-hidden="true" className="hidden h-6 w-6 md:block" />
                </span>
                <div className="min-w-0 pt-1.5 md:mt-5 md:pt-0">
                  <p className="hidden text-[11px] font-extrabold uppercase tracking-[0.16em] text-care-600 md:block">
                    Step {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="text-[15px] font-bold text-care-ink md:mt-1 md:text-base">{title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-[#64748b] md:mx-auto md:mt-1.5 md:max-w-[15rem] md:text-sm md:leading-6">{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 md:mt-12 md:flex md:justify-center">
            <Link href={REQUEST_SERVICE_PATH} className={`${pc.primaryBtn} w-full md:w-auto`}>
              Start a request <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Ghar Safar — phones: promises become a swipeable carousel. */}
      <section id="why-us" aria-labelledby="why-heading" className={`relative isolate overflow-hidden bg-care-950 py-12 text-white md:py-20 ${sectionX}`}>
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 -z-10 h-96 w-96 rounded-full bg-care-600/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-care-500/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-care-400/50 to-transparent" />
        <div className={`${container} grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14`}>
          <div>
            <SectionHeading
              align="left"
              tone="dark"
              id="why-heading"
              eyebrow="Why Ghar Safar"
              title="Accountable from request to sign-off"
              description="We stay responsible for quality, pricing and follow-up — so you get one point of contact instead of chasing a contractor."
            />
            <div className="relative mt-7 md:mt-8">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] md:aspect-[16/10]">
                <Image src="/images/buyer-dashboard-house.png" alt="A well-maintained modern home" fill sizes="(max-width: 1023px) 100vw, 45vw" className="object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-care-950/50 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-xl border border-white/60 bg-white/95 p-3.5 text-care-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] backdrop-blur sm:left-6 sm:right-auto sm:max-w-xs">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-care-600 text-white">
                  <Headset aria-hidden="true" className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">One point of contact</span>
                  <span className="block text-xs text-[#64748b]">Quality · Pricing · Follow-up</span>
                </span>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <ul
              aria-label="Our promises"
              className={`-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 ${hideScrollbar} sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:mt-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0`}
            >
              {promises.map(({ title, description, icon: Icon }, index) => (
                <li key={title} className="group w-[78%] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition hover:border-care-400/40 hover:bg-white/[0.07] sm:w-[55%] md:w-auto">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-care-500/15 text-care-300 ring-1 ring-inset ring-care-400/20">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span aria-hidden="true" className="text-xs font-bold tabular-nums text-white/30">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-bold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-white/65">{description}</p>
                </li>
              ))}
            </ul>
            <p aria-hidden="true" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-white/45 md:hidden">
              Swipe for more <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </div>
        </div>
      </section>

      {/* Quality & feedback — phones: one grouped card with divided rows. */}
      <section aria-labelledby="quality-heading" className={`bg-white py-12 md:py-20 ${sectionX}`}>
        <div className={container}>
          <SectionHeading id="quality-heading" eyebrow="Service quality" title="Quality you can verify" description="Every job leaves a record you can review." />
          <div className={`mt-7 divide-y divide-[#edf2f8] overflow-hidden rounded-2xl border border-[#e2e9f3] bg-white ${softShadow} md:mt-10 md:grid md:grid-cols-3 md:gap-4 md:divide-y-0 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:shadow-none`}>
            {qualityPoints.map(({ title, description, icon: Icon }) => (
              <article key={title} className={`flex gap-4 p-4 md:block md:rounded-2xl md:border md:border-[#e2e9f3] md:bg-white md:p-6 md:shadow-[0_1px_2px_rgba(15,39,71,0.04),0_12px_32px_-20px_rgba(15,39,71,0.25)] md:transition md:hover:border-care-200`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-care-100 text-care-600 md:h-12 md:w-12">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold md:mt-4 md:text-base">{title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-[#64748b] md:mt-1.5 md:text-sm md:leading-6">{description}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-care-100 bg-care-50 p-4 md:mt-4 md:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-care-600 shadow-sm ring-1 ring-care-100 md:h-11 md:w-11">
              <Star aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold">Customer reviews</h3>
              <p className="mt-0.5 text-[13px] leading-5 text-[#64748b] md:text-sm">Verified reviews from completed Property Care jobs will be published here as they come in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Areas + FAQ */}
      <section aria-label="Service areas and frequently asked questions" className={`border-y border-[#e6ecf5] bg-care-50 py-12 md:py-20 ${sectionX}`}>
        <div className={`${container} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14`}>
          <div>
            <SectionHeading align="left" eyebrow="Service areas" title="Serving Lahore" description="Property Care is live in Lahore. Submit a request and our team confirms availability for your exact area." />
            <div className="mt-6 space-y-3">
              <div className={`${pc.card} flex items-center gap-3 p-4`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-care-100 text-care-600"><MapPin aria-hidden="true" className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-bold">Lahore, Pakistan</p>
                  <p className="text-xs text-[#64748b]">More cities coming soon</p>
                </div>
              </div>
              <Link href="/care" className={`${pc.card} group flex items-center gap-3 p-4 transition active:scale-[0.99] hover:border-care-300`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-care-100 text-care-600"><Headset aria-hidden="true" className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Already have a request?</p>
                  <p className="text-xs text-[#64748b]">Track it and get support from your request page</p>
                </div>
                <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-[#94a3b8] transition group-hover:translate-x-0.5 group-hover:text-care-600" />
              </Link>
            </div>
          </div>
          <div>
            <h2 id="faq-heading" className="scroll-mt-4 text-[clamp(1.4rem,4.5vw,1.9rem)] font-extrabold tracking-[-0.03em] md:scroll-mt-24">Frequently asked questions</h2>
            <div className="mt-5 space-y-2.5">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group rounded-xl border border-[#e2e9f3] bg-white px-4 transition open:border-care-200 open:shadow-[0_12px_30px_-20px_rgba(15,39,71,0.3)] md:px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-care-ink marker:hidden [&::-webkit-details-marker]:hidden">
                    {question}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-care-50 text-care-600 transition group-open:rotate-180 group-open:bg-care-600 group-open:text-white">
                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="pb-5 pr-2 text-sm leading-6 text-[#64748b] md:pr-10">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-heading" className={`bg-white py-12 md:py-20 ${sectionX}`}>
        <div className="relative mx-auto flex max-w-[1180px] flex-col gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-care-600 via-care-700 to-care-900 px-5 py-9 text-white shadow-[0_30px_70px_-35px_rgba(22,96,208,0.75)] sm:px-12 sm:py-12 md:flex-row md:items-center md:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 opacity-[0.08]"><House className="h-56 w-56" /></div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-care-400/30 blur-3xl" />
          <div className="relative max-w-lg">
            <h2 id="cta-heading" className="text-[24px] font-extrabold tracking-[-0.03em] sm:text-3xl">Something need fixing?</h2>
            <p className="mt-2 text-sm leading-6 text-care-100">Submit a request in two minutes. We will review it and get back to you with a verified technician.</p>
          </div>
          <div className="relative flex shrink-0 flex-col gap-2.5 md:flex-row">
            <Link href={REQUEST_SERVICE_PATH} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-care-700 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.4)] transition active:scale-[0.98] hover:bg-care-50">
              Request a service <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/care" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-6 text-sm font-bold text-white transition hover:bg-white/10">
              Track my requests
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-care-950 pb-28 text-white md:pb-0">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-care-500/70 to-transparent" />
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-x-6 gap-y-9 px-4 py-11 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.3fr] md:gap-8 md:py-12 lg:px-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/maintenance" className="inline-flex items-center gap-2.5" aria-label="Ghar Safar Maintenance home">
              <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={40} height={39} className="h-10 w-10 shrink-0 object-contain" />
              <span className="leading-none">
                <span className="block text-lg font-extrabold tracking-tight">Ghar Safar</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-care-300">Property Care</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">Har Khwab Ki Manzil, Apna Ghar.</p>
            <div className="mt-5 flex items-center gap-2" aria-label="Social networks">
              {[
                { name: 'Facebook', Icon: Facebook },
                { name: 'Instagram', Icon: Instagram },
                { name: 'YouTube', Icon: Youtube },
              ].map(({ name, Icon }) => (
                <span key={name} role="img" aria-label={name} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-slate-300">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <nav aria-label="Quick Links">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Quick Links</h2>
            <ul className="space-y-1 text-sm text-slate-300 md:space-y-2.5">
              <li><Link href="/" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">Home</Link></li>
              <li><a href="#services" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">Services</a></li>
              <li><a href="#how-it-works" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">How it works</a></li>
              <li><Link href="/care" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">Track My Requests</Link></li>
            </ul>
          </nav>

          <nav aria-label="Support">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Support</h2>
            <ul className="space-y-1 text-sm text-slate-300 md:space-y-2.5">
              <li><a href="tel:+923001234567" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">Help Center</a></li>
              <li><a href="tel:+923001234567" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">Contact Us</a></li>
              <li><a href="#faq-heading" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">FAQs</a></li>
              <li><a href="#faq-heading" className="inline-flex min-h-9 items-center transition-colors hover:text-white md:min-h-0">Terms &amp; Privacy</a></li>
            </ul>
          </nav>

          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Contact Us</h2>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2.5"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-care-400" />Lahore, Pakistan</li>
              <li className="flex items-center gap-2.5"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-care-400" /><a href="tel:+923001234567" className="transition-colors hover:text-white">+92 300 1234567</a></li>
              <li className="flex min-w-0 items-center gap-2.5"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-care-400" /><a href="mailto:info@estatepro.pk" className="break-all transition-colors hover:text-white">Ghar Safar Support</a></li>
              <li className="flex items-center gap-2.5"><Headset aria-hidden="true" className="h-4 w-4 shrink-0 text-care-400" />Support via your request page</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Ghar Safar. All rights reserved.</p>
            <p>Har Khwab Ki Manzil, Apna Ghar.</p>
          </div>
        </div>
      </footer>

      {/* Mobile sticky action bar (appears once the hero has scrolled away). */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-[#e2e9f3] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,39,71,0.12)] backdrop-blur transition-transform duration-300 md:hidden ${showStickyCta ? 'visible translate-y-0' : 'invisible translate-y-full'}`}
        aria-hidden={!showStickyCta}
      >
        <div className="mx-auto flex max-w-lg gap-2.5">
          <Link
            href="/care"
            tabIndex={showStickyCta ? 0 : -1}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-care-200 bg-white px-4 text-sm font-bold text-care-700 transition active:scale-[0.98]"
          >
            <ClipboardList aria-hidden="true" className="h-4 w-4" /> Track
          </Link>
          <Link href={REQUEST_SERVICE_PATH} tabIndex={showStickyCta ? 0 : -1} className={`${pc.primaryBtn} flex-1`}>
            Request a service <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
