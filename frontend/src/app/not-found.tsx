import React from "react";
import Link from "next/link";
import { Building2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">404</h1>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Page Not Found
        </h2>
        <p className="text-xs text-slate-500">
          The property or dashboard page you requested could not be found or has been moved.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
              <Home className="h-4 w-4" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
