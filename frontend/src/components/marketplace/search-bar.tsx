"use client";

import React, { useState } from "react";
import { Search, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const [purpose, setPurpose] = useState<"Sale" | "Rent">("Sale");
  const [city, setCity] = useState("Lahore");
  const [keyword, setKeyword] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams({
      purpose,
      city,
      keyword,
    }).toString();
    window.location.href = `/properties?${query}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
      {/* Purpose Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setPurpose("Sale")}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            purpose === "Sale"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          Buy (For Sale)
        </button>
        <button
          type="button"
          onClick={() => setPurpose("Rent")}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            purpose === "Rent"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          Rent
        </button>
      </div>

      {/* Main Search Inputs Form */}
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* City Selector */}
        <div className="sm:col-span-4 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <MapPin className="h-4 w-4 text-emerald-600" />
          </div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
          >
            <option value="Lahore">Lahore</option>
            <option value="Karachi">Karachi</option>
            <option value="Islamabad">Islamabad</option>
            <option value="Rawalpindi">Rawalpindi</option>
            <option value="Faisalabad">Faisalabad</option>
            <option value="Multan">Multan</option>
            <option value="Peshawar">Peshawar</option>
          </select>
        </div>

        {/* Keyword / Area Search */}
        <div className="sm:col-span-5 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Building className="h-4 w-4 text-emerald-600" />
          </div>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search Location, DHA, Bahria Town..."
            className="pl-10"
          />
        </div>

        {/* Submit Search Button */}
        <div className="sm:col-span-3">
          <Button type="submit" className="w-full h-11 gap-2 font-semibold shadow-md">
            <Search className="h-4 w-4" />
            <span>Find Properties</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
