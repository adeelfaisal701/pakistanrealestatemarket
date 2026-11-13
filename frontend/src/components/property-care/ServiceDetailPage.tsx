import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Info,
  ReceiptText,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import {
  PROPERTY_CARE_SERVICES,
  requestServiceHref,
  type PropertyCareService,
} from "@/lib/property-care-services";
import { ServiceIcon, pc } from "./PropertyCareUI";

const processSteps = [
  { icon: ClipboardList, title: "We review your request", text: "Our operations team checks the details and photos you share." },
  { icon: UserRoundCheck, title: "A verified technician is assigned", text: "You see their name and phone once they confirm the visit." },
  { icon: ReceiptText, title: "You approve the quotation", text: "Chargeable work begins only after you approve the itemised price." },
];

const trustChips = [
  { icon: BadgeCheck, label: "Verified technicians" },
  { icon: ReceiptText, label: "Upfront quotation" },
  { icon: Camera, label: "Photo proof of work" },
];

export function ServiceDetailPage({ service }: { service: PropertyCareService }) {
  const others = PROPERTY_CARE_SERVICES.filter((item) => item.key !== service.key).slice(0, 4);
  const requestHref = requestServiceHref(service.key);

  return (
    <main className="min-h-screen bg-care-50 pb-28 text-care-ink sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#e6ecf5] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/maintenance" className="inline-flex min-w-0 items-center gap-2.5" aria-label="Ghar Safar Property Care home">
            <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={40} height={39} className="h-9 w-9 shrink-0 object-contain" />
            <span className="min-w-0 leading-none">
              <span className="block truncate text-lg font-extrabold tracking-tight">Ghar Safar</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-care-600">Property Care</span>
            </span>
          </Link>
          <nav aria-label="Service navigation" className="flex shrink-0 items-center gap-2">
            <Link href="/maintenance#services" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-[#334155] transition hover:bg-care-50 hover:text-care-700">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All services
            </Link>
            <Link href={requestHref} className="hidden min-h-10 items-center gap-1.5 rounded-lg bg-care-600 px-4 text-sm font-bold text-white transition hover:bg-care-700 sm:inline-flex">
              Request {service.shortTitle}
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-gradient-to-br from-care-950 via-care-900 to-care-800 px-4 pb-20 pt-8 text-white sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-care-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="mx-auto max-w-[1180px]">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
            <Link href="/maintenance" className="hover:text-white">Maintenance</Link>
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            <Link href="/maintenance#services" className="hover:text-white">Services</Link>
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            <span aria-current="page" className="text-white/90">{service.title}</span>
          </nav>
          <div className="mt-6 flex items-start gap-4 sm:gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-care-300 ring-1 ring-inset ring-white/15 sm:h-16 sm:w-16">
              <ServiceIcon category={service.key} className="h-7 w-7 sm:h-8 sm:w-8" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-care-300">Property Care service</p>
              <h1 className="mt-1.5 text-[clamp(2rem,7vw,3.2rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">{service.title}</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/75">{service.summary}</p>
          <div className="mt-7 hidden flex-wrap gap-3 sm:flex">
            <Link href={requestHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-care-700 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)] transition hover:bg-care-50">
              Request {service.shortTitle} <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/maintenance#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-bold text-white transition hover:bg-white/10">
              How it works
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-2">
            {trustChips.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/85">
                <Icon aria-hidden="true" className="h-3.5 w-3.5 text-care-300" /> {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-12 grid max-w-[1180px] grid-cols-1 gap-4 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
        <section aria-labelledby="jobs-heading" className={`${pc.card} p-5 sm:p-7`}>
          <h2 id="jobs-heading" className="text-lg font-extrabold tracking-[-0.02em]">Common jobs we handle</h2>
          <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {service.commonJobs.map((job) => (
              <li key={job} className="flex items-start gap-2.5 rounded-xl border border-[#edf2f8] bg-care-50 p-3.5 text-sm font-semibold text-[#1e293b]">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-care-600" />
                {job}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-[#7a8594]">Don&apos;t see your issue? Describe it in your request — our team will route it correctly.</p>
        </section>

        <section aria-labelledby="included-heading" className={`${pc.card} p-5 sm:p-7`}>
          <h2 id="included-heading" className="text-lg font-extrabold tracking-[-0.02em]">Every visit includes</h2>
          <ul className="mt-5 space-y-3.5">
            {service.included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#1e293b]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-care-100 text-care-600">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="pt-1">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="process-heading" className={`${pc.card} p-5 sm:p-7 lg:col-span-2`}>
          <h2 id="process-heading" className="text-lg font-extrabold tracking-[-0.02em]">What happens after you request</h2>
          <ol className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {processSteps.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="flex gap-3.5 rounded-xl border border-[#e2e9f3] bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-care-600 text-white shadow-[0_10px_22px_-12px_rgba(22,96,208,0.7)]">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-care-600">Step {String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-0.5 text-sm font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-[#64748b]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {service.goodToKnow.length > 0 && (
          <section aria-labelledby="tips-heading" className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5 sm:p-6 lg:col-span-2">
            <h2 id="tips-heading" className="flex items-center gap-2.5 text-base font-bold text-amber-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Info aria-hidden="true" className="h-4 w-4" />
              </span>
              Good to know
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-sm leading-6 text-amber-900/90">
              {service.goodToKnow.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </section>
        )}

        <section aria-labelledby="other-heading" className="pt-6 lg:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <h2 id="other-heading" className="text-lg font-extrabold tracking-[-0.02em]">Other services</h2>
            <Link href="/maintenance#services" className="text-sm font-bold text-care-600 hover:text-care-700">View all</Link>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {others.map((item) => (
              <li key={item.key}>
                <Link
                  href={`/maintenance/services/${item.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-[#e2e9f3] bg-white p-4 transition hover:-translate-y-0.5 hover:border-care-300 hover:shadow-[0_18px_40px_-24px_rgba(15,39,71,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-500"
                >
                  <span className="flex items-start justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors group-hover:bg-care-600 group-hover:text-white ${item.accent}`}>
                      <ServiceIcon category={item.key} className="h-5 w-5" />
                    </span>
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-[#9fb6d6] transition group-hover:text-care-600" />
                  </span>
                  <span className="text-sm font-bold">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12 mt-2 hidden items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-care-600 to-care-800 px-8 py-7 text-white shadow-[0_24px_50px_-30px_rgba(22,96,208,0.8)] sm:flex lg:col-span-2">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.02em]">Ready to book {service.shortTitle.toLowerCase()}?</h2>
            <p className="mt-1 text-sm text-care-100">Submit your request in two minutes — we&apos;ll take it from there.</p>
          </div>
          <Link href={requestHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-care-700 transition hover:bg-care-50">
            Request {service.shortTitle} <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e2e9f3] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,39,71,0.12)] backdrop-blur sm:hidden">
        <Link href={requestHref} className={`${pc.primaryBtn} w-full`}>
          Request {service.shortTitle} <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
