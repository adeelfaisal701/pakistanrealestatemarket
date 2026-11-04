'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MessageCircle, Phone, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-900">
          {/* Company Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                PRM
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Pakistan Real Estate Marketplace & Agent CRM. Eliminating stale listings with our 14-day confirmed availability system for Lahore properties.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/923007589188?text=Assalam%20o%20Alaikum%20PRM%20Support"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900 text-xs font-bold transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Helpline</span>
              </a>
              <span className="text-xs text-slate-500">24/7 Response</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Marketplace
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#properties" className="hover:text-emerald-400 transition-colors">
                  Houses for Sale
                </Link>
              </li>
              <li>
                <Link href="#properties" className="hover:text-emerald-400 transition-colors">
                  Plots for Sale
                </Link>
              </li>
              <li>
                <Link href="#properties" className="hover:text-emerald-400 transition-colors">
                  Flats for Rent
                </Link>
              </li>
              <li>
                <Link href="#properties" className="hover:text-emerald-400 transition-colors">
                  Commercial Plazas
                </Link>
              </li>
              <li>
                <Link href="#post-property" className="hover:text-emerald-400 transition-colors">
                  Post Free Listing
                </Link>
              </li>
            </ul>
          </div>

          {/* Lahore Societies Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Lahore Societies
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#societies" className="hover:text-emerald-400 transition-colors">
                  DHA Lahore
                </Link>
              </li>
              <li>
                <Link href="#societies" className="hover:text-emerald-400 transition-colors">
                  Bahria Town Lahore
                </Link>
              </li>
              <li>
                <Link href="#societies" className="hover:text-emerald-400 transition-colors">
                  Gulberg III
                </Link>
              </li>
              <li>
                <Link href="#societies" className="hover:text-emerald-400 transition-colors">
                  Johar Town
                </Link>
              </li>
              <li>
                <Link href="#societies" className="hover:text-emerald-400 transition-colors">
                  Lake City
                </Link>
              </li>
            </ul>
          </div>

          {/* Agent CRM & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Agent Portal & Trust
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#agent-crm" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Agent CRM</span>
                </Link>
              </li>
              <li>
                <Link href="/agent/verification" className="hover:text-emerald-400 transition-colors">
                  Get Level 2 Badge
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Pakistan Real Estate Marketplace (PRM). All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Built with</span>
            <Heart className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
            <span>for Lahore Real Estate</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
