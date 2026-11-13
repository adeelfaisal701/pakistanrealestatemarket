'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, ShieldCheck, CheckCircle2, ArrowRight, Smartphone, Sparkles, Building } from 'lucide-react';

const ownerPoints = [
  '100% Free listing submission with instant publish',
  'Direct WhatsApp and phone leads straight to you',
  'Automated 14-day freshness confirmation reminders',
];

const agentPoints = [
  'Level 2 & 3 Verified Agent Trust Badge on your listings',
  '1-Tap WhatsApp branded inventory sharing with clients',
  'Lead pipeline tracker & follow-up schedule alerts',
];

export default function DualCTA() {
  return (
    <section id="dual-cta" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          Join the Ecosystem
        </p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-700 sm:text-3xl lg:text-4xl">
          Whether You Own or Sell, Ghar Safar Works for You
        </h2>
        <p className="mt-3 text-sm text-slate-500 sm:text-base">
          Direct, verified, and free of middleman commissions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* For Property Owners */}
        <div
          id="post-property"
          className="relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-ink-950 p-8 text-white shadow-[0_24px_60px_-28px_rgba(7,27,43,0.65)] sm:p-10"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-500">
              <Building aria-hidden="true" className="h-3.5 w-3.5" />
              For Property Owners
            </span>
            <h3 className="mt-5 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              Post Your Lahore Property Free in 2 Minutes
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Sell or rent your house, plot, or apartment faster. Connect directly with genuine buyers without losing commission.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {ownerPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-8 border-t border-white/10 pt-6">
            <Link
              href="/post-property"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-bold text-ink-950 shadow-lg shadow-brand-500/25 transition-colors hover:bg-[#2fd0a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 sm:w-auto"
            >
              <PlusCircle aria-hidden="true" className="h-4 w-4" />
              <span>Post Property Free</span>
              <ArrowRight aria-hidden="true" className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* For Real Estate Agents */}
        <div
          id="agent-crm"
          className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-34px_rgba(16,29,50,0.35)] sm:p-10"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-100 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-600">
              <Smartphone aria-hidden="true" className="h-3.5 w-3.5" />
              For Estate Agents & Brokers
            </span>
            <h3 className="mt-5 text-2xl font-extrabold leading-tight text-ink-700 sm:text-3xl">
              Grow Your Agency with Mobile-First CRM
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Designed specifically for Pakistani property consultants. Manage leads, track client site visits, and share listings in 1-tap on WhatsApp.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {agentPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-8 border-t border-slate-100 pt-6">
            <Link
              href="/agent/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-ink-950/20 transition-colors hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              <span>Join Agent CRM Platform</span>
              <ArrowRight aria-hidden="true" className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
