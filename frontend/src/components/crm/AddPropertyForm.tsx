"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LAHORE_SOCIETIES } from "@/lib/crm-mock-data";
import { formatPKR } from "@/lib/utils";
import type { AgentPropertyListing, PropertyRequirement, PropertyType } from "@/types/crm";
import type { PropertyFeatureData } from "@/types/marketplace";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { PropertyFeatureSelector } from "./PropertyFeatureSelector";
import { PropertyMediaPicker, type PropertyMediaItem } from "./PropertyMediaPicker";

interface AddPropertyFormProps {
  onPropertyAdded?: (property: AgentPropertyListing) => void;
  propertyId?: string;
}

interface PropertyApiRecord {
  _id: string;
  title: string;
  description: string;
  purpose: "Sale" | "Rent";
  propertyType: string;
  price: number;
  areaSize: number;
  areaUnit: string;
  location: { city: string; area: string };
  features?: PropertyFeatureData;
  images?: string[];
  status: string;
  inventoryStatus?: string;
  advertisementStatus?: string | null;
  createdAt: string;
}

function toFormPropertyType(value: string): PropertyType {
  switch (value) {
    case "House":
    case "Plot":
    case "Upper Portion":
    case "Lower Portion":
    case "Commercial":
      return value;
    case "Flat":
      return "Apartment";
    default:
      throw new Error(`Unsupported property type: ${value}`);
  }
}

export function AddPropertyForm({ onPropertyAdded, propertyId }: AddPropertyFormProps) {
  const [purpose, setPurpose] = useState<PropertyRequirement>("Buy");
  const [propertyType, setPropertyType] = useState<PropertyType>("House");
  const [title, setTitle] = useState("");
  const [society, setSociety] = useState(LAHORE_SOCIETIES[0]);
  const [rawPrice, setRawPrice] = useState("");
  const [areaSize, setAreaSize] = useState("5");
  const [areaUnit, setAreaUnit] = useState<"Marla" | "Kanal" | "Sq. Ft." | "Sq. Yd.">("Marla");
  const [features, setFeatures] = useState<PropertyFeatureData>({});
  const [images, setImages] = useState<PropertyMediaItem[]>([]);
  const [savedImageUrls, setSavedImageUrls] = useState<string[]>([]);
  const [activePropertyId, setActivePropertyId] = useState(propertyId ?? "");
  const [loadingListing, setLoadingListing] = useState(Boolean(propertyId));
  const [loadError, setLoadError] = useState("");
  const [mediaProgress, setMediaProgress] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [description, setDescription] = useState("");

  const [submittedProperty, setSubmittedProperty] = useState<AgentPropertyListing | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    let active = true;
    apiClient
      .get<ApiEnvelope<PropertyApiRecord>>(`/properties/manage/${encodeURIComponent(propertyId)}`)
      .then(({ data }) => {
        if (!active) return;
        const listing = data.data;
        setActivePropertyId(listing._id);
        setTitle(listing.title);
        setDescription(listing.description);
        setPurpose(listing.purpose === "Rent" ? "Rent" : "Buy");
        setPropertyType(toFormPropertyType(listing.propertyType));
        setRawPrice(String(listing.price));
        setAreaSize(String(listing.areaSize));
        setAreaUnit(
          listing.areaUnit === "SqFt"
            ? "Sq. Ft."
            : listing.areaUnit === "SqYd"
              ? "Sq. Yd."
              : listing.areaUnit as typeof areaUnit,
        );
        setSociety(listing.location.area);
        setFeatures(listing.features ?? {});
        const savedImages = listing.images ?? [];
        setSavedImageUrls(savedImages);
        setImages(savedImages.map((url, index) => ({ key: `saved-${index}-${url}`, url })));
      })
      .catch((requestError: unknown) => {
        if (active) setLoadError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingListing(false);
      });
    return () => {
      active = false;
    };
  }, [propertyId]);

  // Live formatted price calculator
  const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
  const formattedPricePreview = numericPrice > 0 ? formatPKR(numericPrice) : "PKR 0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const submissionMode = submitter?.value === "inventory" ? "inventory" : "advertise";
    setSubmitError("");
    setMediaError("");
    if (numericPrice <= 0 || !Number.isFinite(numericPrice)) {
      setSubmitError("Enter a valid price greater than zero.");
      return;
    }
    if (Number(areaSize) <= 0 || !Number.isFinite(Number(areaSize))) {
      setSubmitError("Enter a valid area size greater than zero.");
      return;
    }
    if (!description.trim()) {
      setSubmitError("Add a property description before submitting.");
      return;
    }

    setSubmitting(true);
    let targetId = activePropertyId;
    try {
      const propertyPayload = {
        submissionMode,
        title: title.trim(),
        description: description.trim(),
        purpose: purpose === "Buy" ? "Sale" : "Rent",
        propertyType: propertyType === "Apartment" ? "Flat" : propertyType,
        price: numericPrice,
        areaSize: Number(areaSize),
        areaUnit:
          areaUnit === "Sq. Ft."
            ? "SqFt"
            : areaUnit === "Sq. Yd."
              ? "SqYd"
              : areaUnit,
        location: { city: "Lahore", area: society },
        features: {
          ...features,
          electricityMeter: features.electricityMeter ?? false,
          gasConnection: features.gasConnection ?? false,
          waterSupply: features.waterSupply ?? false,
          servantQuarter: (features.rooms?.servantQuarters ?? 0) > 0 || undefined,
          parkingSpaces:
            (features.outdoor?.openParking ?? 0) +
            (features.outdoor?.coveredGarages ?? 0) +
            (features.outdoor?.carPorches ?? 0) || undefined,
          furnished: features.furnishing === "Furnished" || features.furnished || undefined,
        },
      };
      let property: PropertyApiRecord;
      if (targetId) {
        const response = await apiClient.put<ApiEnvelope<PropertyApiRecord>>(
          `/properties/${encodeURIComponent(targetId)}`,
          propertyPayload,
        );
        property = response.data.data;
      } else {
        const response = await apiClient.post<ApiEnvelope<PropertyApiRecord>>(
          "/properties",
          propertyPayload,
        );
        property = response.data.data;
        targetId = property._id;
        setActivePropertyId(targetId);
      }
      if (
        targetId &&
        submissionMode === "advertise" &&
        property.status !== "pending_approval" &&
        property.status !== "published"
      ) {
        await apiClient.post(
          `/properties/${encodeURIComponent(targetId)}/advertisement`,
        );
        property.status = "pending_approval";
        property.advertisementStatus = "pending_review";
      }

      const removedImages = savedImageUrls.filter(
        (url) => !images.some((image) => image.url === url),
      );
      for (const url of removedImages) {
        await apiClient.delete(`/properties/${encodeURIComponent(targetId)}/images`, {
          data: { url },
        });
        setSavedImageUrls((current) => current.filter((savedUrl) => savedUrl !== url));
      }

      let currentImages = [...images];
      const pendingImages = currentImages.filter((image) => image.file);
      for (const [index, image] of pendingImages.entries()) {
        const body = new FormData();
        body.append("images", image.file as File);
        const response = await apiClient.post<
          ApiEnvelope<{ images: string[]; uploaded: string[] }>
        >(`/properties/${encodeURIComponent(targetId)}/images`, body, {
          timeout: 120000,
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const perFile = progressEvent.loaded / progressEvent.total;
            setMediaProgress(
              Math.min(
                99,
                Math.round(((index + perFile) / pendingImages.length) * 100),
              ),
            );
          },
        });
        const uploadedImages = response.data.data.images;
        const uploadedUrl = response.data.data.uploaded[0];
        if (!uploadedUrl) {
          throw new Error("The server did not return the saved image URL.");
        }
        currentImages = currentImages.map((item) =>
          item.key === image.key
            ? { key: item.key, url: uploadedUrl }
            : item,
        );
        setImages(currentImages);
        setSavedImageUrls(response.data.data.images);
        setMediaProgress(
          Math.round(((index + 1) / pendingImages.length) * 100),
        );
      }

      const orderedUrls = currentImages.flatMap((image) =>
        image.url ? [image.url] : [],
      );
      await apiClient.put(
        `/properties/${encodeURIComponent(targetId)}/images/order`,
        { images: orderedUrls },
      );
      setSavedImageUrls(orderedUrls);
      setMediaProgress(null);

      const agentItem: AgentPropertyListing = {
        id: property._id,
        title: property.title,
        price: formatPKR(property.price),
        society: property.location.area,
        area: `${property.areaSize} ${property.areaUnit}`,
        beds: property.features?.bedrooms ?? 0,
        baths: property.features?.bathrooms ?? 0,
        status:
          property.status === "published"
            ? "Active"
            : property.status === "pending_approval"
              ? "Pending Review"
              : property.status === "rejected"
                ? "Rejected"
                : property.status === "sold"
                  ? "Sold"
                  : property.status === "available"
                    ? "Available"
                    : "Draft",
        purpose: property.purpose === "Rent" ? "Rent" : "Buy",
        propertyType: toFormPropertyType(property.propertyType),
        imageUrl: orderedUrls[0],
        description: property.description,
        createdAt: property.createdAt,
      };
      setSubmittedProperty(agentItem);
      onPropertyAdded?.(agentItem);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setSubmitError(
        targetId
          ? `The listing is saved, but its latest changes or photos could not all be saved. ${message} Retry to finish saving.`
          : message,
      );
    } finally {
      setMediaProgress(null);
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setRawPrice("");
    setDescription("");
    setFeatures({});
    setImages([]);
    setSavedImageUrls([]);
    setActivePropertyId("");
    setSubmittedProperty(null);
  };

  if (loadingListing) {
    return <p role="status" className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading saved listing…</p>;
  }
  if (propertyId && loadError) {
    return (
      <div role="alert" className="space-y-4 rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        <p>{loadError}</p>
        <Link href="/agent/listings" className="inline-flex min-h-11 items-center font-semibold underline">
          Return to my listings
        </Link>
      </div>
    );
  }

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
              <span>
                {submittedProperty.status === "Pending Review" || submittedProperty.status === "Active"
                  ? "Advertisement submitted"
                  : "Saved to private inventory"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {submittedProperty.status === "Pending Review" || submittedProperty.status === "Active"
                ? propertyId ? "Listing Updated Successfully" : "Submitted for Review"
                : propertyId ? "Listing Updated Successfully" : "Added to My Listings"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {submittedProperty.status === "Pending Review" || submittedProperty.status === "Active"
                ? "Your listing is in the advertising workflow and will appear publicly only after admin approval."
                : "Your property is saved in your private inventory and is not visible on the public marketplace."}
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
                  {submittedProperty.status}
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
            {!propertyId && (
              <Button onClick={handleReset} variant="outline" size="md" className="w-full sm:w-auto min-h-[46px]">
                <PlusCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Add Another Listing</span>
              </Button>
            )}
            <Link href="/agent/listings" className="w-full sm:w-auto">
              <Button size="md" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[46px] font-bold">
                <span>View My Listings</span>
                <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Form Section */
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Inventory and advertising are separate workflows. */}
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-xs text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <strong className="block text-slate-900 dark:text-white">Choose what to do when saving</strong>
                <span>Add to Listings keeps the property private. Send to Live submits it for admin review.</span>
              </div>
            </div>
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
                  {(["House", "Plot", "Apartment", "Upper Portion", "Lower Portion", "Commercial"] as PropertyType[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setPropertyType(t);
                        if (t === "Plot") {
                          setFeatures((current) => ({
                            outdoor: current.outdoor,
                            community: current.community,
                            nearby: current.nearby,
                            interior: current.interior?.filter((feature) =>
                              ["solarSystem", "upsGeneratorBackup", "waterTank", "waterFiltration", "broadbandInternet"].includes(feature),
                            ),
                            electricityMeter: current.electricityMeter,
                            gasConnection: current.gasConnection,
                            waterSupply: current.waterSupply,
                          }));
                        } else if (t === "Commercial") {
                          setFeatures((current) => ({
                            rooms: current.rooms
                              ? Object.fromEntries(
                                  Object.entries(current.rooms).filter(([key]) =>
                                    ["lobbies", "receptionAreas", "storeRooms", "basementRooms", "homeOffices", "homeGyms", "homeTheatres"].includes(key),
                                  ),
                                )
                              : undefined,
                            outdoor: current.outdoor,
                            interior: current.interior,
                            community: current.community,
                            nearby: current.nearby,
                            electricityMeter: current.electricityMeter,
                            gasConnection: current.gasConnection,
                            waterSupply: current.waterSupply,
                            furnishing: undefined,
                            furnished: undefined,
                          }));
                        }
                      }}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Area Size & Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
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
                    onChange={(e) => setAreaUnit(e.target.value as typeof areaUnit)}
                    className="flex-1 min-h-[48px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Marla">Marla</option>
                    <option value="Kanal">Kanal</option>
                    <option value="Sq. Ft.">Sq. Ft.</option>
                    <option value="Sq. Yd.">Sq. Yd.</option>
                  </select>
                </div>
              </div>
            </div>

            <PropertyFeatureSelector
              propertyType={propertyType}
              value={features}
              onChange={setFeatures}
            />
            <PropertyMediaPicker
              images={images}
              onChange={setImages}
              onError={setMediaError}
              uploadProgress={mediaProgress}
              error={mediaError}
            />

            {/* Description */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Key Features / Highlights *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Solid construction, Grohe sanitary, double height lobby, underground utilities, direct owner transfer..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {submitError && (
            <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {submitError}
            </p>
          )}

          {/* Submission actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <Link href={propertyId ? "/agent/listings" : "/agent"} className="w-full sm:w-auto order-2 sm:order-1">
              <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto min-h-[48px]">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              value="inventory"
              disabled={submitting}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto min-h-[48px] font-bold px-6 order-1 sm:order-2"
            >
              <span>{submitting ? "Saving…" : "Add to Listings"}</span>
            </Button>
            <Button
              type="submit"
              value="advertise"
              disabled={submitting}
              size="lg"
              className="w-full sm:w-auto min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-600/30 order-1 sm:order-2"
            >
              <Sparkles className="h-5 w-5 mr-2 text-amber-300 flex-shrink-0" />
              <span>
                {submitting
                  ? "Saving..."
                  : propertyId
                    ? "Save Changes"
                    : activePropertyId
                      ? "Retry Save"
                      : "Send to Live"}
              </span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
