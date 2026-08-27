import React from "react";
import Link from "next/link";
import { Building2, Phone, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-12 text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">ZameenConnect</span>
          </div>
          <p className="text-sm">
            Pakistan's next-generation real estate marketplace and mobile-first CRM engine for modern property agents and buyers.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Popular Cities</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/properties?city=Lahore" className="hover:text-emerald-600">Properties in Lahore</Link></li>
            <li><Link href="/properties?city=Karachi" className="hover:text-emerald-600">Properties in Karachi</Link></li>
            <li><Link href="/properties?city=Islamabad" className="hover:text-emerald-600">Properties in Islamabad</Link></li>
            <li><Link href="/properties?city=Rawalpindi" className="hover:text-emerald-600">Properties in Rawalpindi</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Portals & CRM</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/agent" className="hover:text-emerald-600">Agent CRM Dashboard</Link></li>
            <li><Link href="/buyer" className="hover:text-emerald-600">Buyer Saved Searches</Link></li>
            <li><Link href="/admin" className="hover:text-emerald-600">Admin Moderation</Link></li>
            <li><Link href="/register" className="hover:text-emerald-600">Become an Agent</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Contact & Support</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>Lahore / Islamabad, Pakistan</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              <span>+92 300 1234567</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-600" />
              <span>support@zameenconnect.pk</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ZameenConnect Pakistan. All rights reserved.
      </div>
    </footer>
  );
}
