"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LAHORE_SOCIETIES } from "@/lib/crm-mock-data";
import { formatPKR } from "@/lib/utils";
import { usePropertyStore } from "@/lib/property-store";
import type { AgentPropertyListing, PropertyRequirement, PropertyType } from "@/types/crm";

interface AddPropertyFormProps {
  onPropertyAdded?: (property: AgentPropertyListing) => void;
}

const SAMPLE_PRESET_IMAGES = [
  {
    label: "Modern House",
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Spanish Villa",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Open Plot",
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Apartment",
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  },
];

export function AddPropertyForm({ onPropertyAdded }: AddPropertyFormProps) {
  const [purpose, setPurpose] = useState<PropertyRequirement>("Buy");
  const [propertyType, setPropertyType] = useState<PropertyType>("House");
  const [title, setTitle] = useState("");
  const [society, setSociety] = useState(LAHORE_SOCIETIES[0]);
  const [rawPrice, setRawPrice] = useState("");
  const [areaSize, setAreaSize] = useState("5");
  const [areaUnit, setAreaUnit] = useState<"Marla" | "Kanal" | "Sq. Ft.">("Marla");
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(3);
  const [imageUrl, setImageUrl] = useState(SAMPLE_PRESET_IMAGES[0].url);
  const [description, setDescription] = useState("");

  const [submittedProperty, setSubmittedProperty] = useState<AgentPropertyListing | null>(null);

  // Live formatted price calculator
  const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
  const formattedPricePreview = numericPrice > 0 ? formatPKR(numericPrice) : "PKR 0";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const formattedPrice = numericPrice > 0 ? formattedPricePreview : rawPrice;

    // Instant Public Publishing & Global Store Sync
    const { agentItem } = usePropertyStore.getState().addPropertyFromAgent({
      title: title.trim(),
      price: formattedPrice,
      society,
      area: `${areaSize} ${areaUnit}`,
      beds: propertyType === "Plot" || propertyType === "Commercial" ? 0 : beds,
      baths: propertyType === "Plot" ? 0 : baths,
      purpose,
      propertyType,
      imageUrl: imageUrl.trim() || undefined,
      description: description.trim() || undefined,
      agentName: "Adeel & Associates (Verified Agent)",
      agentPhone: "923004445566",
    });

    setSubmittedProperty(agentItem);
    if (onPropertyAdded) {
      onPropertyAdded(agentItem);
    }
  };

  const handleReset = () => {
    setTitle("");
    setRawPrice("");
    setDescription("");
    setSubmittedProperty(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Notification State */}
      {submittedProperty ? (
        <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-300 dark:border-emerald-800">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Instant Live On Public Marketplace</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Listing Published Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Your property is now <strong>🟢 Live & Verified</strong> on the Public Marketplace and active in your CRM for instant 1-tap WhatsApp matching.
            </p>
          </div>

          {/* Quick Preview Card */}
          <div className="p-3.5 sm:p-4 max-w-md mx-auto bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-left flex gap-3 sm:gap-4 items-center">
            {submittedProperty.imageUrl && (
              <div className="relative h-18 w-20 sm:h-20 sm:w-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                <Image
                  src={submittedProperty.imageUrl}
                  alt={submittedProperty.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                  Live
                </span>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {submittedProperty.title}
                </h4>
              </div>
              <p className="text-xs text-emerald-600 font-extrabold mt-0.5">
                {submittedProperty.price}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="truncate">{submittedProperty.society}</span>
                <span>•</span>
                <span className="flex-shrink-0">{submittedProperty.area}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Button onClick={handleReset} variant="outline" size="md" className="w-full sm:w-auto min-h-[46px]">
              <PlusCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Add Another Listing</span>
            </Button>
            <Link href="/" target="_blank" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full min-h-[46px] font-bold gap-2">
                <span>View on Public Marketplace</span>
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
              </Button>
            </Link>
            <Link href="/agent" className="w-full sm:w-auto">
              <Button size="md" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[46px] font-bold">
                <span>Leads Pipeline</span>
                <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Form Section */
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Instant Publish Notice */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <strong className="block text-slate-900 dark:text-white">Instant-Live Verification Active</strong>
                <span>Your listing bypasses waiting queues and publishes immediately to buyers across Lahore.</span>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px] uppercase">
              Zero Delay
            </span>
          </div>

          {/* 1. Purpose & Property Type Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 text-sm">
                1
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Basic Category & Purpose
                </h3>
                <p className="text-xs text-slate-500">Specify whether this is for sale or rent</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {/* Purpose Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Listing Purpose *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(["Buy", "Rent"] as PropertyRequirement[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPurpose(p)}
                      className={`min-h-[48px] rounded-2xl font-bold text-xs sm:text-sm transition-all border flex items-center justify-center ${
                        purpose === p
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      {p === "Buy" ? "For Sale (Buy)" : "For Rent"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Property Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["House", "Plot", "Apartment", "Commercial"] as PropertyType[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setPropertyType(t)}
                      className={`min-h-[48px] rounded-xl font-semibold text-xs transition-all border flex items-center justify-center ${
                        propertyType === t
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Title, Location & Price Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 text-sm">
                2
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Location & Pricing
                </h3>
                <p className="text-xs text-slate-500">
                  Select Lahore housing society and demand in PKR
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Property Title *
                </label>
                <Input
                  required
                  placeholder="e.g. 5 Marla Brand New Modern Spanish House in Bahria Sector C"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-[48px] text-base sm:text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lahore Society Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Lahore Housing Society *</span>
                  </label>
                  <select
                    value={society}
                    onChange={(e) => setSociety(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {LAHORE_SOCIETIES.map((soc) => (
                      <option key={soc} value={soc}>
                        {soc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price in PKR */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Demand Price (PKR) *</span>
                    {numericPrice > 0 && (
                      <span className="text-emerald-600 font-extrabold font-mono text-xs truncate ml-1">
                        {formattedPricePreview}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      PKR
                    </span>
                    <Input
                      required
                      type="text"
                      placeholder="e.g. 24500000 (2.45 Crore)"
                      value={rawPrice}
                      onChange={(e) => setRawPrice(e.target.value)}
                      className="pl-13 min-h-[48px] text-base sm:text-sm font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter amount (e.g. 24500000) for instant Lac/Crore preview
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Specs, Sizing & Photos Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 text-sm">
                3
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Specifications & Media
                </h3>
                <p className="text-xs text-slate-500">Dimensions, rooms, and high-res photos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Area Size & Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Maximize2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Area Size *</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    required
                    type="number"
                    min="1"
                    value={areaSize}
                    onChange={(e) => setAreaSize(e.target.value)}
                    className="min-h-[48px] w-24 sm:w-28 text-base sm:text-sm font-medium"
                  />
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value as any)}
                    className="flex-1 min-h-[48px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Marla">Marla</option>
                    <option value="Kanal">Kanal</option>
                    <option value="Sq. Ft.">Sq. Ft.</option>
                  </select>
                </div>
              </div>

              {/* Beds */}
              {propertyType !== "Plot" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Bedrooms</span>
                  </label>
                  <select
                    value={beds}
                    onChange={(e) => setBeds(parseInt(e.target.value))}
                    className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((b) => (
                      <option key={b} value={b}>
                        {b} Beds
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Baths */}
              {propertyType !== "Plot" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Bath className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Bathrooms</span>
                  </label>
                  <select
                    value={baths}
                    onChange={(e) => setBaths(parseInt(e.target.value))}
                    className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((b) => (
                      <option key={b} value={b}>
                        {b} Baths
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Image URL with Presets */}
            <div className="space-y-2.5 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Listing Photo URL</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                  Or pick a demo preset
                </span>
              </label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="min-h-[46px] text-xs font-mono"
              />

              {/* Presets picker */}
              <div className="flex flex-wrap gap-2 pt-1">
                {SAMPLE_PRESET_IMAGES.map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => setImageUrl(preset.url)}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all min-h-[36px] flex items-center ${
                      imageUrl === preset.url
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-500 font-bold"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Key Features / Highlights
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Solid construction, Grohe sanitary, double height lobby, underground utilities, direct owner transfer..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <Link href="/agent" className="w-full sm:w-auto order-2 sm:order-1">
              <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto min-h-[48px]">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-600/30 order-1 sm:order-2"
            >
              <Sparkles className="h-5 w-5 mr-2 text-amber-300 flex-shrink-0" />
              <span>Publish Instantly (Live on Marketplace)</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
