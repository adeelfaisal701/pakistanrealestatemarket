import React from "react";
import Link from "next/link";
import { MapPin, Bed, Bath, Maximize2, MessageCircle, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPKR, formatLandArea } from "@/lib/utils";
import type { Property } from "@/types";

export interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const whatsappNumber = property.agent?.phone?.replace(/[^0-9]/g, "") || "923001234567";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Salam, I am interested in: "${property.title}" (PKR ${property.price.toLocaleString()}) listed in ${property.location.city}.`
  )}`;

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 flex flex-col justify-between w-full">
      {/* Property Image Placeholder */}
      <div className="relative aspect-[16/10] bg-slate-200 dark:bg-slate-800 overflow-hidden w-full">
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <span>No Image Provided</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <Badge variant={property.purpose === "Sale" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
            FOR {property.purpose.toUpperCase()}
          </Badge>
          {property.isFeatured && (
            <Badge variant="warning" className="font-bold text-[10px] sm:text-xs">
              FEATURED
            </Badge>
          )}
        </div>
      </div>

      {/* Property Info Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-1.5">
          <div className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatPKR(property.price)}
          </div>
          <Link href={`/property/${property.id}`}>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1 hover:text-emerald-600 transition-colors">
              {property.title}
            </h3>
          </Link>
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

        {/* Card CTA Actions with touch friendly heights */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button variant="default" size="md" className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs min-h-[42px] font-bold gap-1.5">
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              <span>WhatsApp</span>
            </Button>
          </a>
          <Link href={`/property/${property.id}`} className="w-full">
            <Button variant="outline" size="md" className="w-full text-xs min-h-[42px] font-semibold gap-1.5">
              <Eye className="h-4 w-4 flex-shrink-0" />
              <span>Details</span>
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
