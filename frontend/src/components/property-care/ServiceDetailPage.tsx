import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
import { cn } from "@/lib/utils";
import { ServiceIcon, pc } from "./PropertyCareUI";

export function ServiceDetailPage({ service }: { service: PropertyCareService }) {
  const others = PROPERTY_CARE_SERVICES.filter((item) => item.key !== service.key).slice(0, 4);
  const requestHref = requestServiceHref(service.key);

  return (
    <main className="min-h-screen bg-[#f6f9fd] pb-28 text-[#102b55] sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#e8eef6] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-[60px] max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/maintenance#services" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[#36506f] hover:text-[#0d57ad]">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All services
          </Link>
          <Link href="/maintenance" className="inline-flex items-center gap-2" aria-label="Ghar Safar Property Care home">
            <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={32} height={31} className="h-8 w-8 object-contain" />
            <span className="hidden text-base font-black tracking-[-0.04em] sm:inline">Ghar Safar</span>
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[#0b2545] to-[#0d3a73] px-4 pb-16 pt-8 text-white sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-[1100px]">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#9ccaff] ring-1 ring-white/15">
            <ServiceIcon category={service.key} className="h-7 w-7" />
          </span>
          <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#9ccaff]">Property Care service</p>
          <h1 className="mt-2 text-[clamp(2rem,8vw,3.2rem)] font-black leading-[1.02] tracking-[-0.045em]">{service.title}</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/80">{service.summary}</p>
          <div className="mt-6 hidden gap-3 sm:flex">
            <Link href={requestHref} className={cn(pc.primaryBtn, "bg-white text-[#0d57ad] hover:bg-[#eef5ff]")}>
              Request {service.shortTitle} <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-8 grid max-w-[1100px] gap-4 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="jobs-heading" className={`${pc.card} p-5 sm:p-6`}>
          <h2 id="jobs-heading" className="text-lg font-black tracking-[-0.02em]">Common jobs we handle</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {service.commonJobs.map((job) => (
              <li key={job} className="flex items-start gap-2.5 rounded-2xl bg-[#f6f9fd] p-3 text-sm font-semibold text-[#20385c]">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {job}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[#6b7a90]">Don&apos;t see your issue? Describe it in your request — our team will route it correctly.</p>
        </section>

        <section aria-labelledby="included-heading" className={`${pc.card} p-5 sm:p-6`}>
          <h2 id="included-heading" className="text-lg font-black tracking-[-0.02em]">Every visit includes</h2>
          <ul className="mt-4 space-y-3">
            {service.included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[#20385c]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#edf5ff] text-[#0d57ad]">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="pt-1">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="process-heading" className={`${pc.card} p-5 sm:p-6 lg:col-span-2`}>
          <h2 id="process-heading" className="text-lg font-black tracking-[-0.02em]">What happens after you request</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { icon: ClipboardList, title: "We review your request", text: "Our operations team checks the details and photos you share." },
              { icon: UserRoundCheck, title: "A verified technician is assigned", text: "You see their name and phone once they confirm the visit." },
              { icon: ReceiptText, title: "You approve the quotation", text: "Chargeable work begins only after you approve the itemised price." },
            ].map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="flex gap-3 rounded-2xl border border-[#e3ebf5] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d57ad] text-white">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1768c4]">Step {index + 1}</p>
                  <h3 className="text-sm font-extrabold">{title}</h3>
                  <p className="mt-0.5 text-sm leading-5 text-[#5b6b82]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {service.goodToKnow.length > 0 && (
          <section aria-labelledby="tips-heading" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 lg:col-span-2">
            <h2 id="tips-heading" className="flex items-center gap-2 text-base font-extrabold text-amber-900">
              <Info aria-hidden="true" className="h-5 w-5" /> Good to know
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-6 text-amber-900/90">
              {service.goodToKnow.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </section>
        )}

        <section aria-labelledby="other-heading" className="py-4 lg:col-span-2">
          <h2 id="other-heading" className="text-lg font-black tracking-[-0.02em]">Other services</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {others.map((item) => (
              <li key={item.key}>
                <Link href={`/maintenance/services/${item.slug}`} className="flex h-full flex-col gap-2 rounded-3xl border border-[#e3ebf5] bg-white p-4 transition hover:border-[#bcd3ef] hover:shadow-md">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.accent}`}>
                    <ServiceIcon category={item.key} className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-extrabold">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e3ebf5] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(16,43,85,0.12)] backdrop-blur sm:hidden">
        <Link href={requestHref} className={`${pc.primaryBtn} w-full`}>
          Request {service.shortTitle} <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
