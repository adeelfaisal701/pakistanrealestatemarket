'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, ShieldCheck, Menu, X, User, ArrowRight, Search } from 'lucide-react';

interface NavbarProps {
  showSearch?: boolean;
  showPostButton?: boolean;
}

export default function Navbar({ showSearch = false, showPostButton = true }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-md border-b border-slate-200/80 dark:border-slate-800/80'
          : 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 xl:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 group flex-shrink-0">
            <Image
              src="/images/ghar-safar-logo.png"
              unoptimized
              alt="Ghar Safar logo"
              width={58}
              height={56}
              className="h-11 w-11 flex-shrink-0 object-contain sm:h-12 sm:w-12 xl:h-[52px] xl:w-[52px]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl xl:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
                  Ghar Safar
                </span>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700 rounded-md border border-brand-200">
                  Lahore
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                Har Khwab Ki Manzil, Apna Ghar.
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 lg:gap-2">
            <Link
              href="/properties?purpose=Sale"
              className="px-3.5 py-2 text-sm font-semibold text-slate-600 hover:text-ink-700 rounded-lg hover:bg-slate-100/80 transition-colors"
            >
              Buy
            </Link>
            <Link
              href="/properties?purpose=Rent"
              className="px-3.5 py-2 text-sm font-semibold text-slate-600 hover:text-ink-700 rounded-lg hover:bg-slate-100/80 transition-colors"
            >
              Rent
            </Link>
            <Link
              href={showSearch ? "/#popular-locations" : "#popular-locations"}
              className="px-3.5 py-2 text-sm font-semibold text-slate-600 hover:text-ink-700 rounded-lg hover:bg-slate-100/80 transition-colors"
            >
              Popular Locations
            </Link>
            <Link
              href="/agent"
              className="px-3.5 py-2 text-sm font-semibold text-slate-600 hover:text-ink-700 rounded-lg hover:bg-slate-100/80 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-brand-600 flex-shrink-0" />
              <span>Agent CRM</span>
            </Link>
          </nav>

          {showSearch && (
            <form
              action="/properties"
              method="get"
              role="search"
              className="hidden min-w-44 flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900 xl:flex"
            >
              <Search className="ml-2 h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                type="search"
                name="keyword"
                placeholder="City, area or property"
                aria-label="Search properties"
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Search
              </button>
            </form>
          )}

          {/* Desktop Actions */}
          <div className="hidden xl:flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-xs"
            >
              <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span>Sign In</span>
            </Link>
            {showPostButton && (
              <Link
                href="/agent/add-property"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-[0_6px_16px_-6px_rgba(0,143,104,0.55)] transition-colors"
              >
                <PlusCircle className="h-4 w-4 flex-shrink-0" />
                <span>Post Property Free</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button & Quick Post Action */}
          <div className="flex xl:hidden items-center gap-1.5 sm:gap-2">
            {showPostButton && (
              <Link
                href="/agent/add-property"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm min-h-[40px] flex-shrink-0"
              >
                <PlusCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Post Free</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="marketplace-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6 flex-shrink-0" /> : <Menu className="h-6 w-6 flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            id="marketplace-mobile-menu"
            className="xl:hidden py-4 px-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {showSearch && (
              <form action="/properties" method="get" role="search" className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                <Search className="ml-2 h-4 w-4 flex-shrink-0 text-slate-400" />
                <input
                  type="search"
                  name="keyword"
                  placeholder="City, area or property"
                  aria-label="Search properties"
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                />
                <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">
                  Search
                </button>
              </form>
            )}
            <Link
              href="/properties?purpose=Sale"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 min-h-[44px]"
            >
              <span>Buy Properties in Lahore</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              href="/properties?purpose=Rent"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 min-h-[44px]"
            >
              <span>Rent Properties in Lahore</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              href={showSearch ? "/#societies" : "#societies"}
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
                <ShieldCheck className="h-4 w-4 text-brand-600 flex-shrink-0" />
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
