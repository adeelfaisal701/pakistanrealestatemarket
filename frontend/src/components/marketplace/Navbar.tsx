'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, PlusCircle, ShieldCheck, Menu, X, User, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-md border-b border-slate-200/80 dark:border-slate-800/80'
          : 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  PRM
                </span>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Lahore
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                Pakistan Real Estate Marketplace
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="#properties"
              className="px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
            >
              Buy
            </Link>
            <Link
              href="#properties"
              className="px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
            >
              Rent
            </Link>
            <Link
              href="#societies"
              className="px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
            >
              Lahore Societies
            </Link>
            <Link
              href="/agent"
              className="px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Agent CRM</span>
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-xs"
            >
              <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/agent/add-property"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusCircle className="h-4 w-4 flex-shrink-0" />
              <span>Post Property Free</span>
            </Link>
          </div>

          {/* Mobile Menu Button & Quick Post Action */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/agent/add-property"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm min-h-[40px] flex-shrink-0"
            >
              <PlusCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Post Free</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6 flex-shrink-0" /> : <Menu className="h-6 w-6 flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 px-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              href="#properties"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 min-h-[44px]"
            >
              <span>Buy Properties in Lahore</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              href="#properties"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 min-h-[44px]"
            >
              <span>Rent Properties in Lahore</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              href="#societies"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 min-h-[44px]"
            >
              <span>Lahore Housing Societies</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              href="/agent"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 min-h-[44px]"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Agent CRM & Leads Pipeline</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-full">
                Portal
              </span>
            </Link>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl min-h-[46px]"
              >
                <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/agent/add-property"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl min-h-[46px] shadow-sm"
              >
                <PlusCircle className="h-4 w-4 flex-shrink-0" />
                <span>Post Property Free</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
