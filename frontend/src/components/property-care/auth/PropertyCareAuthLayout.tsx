import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, ListChecks, ReceiptText } from "lucide-react";

/**
 * Dedicated Property Care authentication shell. Independent of the Real
 * Estate auth pages (which remain unchanged).
 */
export function PropertyCareAuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#f5f9ff] text-[#0f2747] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-[#081d40] text-white lg:flex lg:flex-col">
        <Image src="/images/maintance hero section.png" alt="" fill priority sizes="50vw" className="object-cover object-center opacity-45" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#081d40]/95 via-[#0b2c5f]/80 to-[#1660d0]/50" />
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Link href="/maintenance" className="flex items-center gap-3" aria-label="Ghar Safar Property Care home">
            <Image src="/images/ghar-safar-logo.png" alt="Ghar Safar logo" width={48} height={47} className="h-12 w-12 rounded-xl bg-white p-1 object-contain" />
            <span className="leading-tight">
              <span className="block text-xl font-black tracking-[-0.03em]">Ghar Safar</span>
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#9fc3f5]">Property Care</span>
            </span>
          </Link>
          <div className="max-w-md">
            <h2 className="text-[40px] font-black leading-[1.02] tracking-[-0.045em]">Home repairs, handled properly.</h2>
            <p className="mt-4 text-base leading-7 text-white/80">Verified technicians, upfront quotations and every job tracked until you are satisfied.</p>
            <ul className="mt-8 space-y-3">
              {[
                { icon: BadgeCheck, text: "Technicians vetted and assigned by Ghar Safar" },
                { icon: ReceiptText, text: "Approve the price before chargeable work" },
                { icon: ListChecks, text: "Photo proof and your sign-off on every job" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm font-semibold text-white/90">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><Icon className="h-4 w-4 text-[#9fc3f5]" /></span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/50">© {new Date().getFullYear()} Ghar Safar · Har Khwab Ki Manzil, Apna Ghar.</p>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex min-h-dvh flex-col">
        <header className="bg-gradient-to-br from-[#0b2c5f] to-[#1660d0] px-5 pb-20 pt-5 text-white lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/maintenance" className="flex items-center gap-2.5" aria-label="Ghar Safar Property Care home">
              <Image src="/images/ghar-safar-logo.png" alt="Ghar Safar logo" width={40} height={39} className="h-10 w-10 rounded-xl bg-white p-0.5 object-contain" />
              <span className="leading-tight">
                <span className="block text-base font-black tracking-[-0.03em]">Ghar Safar</span>
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9fc3f5]">Property Care</span>
              </span>
            </Link>
            <Link href="/maintenance" className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-bold text-white/80 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </div>
        </header>

        <div className="-mt-14 flex flex-1 flex-col items-center px-4 pb-10 lg:mt-0 lg:justify-center lg:px-10 lg:py-12">
          <div className="hidden w-full max-w-md lg:block">
            <Link href="/maintenance" className="mb-8 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[#64748b] hover:text-[#1660d0]">
              <ArrowLeft className="h-4 w-4" /> Back to Property Care
            </Link>
          </div>
          <section className="w-full max-w-md rounded-[28px] border border-[#e2e9f3] bg-white p-6 shadow-[0_18px_40px_rgba(15,39,71,0.10)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h1 className="text-[28px] font-black leading-tight tracking-[-0.035em]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </section>
          {footer && <div className="mt-6 w-full max-w-md">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
