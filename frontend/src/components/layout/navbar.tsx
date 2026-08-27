import React from "react";
import Link from "next/link";
import { Building2, Search, PlusCircle, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Zameen<span className="text-emerald-600">Connect</span>
            </span>
            <span className="text-[10px] -mt-1 uppercase tracking-wider text-slate-500 font-medium">
              Pakistan Property CRM
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/properties" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Explore Properties
          </Link>
          <Link href="/properties?purpose=Sale" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Buy
          </Link>
          <Link href="/properties?purpose=Rent" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Rent
          </Link>
          <Link href="/agent" className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>Agent CRM</span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
              PRO
            </span>
          </Link>
        </nav>

        {/* Auth & CTA Actions */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <User className="h-4 w-4 mr-1.5" />
              Login
            </Button>
          </Link>
          <Link href="/agent">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="h-4 w-4" />
              <span>Add Listing</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
