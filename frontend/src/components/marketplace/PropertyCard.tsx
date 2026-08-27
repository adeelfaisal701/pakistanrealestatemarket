'use client';

import React from 'react';
import { Bed, Bath, Maximize2, MapPin, Phone, ShieldCheck, MessageCircle } from 'lucide-react';
import { Property } from '@/types/property';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const whatsappMessage = encodeURIComponent(
    `Assalam o Alaikum, I am interested in this listing on PRM: "${property.title}" priced at ${property.price} located in ${property.location}, ${property.society}. Please share more details.`
  );

  const whatsappUrl = `https://wa.me/${property.agentPhone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;
  const callUrl = `tel:+${property.agentPhone.replace(/[^0-9]/g, '')}`;

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between w-full">
      <div>
        {/* Card Image Header & Badges */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Gradient Overlay for badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-md backdrop-blur-md">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="truncate">{property.freshnessBadge}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-600/90 text-white shadow-md backdrop-blur-md flex-shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{property.verificationLevel}</span>
            </span>
          </div>

          {/* Purpose & Type Tag on bottom of image */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide bg-slate-900/90 text-emerald-400 backdrop-blur-sm border border-emerald-500/30">
              For {property.purpose}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wide bg-slate-900/90 text-white backdrop-blur-sm">
              {property.type}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Price & Society */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
              {property.price}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md flex-shrink-0 max-w-[45%] truncate text-right">
              {property.society}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {property.title}
          </h3>

          {/* Location */}
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">{property.location}</span>
          </p>

          {/* Property Key Specs */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 py-2.5 border-y border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-medium">
            <div className="flex items-center gap-1 justify-center bg-slate-50 dark:bg-slate-800/50 py-1.5 px-1 rounded-lg min-w-0">
              <Maximize2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{property.area}</span>
            </div>
            {property.beds > 0 ? (
              <div className="flex items-center gap-1 justify-center bg-slate-50 dark:bg-slate-800/50 py-1.5 px-1 rounded-lg min-w-0">
                <Bed className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{property.beds} Beds</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 justify-center bg-slate-50 dark:bg-slate-800/50 py-1.5 px-1 rounded-lg text-slate-400 min-w-0">
                <span className="truncate">Plot / Comm.</span>
              </div>
            )}
            {property.baths > 0 ? (
              <div className="flex items-center gap-1 justify-center bg-slate-50 dark:bg-slate-800/50 py-1.5 px-1 rounded-lg min-w-0">
                <Bath className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{property.baths} Baths</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 justify-center bg-slate-50 dark:bg-slate-800/50 py-1.5 px-1 rounded-lg text-slate-400 min-w-0">
                <span className="truncate">Open</span>
              </div>
            )}
          </div>

          {/* Agent Information */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                {property.agentName.charAt(0)}
              </div>
              <span className="font-medium truncate text-slate-700 dark:text-slate-300">
                {property.agentName}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex-shrink-0">
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Direct WhatsApp & Call with touch-friendly min-h-[44px] */}
      <div className="p-4 sm:p-5 pt-0 grid grid-cols-2 gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98] min-h-[44px]"
        >
          <MessageCircle className="h-4 w-4 flex-shrink-0" />
          <span>WhatsApp</span>
        </a>
        <a
          href={callUrl}
          className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98] min-h-[44px]"
        >
          <Phone className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 flex-shrink-0" />
          <span>Call Agent</span>
        </a>
      </div>
    </div>
  );
}
