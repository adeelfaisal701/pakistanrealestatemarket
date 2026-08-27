'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, ShieldCheck, CheckCircle2, MessageCircle, ArrowRight, Smartphone, Sparkles, Building } from 'lucide-react';

export default function DualCTA() {
  return (
    <section id="dual-cta" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          Join the Ecosystem
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Whether You Own or Sell, PRM Works for You
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Direct, verified, and free of middleman commissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* For Property Owners Banner */}
        <div
          id="post-property"
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 text-white border border-emerald-500/30 shadow-xl flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Building className="h-3.5 w-3.5" />
              For Property Owners
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Post Your Lahore Property Free in 2 Minutes
            </h3>

            <p className="text-slate-300 text-sm mt-3 leading-relaxed">
              Sell or rent your house, plot, or apartment faster. Connect directly with genuine buyers without losing commission.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>100% Free listing submission with instant publish</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Direct WhatsApp and phone leads straight to you</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Automated 14-day freshness confirmation reminders</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-emerald-800/60">
            <Link
              href="/post-property"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Post Property Free</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* For Real Estate Agents Banner */}
        <div
          id="agent-crm"
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-700 shadow-xl flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Smartphone className="h-3.5 w-3.5" />
              For Estate Agents & Brokers
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Grow Your Agency with Mobile-First CRM
            </h3>

            <p className="text-slate-300 text-sm mt-3 leading-relaxed">
              Designed specifically for Pakistani property consultants. Manage leads, track client site visits, and share listings in 1-tap on WhatsApp.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Level 2 & 3 Verified Agent Trust Badge on your listings</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>1-Tap WhatsApp branded inventory sharing with clients</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Lead pipeline tracker & follow-up schedule alerts</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <Link
              href="/agent/register"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Join Agent CRM Platform</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
