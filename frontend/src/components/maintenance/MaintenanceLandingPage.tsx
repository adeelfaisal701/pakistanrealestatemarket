'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
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

function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1768c4]">{eyebrow}</p>
      )}
      <h2 id={id} className="mt-2 text-[clamp(1.6rem,5.5vw,2.4rem)] font-black leading-[1.08] tracking-[-0.035em] text-[#102b55]">
        {title}
      </h2>
      {description && <p className="mt-3 text-[15px] leading-6 text-[#52647c]">{description}</p>}
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
    <main className="overflow-x-clip bg-white text-[#102b55]">
      {/* Header (tablet/desktop) and hero — mirrors the Property landing hero at each breakpoint. */}
      <MaintenanceHeader signedIn={signedIn} />
      <MaintenanceMobileHero signedIn={signedIn} />
      <div className="hidden md:block xl:hidden">
        <MaintenanceHeroSearch />
      </div>
      <div className="hidden xl:block">
        <MaintenanceHeroSearch desktop />
      </div>

      {/* Services */}
      <section id="services" aria-labelledby="services-heading" className="scroll-mt-20 bg-[#f6f9fd] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionHeading
            id="services-heading"
            eyebrow="Our services"
            title="What can we help with?"
            description="Pick a service to see what's covered, or request a visit straight away."
          />
          <form onSubmit={findService} role="search" className="mx-auto mt-6 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-[#d5e0ee] bg-white p-1.5 shadow-[0_2px_10px_rgba(16,43,85,0.05)]">
            <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-3">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#5b6b82]" />
              <span className="sr-only">Search maintenance services</span>
              <input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search e.g. leaking tap, AC service"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#102b55] outline-none placeholder:text-[#94a3b8]"
              />
            </label>
            <button type="submit" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[#0d57ad] px-4 text-xs font-bold text-white transition hover:bg-[#0a4890]">
              Find
            </button>
          </form>
          {visibleServices.length ? (
            <ul className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {visibleServices.map((service) => (
                <li key={service.key}>
                  <Link
                    href={`/maintenance/services/${service.slug}`}
                    className="group flex h-full items-center gap-3 rounded-3xl border border-[#e3ebf5] bg-white p-4 shadow-[0_2px_10px_rgba(16,43,85,0.05)] transition hover:-translate-y-0.5 hover:border-[#bcd3ef] hover:shadow-[0_12px_28px_rgba(16,43,85,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d57ad] min-[420px]:flex-col min-[420px]:items-start"
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${service.accent}`}>
                      <ServiceIcon category={service.key} className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-extrabold leading-tight text-[#102b55]">{service.title}</span>
                      <span className="mt-1 block text-[13px] leading-5 text-[#5b6b82]">{service.tagline}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-[#9fb3cc] transition group-hover:translate-x-0.5 group-hover:text-[#0d57ad] min-[420px]:hidden" />
                  </Link>
                </li>
              ))}
              {!normalizedSearch && (
                <li>
                  <Link
                    href={REQUEST_SERVICE_PATH}
                    className="group flex h-full items-center gap-3 rounded-3xl border border-dashed border-[#9ebfe6] bg-[#edf5ff] p-4 transition hover:bg-[#e3efff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d57ad] min-[420px]:flex-col min-[420px]:items-start"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d57ad] text-white">
                      <Sparkles aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-extrabold leading-tight text-[#0d4f9e]">Not sure what you need?</span>
                      <span className="mt-1 block text-[13px] leading-5 text-[#36577f]">Describe the problem and we will route it.</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-[#0d57ad] min-[420px]:hidden" />
                  </Link>
                </li>
              )}
            </ul>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-[#cfdcee] bg-white px-4 py-8 text-center">
              <p className="text-sm text-[#53677f]">No services match “{serviceSearch}”.</p>
              <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
                <button type="button" onClick={() => setServiceSearch('')} className={pc.secondaryBtn}>Clear search</button>
                <Link href={REQUEST_SERVICE_PATH} className={pc.primaryBtn}>Describe your problem</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionHeading id="how-heading" eyebrow="How it works" title="One request. We handle the rest." description="Ghar Safar is a managed service, not a directory — our team coordinates every job for you." />
          <ol className="relative mt-10 grid gap-4 md:grid-cols-4 md:gap-5">
            <span aria-hidden="true" className="absolute left-6 top-6 h-[calc(100%-3rem)] w-px bg-gradient-to-b from-[#0d57ad]/40 to-transparent md:hidden" />
            {steps.map(({ title, description, icon: Icon }, index) => (
              <li key={title} className="relative flex gap-4 md:flex-col md:rounded-3xl md:border md:border-[#e3ebf5] md:bg-white md:p-5 md:shadow-[0_2px_10px_rgba(16,43,85,0.05)]">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d57ad] text-white shadow-[0_8px_18px_rgba(13,87,173,0.3)]">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="pb-2 pt-1 md:pt-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1768c4]">Step {index + 1}</p>
                  <h3 className="mt-1 text-base font-extrabold text-[#102b55]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5b6b82]">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why Ghar Safar */}
      <section id="why-us" aria-labelledby="why-heading" className="bg-[#0b2545] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#9ccaff]">Why Ghar Safar</p>
            <h2 id="why-heading" className="mt-2 text-[clamp(1.6rem,5.5vw,2.4rem)] font-black leading-[1.08] tracking-[-0.035em]">
              Accountable from request to sign-off
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-white/75">
              We stay responsible for quality, pricing and follow-up — so you get one point of contact instead of chasing a contractor.
            </p>
            <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-3xl border border-white/10">
              <Image src="/images/buyer-dashboard-house.png" alt="A well-maintained modern home" fill sizes="(max-width: 1023px) 100vw, 45vw" className="object-cover" />
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {promises.map(({ title, description, icon: Icon }) => (
              <li key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9ccaff]/15 text-[#9ccaff]">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-extrabold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/70">{description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Quality & feedback */}
      <section aria-labelledby="quality-heading" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionHeading id="quality-heading" eyebrow="Service quality" title="Quality you can verify" description="Every job leaves a record you can review." />
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <article className={`${pc.card} p-5`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Star aria-hidden="true" className="h-5 w-5" /></span>
              <h3 className="mt-3 text-base font-extrabold">Rated by customers</h3>
              <p className="mt-1 text-sm leading-6 text-[#5b6b82]">After every completed job you rate the service. Ratings feed into how our team assigns future work.</p>
            </article>
            <article className={`${pc.card} p-5`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Camera aria-hidden="true" className="h-5 w-5" /></span>
              <h3 className="mt-3 text-base font-extrabold">Before & after evidence</h3>
              <p className="mt-1 text-sm leading-6 text-[#5b6b82]">Technicians upload photos and complete a checklist before asking you to confirm.</p>
            </article>
            <article className={`${pc.card} p-5`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><MessageSquareWarning aria-hidden="true" className="h-5 w-5" /></span>
              <h3 className="mt-3 text-base font-extrabold">Complaints followed up</h3>
              <p className="mt-1 text-sm leading-6 text-[#5b6b82]">Raise a concern from your request page and our team reviews it until it is resolved.</p>
            </article>
          </div>
          <div className="mt-4 flex flex-col items-start gap-3 rounded-3xl border border-[#e3ebf5] bg-[#f6f9fd] p-5 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0d57ad] shadow-sm"><Star aria-hidden="true" className="h-5 w-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold">Customer reviews</h3>
              <p className="mt-0.5 text-sm text-[#5b6b82]">Verified reviews from completed Property Care jobs will be published here as they come in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Areas + FAQ */}
      <section aria-label="Service areas and frequently asked questions" className="bg-[#f6f9fd] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <SectionHeading align="left" eyebrow="Service areas" title="Serving Lahore" description="Property Care is live in Lahore. Submit a request and our team confirms availability for your exact area." />
            <div className={`${pc.card} mt-6 flex items-center gap-3 p-4`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5ff] text-[#0d57ad]"><MapPin aria-hidden="true" className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-extrabold">Lahore, Pakistan</p>
                <p className="text-xs text-[#5b6b82]">More cities coming soon</p>
              </div>
            </div>
          </div>
          <div>
            <h2 id="faq-heading" className="text-[clamp(1.4rem,5vw,1.9rem)] font-black tracking-[-0.03em]">Frequently asked questions</h2>
            <div className="mt-5 space-y-2.5">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group rounded-2xl border border-[#e3ebf5] bg-white px-4 open:shadow-[0_4px_14px_rgba(16,43,85,0.06)]">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold text-[#17365d] marker:hidden">
                    {question}
                    <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-[#56779d] transition group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 text-sm leading-6 text-[#5b6b82]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-heading" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="relative mx-auto flex max-w-[1100px] flex-col gap-5 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0d57ad] via-[#0a4890] to-[#0b2545] px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-10 opacity-10"><House className="h-44 w-44" /></div>
          <div className="relative max-w-lg">
            <h2 id="cta-heading" className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">Something need fixing?</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">Submit a request in two minutes. We will review it and get back to you with a verified technician.</p>
          </div>
          <Link href={REQUEST_SERVICE_PATH} className="relative inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-[#0d4f9e] transition hover:bg-[#edf5ff]">
            Request a service <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#062650] pb-24 text-white sm:pb-0">
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-4 md:gap-8 lg:px-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/maintenance" className="inline-flex items-center gap-2" aria-label="Ghar Safar Maintenance home">
              <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={40} height={39} className="h-9 w-9 shrink-0 object-contain" />
              <span className="text-lg font-extrabold tracking-tight">Ghar Safar</span>
            </Link>
            <p className="mt-2 text-sm text-blue-100">Har Khwab Ki Manzil, Apna Ghar.</p>
            <div className="mt-4 flex items-center gap-2" aria-label="Social networks">
              {[
                { name: 'Facebook', Icon: Facebook },
                { name: 'Instagram', Icon: Instagram },
                { name: 'YouTube', Icon: Youtube },
              ].map(({ name, Icon }) => (
                <span key={name} role="img" aria-label={name} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-blue-100">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <nav aria-label="Quick Links">
            <h2 className="mb-3 text-sm font-extrabold">Quick Links</h2>
            <ul className="space-y-2.5 text-sm text-blue-100">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><a href="#services" className="hover:text-white">Services</a></li>
              <li><a href="#how-it-works" className="hover:text-white">How it works</a></li>
              <li><Link href="/care" className="hover:text-white">Track My Requests</Link></li>
            </ul>
          </nav>

          <nav aria-label="Support">
            <h2 className="mb-3 text-sm font-extrabold">Support</h2>
            <ul className="space-y-2.5 text-sm text-blue-100">
              <li><a href="tel:+923001234567" className="hover:text-white">Help Center</a></li>
              <li><a href="tel:+923001234567" className="hover:text-white">Contact Us</a></li>
              <li><a href="#faq-heading" className="hover:text-white">FAQs</a></li>
              <li><a href="#faq-heading" className="hover:text-white">Terms &amp; Privacy</a></li>
            </ul>
          </nav>

          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-3 text-sm font-extrabold">Contact Us</h2>
            <ul className="space-y-2.5 text-sm text-blue-100">
              <li className="flex items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />Lahore, Pakistan</li>
              <li className="flex items-center gap-2"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" /><a href="tel:+923001234567" className="hover:text-white">+92 300 1234567</a></li>
              <li className="flex min-w-0 items-center gap-2"><Mail aria-hidden="true" className="h-4 w-4 shrink-0" /><a href="mailto:info@estatepro.pk" className="break-all hover:text-white">Ghar Safar Support</a></li>
              <li className="flex items-center gap-2"><Headset aria-hidden="true" className="h-4 w-4 shrink-0" />Support via your request page</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/15">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1 px-4 py-4 text-xs text-blue-100 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Ghar Safar. All rights reserved.</p>
            <p>Har Khwab Ki Manzil, Apna Ghar.</p>
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-[#e3ebf5] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(16,43,85,0.12)] backdrop-blur transition-transform duration-300 sm:hidden ${showStickyCta ? 'visible translate-y-0' : 'invisible translate-y-full'}`}
        aria-hidden={!showStickyCta}
      >
        <Link href={REQUEST_SERVICE_PATH} tabIndex={showStickyCta ? 0 : -1} className={`${pc.primaryBtn} w-full`}>
          Request a service <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
