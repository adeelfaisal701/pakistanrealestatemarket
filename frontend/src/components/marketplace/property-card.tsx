import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Bed, Bath, Maximize2, MessageCircle, Eye, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPKR, formatLandArea } from "@/lib/utils";
import type { MarketplaceProperty } from "@/types/marketplace";
import { TrackedWhatsAppLink } from "./TrackedWhatsAppLink";
import { TrackedCallLink } from "./TrackedCallLink";
import { SavePropertyButton } from "@/components/buyer/SavePropertyButton";

export interface PropertyCardProps {
  property: MarketplaceProperty;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const whatsappNumber = property.agent?.phone?.replace(/[^0-9]/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Salam, I am interested in: "${property.title}" (PKR ${property.price.toLocaleString()}) listed in ${property.location.city}.`
  )}` : "";
  const highlights = [
    (property.features?.rooms?.tvLounges ?? 0) > 0
      ? `${property.features?.rooms?.tvLounges} TV lounges`
      : "",
    (property.features?.rooms?.kitchens ?? 0) > 0
      ? `${property.features?.rooms?.kitchens} kitchens`
      : "",
    (property.features?.parkingSpaces ?? 0) > 0
      ? `${property.features?.parkingSpaces} parking spaces`
      : "",
    property.features?.furnishing ?? "",
  ].filter(Boolean).slice(0, 2);

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 flex flex-col justify-between w-full">
      <Link
        href={`/property/${encodeURIComponent(property.id)}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`View details for ${property.title}`}
      >
        <span className="sr-only">View property details</span>
      </Link>
      <div className="relative z-10 pointer-events-none">
      <div className="relative aspect-[16/10] bg-slate-200 dark:bg-slate-800 overflow-hidden w-full">
          {property.images?.[0] && !imageUnavailable ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImageUnavailable(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
              {property.images?.[0] ? "Property image unavailable" : "No image available"}
            </div>
          )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={property.purpose === "Sale" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
              FOR {property.purpose.toUpperCase()}
            </Badge>
          </div>
          {property.isFeatured && (
            <Badge variant="warning" className="font-bold text-[10px] sm:text-xs">
              FEATURED
            </Badge>
          )}
        </div>
        <div className="absolute right-2.5 top-2.5 z-10 pointer-events-auto">
          <SavePropertyButton propertyId={property.id} compact />
        </div>
      </div>

      {/* Property Info Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-1.5">
          <div className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatPKR(property.price)}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center text-xs text-slate-500 gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">
              {property.location.area}, {property.location.city}
            </span>
          </div>
        </div>

        {/* Property Features */}
        <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1 min-w-0">
            <Maximize2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">{formatLandArea(property.areaSize, property.areaUnit)}</span>
          </div>
          {property.features?.bedrooms !== undefined && (
            <div className="flex items-center gap-1 min-w-0">
              <Bed className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{property.features.bedrooms} Beds</span>
            </div>
          )}
          {property.features?.bathrooms !== undefined && (
            <div className="flex items-center gap-1 min-w-0">
              <Bath className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{property.features.bathrooms} Baths</span>
            </div>
          )}
        </div>
        {highlights.length > 0 && (
          <p className="truncate text-xs text-slate-500">
            {highlights.join(" · ")}
          </p>
        )}

        {/* Card CTA Actions with touch friendly heights */}
      </div>
      </div>
      <div className="relative z-20 pointer-events-auto grid grid-cols-2 gap-2 p-4 pt-1 sm:grid-cols-3 sm:p-5 sm:pt-1">
          {whatsappUrl ? (
            <TrackedWhatsAppLink
              propertyId={property.id}
              href={whatsappUrl}
              className="w-full"
            >
            <Button variant="default" size="md" className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs min-h-[42px] font-bold gap-1.5">
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              <span>WhatsApp</span>
            </Button>
            </TrackedWhatsAppLink>
          ) : (
            <Button
              variant="outline"
              size="md"
              disabled
              className="w-full text-xs min-h-[42px] font-semibold gap-1.5"
              aria-label="WhatsApp contact unavailable"
            >
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              <span>WhatsApp unavailable</span>
            </Button>
          )}
          {whatsappUrl && (
            <TrackedCallLink
              propertyId={property.id}
              href={`tel:${property.agent?.phone?.replace(/[^\d+]/g, "") ?? ""}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>Call</span>
            </TrackedCallLink>
          )}
          <Link href={`/property/${encodeURIComponent(property.id)}`} className="w-full">
            <Button variant="outline" size="md" className="w-full text-xs min-h-[42px] font-semibold gap-1.5">
              <Eye className="h-4 w-4 flex-shrink-0" />
              <span>Details</span>
            </Button>
          </Link>
      </div>
    </Card>
  );
}
