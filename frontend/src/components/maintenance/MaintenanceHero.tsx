'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, House, Sparkles, Wrench } from 'lucide-react';
import { PROPERTY_CARE_SERVICES, REQUEST_SERVICE_PATH } from '@/lib/property-care-services';
import { ServiceIcon } from '@/components/property-care/PropertyCareUI';

/*
 * The Maintenance hero deliberately mirrors the Property landing hero at every
 * breakpoint — same section heights, spacing, headline scale and control
 * positions (see MobileMarketplace › MobileHero and HeroSearch) — so switching
 * between the two experiences keeps the layout stable. Only content and the
 * Property Care blue palette differ.
 */

const HERO_IMAGE = '/images/maintance hero section.png';

/** Property ↔ Maintenance switch, rendered in the same place as on the Property hero. */
function ExperienceSwitch({ variant }: { variant: 'dark' | 'light' }) {
  if (variant === 'dark') {
    return (
      <nav aria-label="Choose a Ghar Safar experience" className="mb-3 flex items-center gap-2">
        <div className="flex w-fit items-center gap-1 rounded-full border border-white/10 bg-[#081d40]/75 p-1 backdrop-blur">
          <Link href="/" prefetch className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-white/70 transition-all hover:text-white">
            <House aria-hidden="true" className="h-3.5 w-3.5" /> Property
          </Link>
          <Link href="/maintenance" aria-current="page" className="flex min-h-10 items-center gap-1.5 rounded-full bg-[#2f7de9] px-4 text-sm font-bold text-white shadow">
            <Wrench aria-hidden="true" className="h-3.5 w-3.5" /> Maintenance
          </Link>
        </div>
      </nav>
    );
  }
  return (
    <nav aria-label="Choose a Ghar Safar experience" className="mb-5 flex w-full items-center gap-1.5 rounded-2xl bg-slate-100 p-1 sm:w-fit">
      <Link href="/" prefetch className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-xs font-bold text-slate-600 transition-all hover:text-slate-900 sm:flex-initial sm:py-2.5 sm:text-sm">
        <House aria-hidden="true" className="h-4 w-4" /> Property
      </Link>
      <Link href="/maintenance" aria-current="page" className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1660d0] px-5 py-3 text-xs font-bold text-white shadow-md shadow-[#1660d0]/30 sm:flex-initial sm:py-2.5 sm:text-sm">
        <Wrench aria-hidden="true" className="h-4 w-4" /> Maintenance
      </Link>
    </nav>
  );
}

function AccountLinks({ signedIn, compact = false }: { signedIn: boolean; compact?: boolean }) {
  const size = compact ? 'min-h-10 px-3 text-xs max-[359px]:px-2.5' : 'min-h-10 px-4 text-xs sm:text-sm';
  if (signedIn) {
    return (
      <Link href="/property-care" className={`inline-flex items-center justify-center rounded-full bg-[#1660d0] font-bold text-white shadow-sm transition hover:bg-[#114fb0] ${size}`}>
        My dashboard
      </Link>
    );
  }
  return (
    <>
      <Link href="/property-care/login" className={`inline-flex items-center justify-center rounded-full border border-[#cdd9e9] bg-white font-bold text-[#1660d0] transition hover:bg-[#f5f9ff] ${size}`}>
        Sign In
      </Link>
      <Link href="/property-care/register" className={`inline-flex items-center justify-center rounded-full bg-[#1660d0] font-bold text-white shadow-sm transition hover:bg-[#114fb0] ${size}`}>
        <span className="sm:hidden">Sign Up</span>
        <span className="hidden sm:inline">Create Customer Account</span>
      </Link>
    </>
  );
}

/** Tablet/desktop header — same height and logo scale as the Property Navbar. */
export function MaintenanceHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-[#e6ecf5]/80 bg-white/90 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:h-18 sm:px-5 lg:px-6 xl:h-20 xl:px-8">
        <Link href="/maintenance" className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5 xl:gap-3" aria-label="Ghar Safar Property Care home">
          <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={58} height={56} className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12 xl:h-[52px] xl:w-[52px]" />
          <span className="min-w-0 leading-none">
            <span className="block truncate text-xl font-black tracking-tight text-[#0f2747] sm:text-2xl xl:text-[26px]">Ghar Safar</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#1660d0] sm:text-[11px]">Property Care</span>
          </span>
        </Link>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
          <AccountLinks signedIn={signedIn} />
        </nav>
      </div>
    </header>
  );
}

/** Mobile hero — mirrors MobileHero (520px, header inside the hero, controls in the same order). */
export function MaintenanceMobileHero({ signedIn }: { signedIn: boolean }) {
  const tiles = PROPERTY_CARE_SERVICES.slice(0, 5);
  return (
    <section aria-labelledby="maintenance-hero-heading" className="relative isolate min-h-[520px] overflow-hidden bg-[#081d40] sm:min-h-[540px] md:hidden">
      <div className="absolute inset-0">
        <Image src={HERO_IMAGE} alt="" fill priority sizes="100vw" className="object-cover object-[64%_center]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081d40]/90 via-[#081d40]/60 to-[#081d40]/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#081d40]/20 via-transparent to-[#081d40]/90" />
      </div>

      <header className="absolute inset-x-0 top-0 z-30 border-b border-slate-200/80 bg-white/95 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-md min-[360px]:px-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/maintenance" className="flex min-h-12 min-w-0 items-center gap-2" aria-label="Ghar Safar Property Care home">
            <Image src="/images/ghar-safar-logo.png" unoptimized alt="Ghar Safar logo" width={798} height={768} className="h-[70px] w-[72px] shrink-0 object-contain max-[359px]:h-[62px] max-[359px]:w-16" />
            <span className="flex min-w-0 flex-col">
              <span className="whitespace-nowrap text-[19px] font-extrabold leading-5 text-[#0f2747] max-[359px]:text-[18px]">Ghar Safar</span>
              <span className="whitespace-nowrap text-[8px] font-bold leading-3 tracking-[0.1em] text-[#1660d0] max-[359px]:text-[7px]">PROPERTY CARE</span>
            </span>
          </Link>
          <nav aria-label="Account" className="flex shrink-0 items-center gap-1.5">
            <AccountLinks signedIn={signedIn} compact />
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[520px] w-full max-w-lg flex-col px-4 pb-5 pt-24 sm:min-h-[540px]">
        <p className="mb-3 inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-white/15 bg-[#081d40]/55 px-3 py-1.5 text-[10px] font-semibold text-white/95 backdrop-blur-sm">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#9fc3f5]" />
          <span className="truncate">Managed home maintenance in Lahore</span>
        </p>
        <h1 id="maintenance-hero-heading" className="mb-1 max-w-[360px] text-[clamp(2rem,9vw,2.7rem)] font-black leading-[1.02] tracking-tight text-white">
          Home repairs,
          <br />
          <span className="text-[#9fc3f5]">handled properly.</span>
        </h1>
        <p className="mb-4 text-sm font-medium text-white/90">Verified technicians · Upfront quotes · Tracked jobs</p>

        <ExperienceSwitch variant="dark" />

        <Link
          href={REQUEST_SERVICE_PATH}
          className="mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2f7de9] to-[#1660d0] px-4 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.99]"
        >
          <Wrench aria-hidden="true" className="h-4 w-4" />
          Request a Service
        </Link>

        <nav aria-label="Maintenance services" className="mt-auto -mx-1 grid min-h-0 max-h-[145px] w-[calc(100%+0.5rem)] flex-1 grid-cols-3 grid-rows-2 gap-2">
          {tiles.map((service) => (
            <Link
              key={service.key}
              href={`/maintenance/services/${service.slug}`}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-1 py-1 text-sm font-semibold leading-tight text-white/95 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fc3f5]"
            >
              <ServiceIcon category={service.key} className="h-7 w-7 text-[#9fc3f5]" />
              <span className="max-w-full truncate">{service.shortTitle}</span>
            </Link>
          ))}
          <a
            href="#services"
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-1 py-1 text-sm font-semibold leading-tight text-white/95 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fc3f5]"
          >
            <Sparkles aria-hidden="true" className="h-7 w-7 text-[#9fc3f5]" />
            <span>All Services</span>
          </a>
        </nav>
      </div>
    </section>
  );
}

/**
 * Tablet (desktop=false) and desktop (desktop=true) hero — mirrors HeroSearch:
 * same section sizing, centred copy, white card with the switch, one wide
 * primary action and a category row, then a pill row underneath.
 */
export function MaintenanceHeroSearch({ desktop = false }: { desktop?: boolean }) {
  const popular = PROPERTY_CARE_SERVICES.slice(0, 5).map((service) => ({
    label: service.commonJobs[0] ?? service.shortTitle,
    href: `/maintenance/services/${service.slug}`,
  }));

  return (
    <section
      aria-labelledby={desktop ? 'maintenance-hero-heading-desktop' : 'maintenance-hero-heading-tablet'}
      className={`relative overflow-hidden px-4 text-white sm:px-6 lg:px-8 ${
        desktop
          ? 'flex min-h-[660px] items-center rounded-b-[32px] py-20'
          : 'bg-gradient-to-b from-care-900 via-care-950 to-care-950 pb-16 pt-8 sm:pb-24 sm:pt-14'
      }`}
    >
      {desktop ? (
        <div className="absolute inset-0">
          <Image src={HERO_IMAGE} alt="" fill priority sizes="99vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-care-950/90 via-care-950/75 to-care-950/50" />
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#3b8be0_1px,transparent_1px)] opacity-15 [background-size:24px_24px]" />
          <div className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#2f7de9]/20 blur-3xl sm:h-96 sm:w-96" />
          <div className="pointer-events-none absolute -right-40 top-1/2 h-80 w-80 rounded-full bg-care-400/20 blur-3xl sm:h-96 sm:w-96" />
        </>
      )}

      <div className="relative mx-auto max-w-5xl space-y-5 text-center sm:space-y-6">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-care-400/30 bg-care-400/10 px-3.5 py-1.5 text-xs font-semibold text-care-200 shadow-inner sm:text-sm">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Verified Technicians • Upfront Quotations • Tracked to Completion</span>
        </div>

        <h1
          id={desktop ? 'maintenance-hero-heading-desktop' : 'maintenance-hero-heading-tablet'}
          className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-6xl"
        >
          Home Repairs, <br />
          <span className="bg-gradient-to-r from-care-300 via-care-200 to-care-100 bg-clip-text text-transparent">
            Handled Properly in Lahore
          </span>
        </h1>

        <p className="mx-auto max-w-2xl px-2 text-xs font-normal leading-relaxed text-slate-300 sm:text-base lg:text-lg">
          Tell us what needs fixing. Ghar Safar assigns a verified technician, sends an upfront quotation, and tracks the job until you are satisfied.
        </p>

        <div className="mx-auto max-w-4xl pt-2 sm:pt-4">
          <div className="rounded-2xl border border-white/20 bg-white/95 p-4 text-left text-slate-900 shadow-2xl backdrop-blur-md sm:rounded-3xl sm:p-6">
            <ExperienceSwitch variant="light" />

            <Link
              href={REQUEST_SERVICE_PATH}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2f7de9] to-[#1660d0] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1660d0]/30 transition-all hover:from-[#2f7de9] hover:to-[#114fb0] active:scale-[0.98] sm:text-base"
            >
              <Wrench aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>Request a Service</span>
            </Link>

            <nav aria-label="Maintenance services" className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {PROPERTY_CARE_SERVICES.map((service) => (
                <Link
                  key={service.key}
                  href={`/maintenance/services/${service.slug}`}
                  className="flex min-w-[72px] flex-1 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-[#eaf2fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1660d0]"
                >
                  <ServiceIcon category={service.key} className="h-5 w-5 text-[#1660d0]" />
                  <span className="whitespace-nowrap">{service.shortTitle}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="-mx-4 flex items-center justify-start gap-2 overflow-x-auto px-4 pb-2 pt-2 text-xs text-slate-400 scrollbar-none sm:mx-0 sm:justify-center sm:px-0 sm:pb-0">
          <span className="shrink-0 font-semibold text-slate-300">Popular:</span>
          {popular.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-300 transition-colors hover:border-care-400 hover:bg-[#0b2c5f]/80 hover:text-care-200"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="#how-it-works"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-care-400/40 px-3 py-1.5 font-semibold text-care-200 transition-colors hover:bg-care-400/10"
          >
            How it works <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
