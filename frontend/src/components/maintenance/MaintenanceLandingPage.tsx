'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Brush,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Droplets,
  Facebook,
  Headset,
  House,
  Instagram,
  Mail,
  MapPin,
  Paintbrush,
  Phone,
  Search,
  ShieldCheck,
  Snowflake,
  Star,
  Wrench,
  Youtube,
  Zap,
} from 'lucide-react';

const services = [
  { title: 'Plumbing', search: 'plumbing', icon: Droplets },
  { title: 'Electrical', search: 'electrical', icon: Zap },
  { title: 'AC Repair', search: 'ac', icon: Snowflake },
  { title: 'Painting', search: 'painting', icon: Paintbrush },
  { title: 'Cleaning', search: 'cleaning', icon: Brush },
  { title: 'Carpentry', search: 'carpentry', icon: Wrench },
  { title: 'General Repairs', search: 'general', icon: BadgeCheck },
  { title: 'Home Renovation', search: 'renovation', icon: House },
];

const benefits = [
  { title: 'Verified & Skilled Professionals', icon: ShieldCheck },
  { title: 'Transparent Pricing', icon: Check },
  { title: 'On-Time Service', icon: Clock3 },
  { title: 'Reliable Support', icon: Headset },
];

const steps = [
  { title: 'Choose a Service', description: 'Tell us what your home needs.', icon: CalendarDays },
  { title: 'Confirm Your Booking', description: 'We’ll help arrange a convenient time.', icon: ClipboardCheck },
  { title: 'Get the Work Done', description: 'A professional takes care of the job.', icon: Wrench },
];

const workGallery = [
  { title: 'Plumbing & repairs', positionClass: 'object-[7%_55%]' },
  { title: 'Electrical work', positionClass: 'object-[35%_52%]' },
  { title: 'AC maintenance', positionClass: 'object-[67%_44%]' },
  { title: 'Painting & finishing', positionClass: 'object-[83%_56%]' },
];

const faqs = [
  {
    question: 'How can I book a service?',
    answer: 'Choose a service above, then call our team to discuss your request and next steps.',
  },
  {
    question: 'Are professionals verified?',
    answer: 'Our maintenance provider directory is being prepared. Contact our team to ask about a provider before arranging a visit.',
  },
  {
    question: 'What if I am not satisfied?',
    answer: 'Please contact our support team so we can understand the issue and help you with the next steps.',
  },
  {
    question: 'How do payments work?',
    answer: 'Please confirm the service scope, estimate and payment terms with the provider before work begins.',
  },
];

function SectionTitle({
  eyebrow,
  title,
  description,
  centered = false,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
  id?: string;
}) {
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className={`mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#1768c4] sm:text-[11px] ${centered ? 'justify-center' : ''}`}>
          {centered && <span className="h-px w-6 bg-[#1768c4]" />}
          {eyebrow}
          <span className="h-px w-6 bg-[#1768c4]" />
        </p>
      )}
      <h2 id={id} className="text-[clamp(1.45rem,3.8vw,2.1rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#102b55]">
        {title}
      </h2>
      {description && <p className="mt-2 text-xs leading-5 text-[#52647c] sm:text-sm sm:leading-6">{description}</p>}
    </div>
  );
}

function ContactLink({ children, className }: { children: ReactNode; className: string }) {
  return (
    <a href="tel:+923001234567" className={className}>
      {children}
    </a>
  );
}

export default function MaintenanceLandingPage() {
  const [serviceSearch, setServiceSearch] = useState('');
  const [location, setLocation] = useState('');
  const normalizedSearch = serviceSearch.trim().toLowerCase();
  const visibleServices = useMemo(
    () => services.filter((service) => `${service.title} ${service.search}`.toLowerCase().includes(normalizedSearch)),
    [normalizedSearch],
  );

  function findService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="overflow-hidden bg-white text-[#102b55]">
      <header className="bg-white">
        <div className="mx-auto flex min-h-[62px] max-w-[1180px] items-center justify-between gap-2 px-4 sm:min-h-[72px] sm:px-6 lg:px-8">
          <Link href="/maintenance" className="inline-flex min-w-0 items-center gap-2" aria-label="Ghar Safar home">
            <Image
              src="/images/ghar-safar-logo.png"
              unoptimized
              alt="Ghar Safar logo"
              width={40}
              height={39}
              className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
            />
            <span className="truncate text-[17px] font-black tracking-[-0.04em] text-[#102b55] sm:text-xl">Ghar Safar</span>
          </Link>
          <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
            <Link href="/login" className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#b8cce4] bg-white px-3 text-[11px] font-bold text-[#0d57ad] transition hover:bg-[#f4f8fd] sm:min-h-10 sm:px-5 sm:text-xs">
              Sign In
            </Link>
            <Link href="/register" className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#0d57ad] px-3.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#094787] sm:min-h-10 sm:px-5 sm:text-xs">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <section aria-labelledby="maintenance-hero-heading" className="relative isolate min-h-[620px] overflow-hidden bg-[#08284e] sm:min-h-[640px] md:min-h-[560px]">
        <Image
          src="/images/maintance hero section.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="z-[-2] object-cover object-[62%_center] md:object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 z-[-1] bg-[#071d38]/40" />
        <div aria-hidden="true" className="absolute inset-0 z-[-1] bg-gradient-to-r from-[#061a34]/90 via-[#08284e]/75 to-[#08284e]/25 md:from-[#061a34]/90 md:via-[#08284e]/65 md:to-[#08284e]/15" />
        <div className="relative mx-auto flex min-h-[620px] max-w-[1180px] items-center px-4 py-9 sm:min-h-[640px] sm:px-6 sm:py-12 md:min-h-[560px] lg:px-8">
          <div className="w-full max-w-[540px]">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b8d7ff] sm:text-xs">GHAR SAFAR HOME SERVICES</p>
            <h1 id="maintenance-hero-heading" className="max-w-[520px] text-[clamp(2.15rem,7vw,4rem)] font-black leading-[0.99] tracking-[-0.05em] text-white">
              Expert Home Maintenance, <span className="text-[#9ccaff]">Made Simple</span>
            </h1>
            <p className="mt-4 max-w-[420px] text-[13px] leading-5 text-white/90 sm:text-[15px] sm:leading-6">
              Professional services for a well-maintained, comfortable and happy home.
            </p>
            <form onSubmit={findService} role="search" className="mt-6 flex w-full max-w-[500px] flex-col gap-2 rounded-2xl border border-white/35 bg-white p-2 shadow-[0_14px_36px_rgba(0,0,0,0.24)] sm:mt-7 sm:flex-row sm:items-center sm:rounded-full sm:p-1.5">
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 sm:pl-4">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0d65c8]" />
                <span className="sr-only">Search maintenance services</span>
                <input
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Search a service..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#17365d] outline-none placeholder:text-[#8391a4]"
                />
              </label>
              <button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0d57ad] px-4 text-xs font-bold text-white transition hover:bg-[#094787] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d57ad] focus-visible:ring-offset-2 sm:rounded-full sm:px-5 sm:text-sm">
                Find a Service <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </form>

            <nav aria-label="Choose a Ghar Safar experience" className="mt-4 flex">
              <div className="flex items-center rounded-full border border-white/40 bg-white p-1 shadow-[0_6px_20px_rgba(0,0,0,0.2)]">
                <Link href="/" className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-[#17365d] transition hover:bg-[#f1f6fc] sm:min-h-10 sm:gap-2 sm:px-5 sm:text-sm">
                  <House aria-hidden="true" className="h-4 w-4 text-[#0d65c8]" />
                  Property
                </Link>
                <Link href="/maintenance" aria-current="page" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#0d57ad] px-3 text-[11px] font-bold text-white shadow-sm sm:min-h-10 sm:gap-2 sm:px-5 sm:text-sm">
                  <Wrench aria-hidden="true" className="h-4 w-4" />
                  Maintenance
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </section>

      <section aria-label="Ghar Safar service commitments" className="border-y border-[#e1ebf8] bg-[#edf5ff]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-3 divide-x divide-[#d4e2f4] px-2 py-3 sm:px-6 sm:py-4 lg:px-8">
          {[
            { label: 'Trusted Professionals', icon: ShieldCheck },
            { label: 'Quick Service', icon: Zap },
            { label: 'Dedicated Support', icon: Headset },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex min-h-9 items-center justify-center gap-1.5 px-1 text-center text-[9px] font-bold leading-tight text-[#183b66] sm:gap-2.5 sm:text-xs">
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0d65c8] sm:h-[18px] sm:w-[18px]" />
              {label}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="intro-heading" className="bg-white">
        <div className="mx-auto grid max-w-[1180px] items-center gap-5 px-4 py-6 sm:px-6 sm:py-8 md:grid-cols-2 md:gap-8 md:py-9 lg:px-8">
          <div className="relative aspect-[1.7] overflow-hidden rounded-xl bg-[#e6edf5] sm:rounded-2xl">
            <Image
              src="/images/mobile hero section.png"
              alt="A thoughtfully maintained modern home"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover object-center"
            />
          </div>
          <div className="max-w-lg py-1 md:px-2">
            <h2 id="intro-heading" className="text-[clamp(1.45rem,4vw,2rem)] font-black leading-[1.08] tracking-[-0.04em] text-[#102b55]">
              Complete Care for Every Corner of Your Home
            </h2>
            <p className="mt-3 text-[13px] leading-5 text-[#405875] sm:text-sm sm:leading-6">
              From small repairs to major renovations, Ghar Safar is your one-stop solution for all your home maintenance needs.
            </p>
          </div>
        </div>
      </section>

      <section id="services" aria-labelledby="services-heading" className="scroll-mt-4 px-4 pb-8 pt-1 sm:px-6 sm:pb-10 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle
            id="services-heading"
            eyebrow="OUR SERVICES"
            title="Our Maintenance Services"
            description="Professional services, all under one roof."
            centered
          />
          {visibleServices.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">
              {visibleServices.map(({ title, icon: Icon }) => (
                <a key={title} href="tel:+923001234567" className="group flex min-h-[82px] flex-col items-center justify-center gap-1 rounded-xl border border-[#e4ebf3] bg-white px-2 py-3 text-center shadow-[0_2px_8px_rgba(16,43,85,0.06)] transition hover:-translate-y-0.5 hover:border-[#c5d9f1] hover:shadow-md sm:min-h-[96px] sm:gap-1.5 sm:rounded-2xl">
                  <Icon aria-hidden="true" className="h-6 w-6 text-[#0d65c8] transition-transform group-hover:scale-110 sm:h-7 sm:w-7" strokeWidth={2.4} />
                  <span className="text-[11px] font-bold leading-tight text-[#163861] sm:text-xs">{title}</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#d4e1f0] bg-[#f8fbff] px-4 py-6 text-center">
              <p className="text-xs text-[#53677f]">No services match “{serviceSearch}”.</p>
              <button type="button" onClick={() => setServiceSearch('')} className="mt-1 text-xs font-bold text-[#0d57ad] hover:underline">Clear search</button>
            </div>
          )}
        </div>
      </section>

      <section id="why-us" aria-labelledby="why-heading" className="bg-[#f6f9fd]">
        <div className="mx-auto grid max-w-[1180px] items-center gap-5 px-4 py-7 sm:px-6 sm:py-9 md:grid-cols-[0.8fr_1.2fr] md:gap-8 lg:px-8">
          <div>
            <h2 id="why-heading" className="text-[clamp(1.45rem,4vw,2rem)] font-black leading-tight tracking-[-0.04em] text-[#102b55]">Why Choose Ghar Safar</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              {benefits.map(({ title, icon: Icon }) => (
                <li key={title} className="flex items-center gap-2.5 text-xs font-semibold text-[#244368] sm:text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d65c8] text-white">
                    <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={2.7} />
                  </span>
                  {title}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[2.1] min-h-[145px] overflow-hidden rounded-xl bg-[#dce7f3] sm:rounded-2xl">
            <Image
              src="/images/buyer-dashboard-house.png"
              alt="A modern home with welcoming lights"
              fill
              sizes="(max-width: 767px) 100vw, 65vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle id="how-heading" title="How It Works" description="Get your service in just 3 simple steps." centered />
          <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-7 sm:gap-5">
            {steps.map(({ title, description, icon: Icon }, index) => (
              <div key={title} className="relative flex flex-col items-center px-1 text-center">
                {index > 0 && <ChevronRight aria-hidden="true" className="absolute -left-2 top-4 h-4 w-4 text-[#0d65c8] sm:-left-4 sm:top-6 sm:h-5 sm:w-5" />}
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9f2ff] text-[#0d65c8] sm:h-12 sm:w-12">
                  <Icon aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <h3 className="mt-2 text-[10px] font-bold leading-tight text-[#17365d] sm:mt-3 sm:text-sm">{index + 1}. {title}</h3>
                <p className="mt-1 hidden max-w-[180px] text-xs leading-5 text-[#718096] sm:block">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="providers-heading" className="border-y border-[#eef2f7] bg-white px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle id="providers-heading" title="Featured Service Professionals" centered />
          <div className="mt-4 rounded-2xl border border-[#e3ebf5] bg-[#f7faff] px-4 py-5 text-center sm:mt-5 sm:px-8 sm:py-7">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f0ff] text-[#0d65c8]">
              <Wrench aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-2 text-sm font-bold text-[#17365d] sm:text-base">The maintenance directory is growing</h3>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-[#64748b] sm:text-sm">
              Provider profiles and ratings will appear here when maintenance professionals join Ghar Safar. Call us and we’ll help with your service request.
            </p>
            <ContactLink className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#c8d9ed] bg-white px-4 text-xs font-bold text-[#0d57ad] transition hover:bg-[#edf5ff]">
              <Phone aria-hidden="true" className="h-3.5 w-3.5" /> Request a Service
            </ContactLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="work-heading" className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle id="work-heading" title="Recent Maintenance Work" centered />
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-4 sm:gap-3">
            {workGallery.map(({ title, positionClass }) => (
              <figure key={title} className="overflow-hidden rounded-xl border border-[#e6ebf2] bg-white shadow-sm">
                <div className="relative aspect-[1.35] bg-[#e7edf4]">
                  <Image
                    src="/images/maintance hero section.png"
                    alt={`${title} service`}
                    fill
                    sizes="(max-width: 639px) 45vw, 25vw"
                    className={`object-cover ${positionClass}`}
                  />
                </div>
                <figcaption className="px-2.5 py-2 text-[10px] font-bold text-[#19375d] sm:px-3 sm:text-xs">{title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="feedback-heading" className="bg-[#f6f9fd] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle id="feedback-heading" title="Customer Feedback" centered />
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#e4ebf3] bg-white p-4 shadow-sm sm:mt-5 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9f2ff] text-[#0d65c8]">
              <Star aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-[#17365d] sm:text-sm">Reviews will be shared here</h3>
              <p className="mt-1 text-[11px] leading-4 text-[#718096] sm:text-xs sm:leading-5">
                There are no maintenance customer reviews yet. We’ll show feedback here when it’s available.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Service areas and frequently asked questions" className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-2 md:gap-8">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-[#15385f]">
              <MapPin aria-hidden="true" className="h-5 w-5 fill-[#0d65c8] text-[#0d65c8]" />
              Service Areas
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#405875] sm:text-sm sm:leading-6">
              Contact our team to check maintenance availability in your area.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e9f3ff] px-3 py-1.5 text-[11px] font-bold text-[#155ba4]">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" /> Lahore, Pakistan
            </span>
          </div>
          <div>
            <h2 id="faq-heading" className="flex items-center gap-2 text-base font-extrabold text-[#15385f]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0d65c8] text-[11px] font-black text-white">?</span>
              FAQs
            </h2>
            <div className="mt-2 space-y-1.5">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group rounded-lg border border-[#e4ebf3] bg-white px-3 py-2">
                  <summary className="flex min-h-5 cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-[#263f60] marker:hidden sm:text-xs">
                    {question}
                    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#56779d] transition group-open:rotate-180" />
                  </summary>
                  <p className="pb-1 pt-2 text-[11px] leading-5 text-[#66778d] sm:text-xs">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="urgent-heading" className="px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8">
        <div className="relative mx-auto flex max-w-[1100px] flex-col gap-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#0757b7] to-[#082f65] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
          <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-8 opacity-[0.12]">
            <House className="h-32 w-32 fill-white text-white" />
          </div>
          <div className="relative">
            <h2 id="urgent-heading" className="text-base font-extrabold sm:text-lg">Need Urgent Maintenance?</h2>
            <p className="mt-1 text-[11px] text-blue-100 sm:text-xs">Book now and get fast, reliable service.</p>
          </div>
          <a href="#services" className="relative inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-[#0d4f9e] transition hover:bg-[#edf5ff] sm:px-5">
            Book a Service <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="bg-[#062650] text-white">
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-x-5 gap-y-7 px-4 py-7 sm:px-6 sm:py-9 md:grid-cols-4 md:gap-8 lg:px-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/maintenance" className="inline-flex items-center gap-2" aria-label="Ghar Safar Maintenance home">
              <Image
                src="/images/ghar-safar-logo.png"
                unoptimized
                alt="Ghar Safar logo"
                width={40}
                height={39}
                className="h-8 w-8 shrink-0 object-contain"
              />
              <span className="text-lg font-extrabold tracking-tight">Ghar Safar</span>
            </Link>
            <p className="mt-1 text-[10px] text-blue-100 sm:text-xs">Har Khwab Ki Manzil, Apna Ghar.</p>
            <div className="mt-3 flex items-center gap-2" aria-label="Social networks">
              {[
                { name: 'Facebook', Icon: Facebook },
                { name: 'Instagram', Icon: Instagram },
                { name: 'YouTube', Icon: Youtube },
              ].map(({ name, Icon }) => (
                <span key={name} role="img" aria-label={name} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-blue-100">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <nav aria-label="Quick Links">
            <h2 className="mb-2 text-[11px] font-extrabold sm:text-xs">Quick Links</h2>
            <ul className="space-y-1.5 text-[10px] text-blue-100 sm:text-xs">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><a href="#services" className="hover:text-white">Services</a></li>
              <li><a href="#providers-heading" className="hover:text-white">Service Providers</a></li>
              <li><a href="#faq-heading" className="hover:text-white">FAQs</a></li>
            </ul>
          </nav>

          <nav aria-label="Support">
            <h2 className="mb-2 text-[11px] font-extrabold sm:text-xs">Support</h2>
            <ul className="space-y-1.5 text-[10px] text-blue-100 sm:text-xs">
              <li><a href="tel:+923001234567" className="hover:text-white">Help Center</a></li>
              <li><a href="tel:+923001234567" className="hover:text-white">Contact Us</a></li>
              <li><a href="#faq-heading" className="hover:text-white">Terms &amp; Conditions</a></li>
              <li><a href="#faq-heading" className="hover:text-white">Privacy Policy</a></li>
            </ul>
          </nav>

          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-2 text-[11px] font-extrabold sm:text-xs">Contact Us</h2>
            <ul className="space-y-2 text-[10px] text-blue-100 sm:text-xs">
              <li className="flex items-center gap-2"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />Lahore, Pakistan</li>
              <li className="flex items-center gap-2"><Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><a href="tel:+923001234567" className="hover:text-white">+92 300 1234567</a></li>
              <li className="flex min-w-0 items-center gap-2"><Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><a href="mailto:info@estatepro.pk" className="break-all hover:text-white">Ghar Safar Support</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1 px-4 py-3 text-[9px] text-blue-100 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-[10px] lg:px-8">
            <p>© {new Date().getFullYear()} Ghar Safar. All rights reserved.</p>
            <p>Har Khwab Ki Manzil, Apna Ghar.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
