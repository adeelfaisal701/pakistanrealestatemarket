'use client';

import React from 'react';
import { Clock, ShieldCheck, UserCheck, Zap } from 'lucide-react';

export default function TrustBanner() {
  const differentiators = [
    {
      icon: Clock,
      badge: '14-Day Cycle',
      title: '100% Fresh Availability',
      description:
        'Every property is re-verified every 14 days with owners & agents. No expired or sold listings cluttering your search.',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    },
    {
      icon: UserCheck,
      badge: '0% Middleman Fee',
      title: 'Direct Owner Access',
      description:
        'Connect directly with verified Lahore homeowners. Negotiate genuine deals without bogus price markups.',
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
      badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    },
    {
      icon: ShieldCheck,
      badge: 'Level 2 & 3 Verified',
      title: 'Verified Local Agents',
      description:
        'Every listed broker is CNIC and agency authenticated. Review trust ratings and direct WhatsApp response times.',
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    },
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Why Ghar Safar Is Different
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Built to Eliminate Fake & Expired Listings in Pakistan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {differentiators.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`relative p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border ${item.color} shadow-sm hover:shadow-md transition-all duration-200 group`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
