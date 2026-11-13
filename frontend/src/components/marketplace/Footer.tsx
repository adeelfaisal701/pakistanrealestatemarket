'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';

interface FooterProps {
  brandName?: 'Ghar Safar';
}

function SocialIcon({ label }: { label: 'Facebook' | 'Instagram' | 'YouTube' | 'LinkedIn' }) {
  const paths = {
    Facebook: 'M13.5 21v-7.4H16l.4-2.9h-2.9V8.9c0-.8.2-1.4 1.5-1.4h1.5V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v1.9H7.7v2.9h2.6V21H13.5z',
    Instagram: 'M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3zm0 2A2.8 2.8 0 0 0 5 7.8v8.4A2.8 2.8 0 0 0 7.8 19h8.4a2.8 2.8 0 0 0 2.8-2.8V7.8A2.8 2.8 0 0 0 16.2 5H7.8zm4.2 2.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zm5-3.1a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z',
    YouTube: 'M23 7.1a3 3 0 0 0-2.1-2.1C19 4.5 12 4.5 12 4.5s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.9A3 3 0 0 0 3.1 19c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9zM9.8 15.6V8.4l6.3 3.6-6.3 3.6z',
    LinkedIn: 'M5.2 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.3 9h3.8v12H3.3V9zm6.2 0h3.6v1.6h.1A4 4 0 0 1 16.8 8c3.9 0 4.6 2.5 4.6 5.7V21h-3.8v-6.5c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V21H9.5V9z',
  };

  return (
    <span
      role="img"
      aria-label={label}
      title={`${label} link is not configured`}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-slate-300 transition-colors hover:border-brand-500/60 hover:text-white max-sm:h-11 max-sm:w-11"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
        <path d={paths[label]} />
      </svg>
    </span>
  );
}

export function HomepageFooter({ showBackToTop = false }: { showBackToTop?: boolean }) {
  return (
    <footer className="relative isolate overflow-hidden bg-ink-950 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-44 sm:w-56 max-sm:w-36">
        <img
          src="/images/Lahore.jpg"
          alt=""
          className="h-full w-full object-cover object-[center_48%] opacity-25 max-sm:opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-ink-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent to-ink-950/45" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1.55fr_0.78fr_0.9fr_1.5fr] lg:gap-8 lg:py-8 max-sm:gap-x-4 max-sm:gap-y-5 max-sm:px-4 max-sm:py-5">
        <section className="col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Ghar Safar home">
            <Image
              src="/images/ghar-safar-logo.png"
              alt="Ghar Safar logo"
              width={78}
              height={75}
              className="h-[4.5rem] w-[4.7rem] shrink-0 object-contain"
            />
            <span className="text-[25px] font-extrabold tracking-tight text-white">
              Ghar Safar
            </span>
          </Link>
          <p className="mt-1 text-[15px] leading-6 text-slate-300 max-sm:text-[13px] max-sm:leading-5">Har Khwab Ki Manzil, Apna Ghar.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 max-sm:mt-3 max-sm:gap-2.5" aria-label="Social networks">
            <SocialIcon label="Facebook" />
            <SocialIcon label="Instagram" />
            <SocialIcon label="YouTube" />
            <SocialIcon label="LinkedIn" />
          </div>
        </section>

        <nav aria-label="Quick Links">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 max-sm:mb-2">Quick Links</h2>
          <ul className="space-y-2 text-[14px] text-slate-300 max-sm:space-y-1.5 max-sm:text-xs">
            <li><Link href="/properties" className="transition-colors hover:text-white">Properties</Link></li>
            <li><Link href="/agencies" className="transition-colors hover:text-white">Agencies</Link></li>
            <li><Link href="/agent/add-property" className="transition-colors hover:text-white">Post Free Listing</Link></li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 max-sm:mb-2">Legal</h2>
          <ul className="space-y-2 text-[14px] text-slate-300 max-sm:space-y-1.5 max-sm:text-xs">
            <li><Link href="/terms" className="transition-colors hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/agent/verification" className="transition-colors hover:text-white">Agent Verification</Link></li>
          </ul>
        </nav>

        <section className="relative z-10 max-sm:col-span-2">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 max-sm:mb-2">Get In Touch</h2>
          <ul className="space-y-2.5 text-[14px] text-slate-300 max-sm:space-y-1.5 max-sm:text-xs">
            <li className="flex min-w-0 items-center gap-3">
              <Phone className="h-5 w-5 shrink-0 text-brand-500 max-sm:h-4 max-sm:w-4" />
              <a href="tel:+923001234567" className="transition-colors hover:text-emerald-300 max-sm:whitespace-nowrap">+92 300 1234567</a>
            </li>
            <li className="flex min-w-0 items-center gap-3">
              <Mail className="h-5 w-5 shrink-0 text-brand-500 max-sm:h-4 max-sm:w-4" />
              <a href="mailto:support@zameenconnect.pk" className="break-all transition-colors hover:text-emerald-300 max-sm:whitespace-nowrap max-sm:break-normal">Ghar Safar Support</a>
            </li>
            <li className="flex min-w-0 items-center gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-brand-500 max-sm:h-4 max-sm:w-4" />
              <span className="max-sm:whitespace-nowrap">Lahore / Islamabad, Pakistan</span>
            </li>
            <li>
              <a
                href="https://wa.me/923007589188?text=Assalam%20o%20Alaikum%20Ghar%20Safar%20Support"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 transition-colors hover:text-white"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp Support
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 text-sm text-slate-400 sm:px-8 max-sm:flex-col max-sm:gap-1 max-sm:px-4 max-sm:py-3 max-sm:text-center max-sm:text-xs">
          <p>© {new Date().getFullYear()} Ghar Safar. All rights reserved.</p>
          {showBackToTop && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-white/10"
            >
              Back to top
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}

export default function Footer({ brandName = 'Ghar Safar' }: FooterProps) {
  void brandName;
  return <HomepageFooter />;
}
