import React from "react";
import Link from "next/link";
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  Eye,
  CheckCircle2,
  Phone,
  ArrowLeft,
  Share2,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { formatPKR, formatLandArea } from "@/lib/utils";

interface PropertyDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailsPage({ params }: PropertyDetailsPageProps) {
  const resolvedParams = await params;
  const propertyId = resolvedParams.id;

  // Placeholder Property Data
  const property = {
    id: propertyId,
    title: "1 Kanal Luxury Designer House in DHA Phase 6",
    description: `A masterfully designed 1 Kanal modern bungalow located in the prime sector of DHA Phase 6, Lahore. 
    Constructed with top-grade materials, Italian and Spanish porcelain tiles, bespoke Turkish chandeliers, and branded appliances. 
    
    Features include:
    - 5 spacious master bedrooms with attached designer bathrooms
    - Imported dirty and show kitchens with cooking range
    - Dedicated basement home cinema and entertainment lounge
    - 3 dedicated parking bays and servant quarters with independent bath
    - Ready utilities: Electricity 3-phase meter, Gas connection, and high-pressure water supply.`,
    purpose: "Sale" as const,
    propertyType: "House" as const,
    price: 95000000,
    areaSize: 1,
    areaUnit: "Kanal" as const,
    location: {
      city: "Lahore",
      area: "DHA Phase 6, Sector L",
      address: "Street 14, Sector L, DHA Phase 6, Lahore",
    },
    features: {
      bedrooms: 5,
      bathrooms: 6,
      parkingSpaces: 3,
      servantQuarter: true,
      furnished: false,
      electricityMeter: true,
      gasConnection: true,
      waterSupply: true,
    },
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    ],
    agent: {
      id: "agent-1",
      name: "Chaudhry Tariq Mehmood",
      agencyName: "Chaudhry & Sons Real Estate Advisors",
      phone: "+923001234567",
      email: "tariq@chaudhryrealestate.pk",
      isVerified: true,
      city: "Lahore",
    },
    viewsCount: 1420,
    createdAt: "2025-01-15T10:00:00Z",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Breadcrumb & Back button */}
      <div className="flex items-center justify-between">
        <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to all listings</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <Heart className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-3xl overflow-hidden shadow-sm">
        <div className="md:col-span-2 aspect-[16/10] bg-slate-200 dark:bg-slate-800">
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800">
            <img
              src={property.images[1]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800">
            <img
              src={property.images[2]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Details & Agent Inquiry Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Badge variant="default">FOR {property.purpose.toUpperCase()}</Badge>
              <Badge variant="secondary">{property.propertyType}</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>{property.location.address}</span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 pt-2">
              {formatPKR(property.price)}
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Area</span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {formatLandArea(property.areaSize, property.areaUnit)}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Bedrooms</span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {property.features.bedrooms} Beds
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Bathrooms</span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {property.features.bathrooms} Baths
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Parking</span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {property.features.parkingSpaces} Cars
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Overview & Description</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {property.description}
            </p>
          </div>
        </div>

        {/* Right Column: Agent Profile & Instant WhatsApp Card */}
        <div className="lg:col-span-1">
          <Card className="p-6 space-y-6 sticky top-24">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg">
                {property.agent.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <span>{property.agent.name}</span>
                  {property.agent.isVerified && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                  )}
                </h3>
                <p className="text-xs text-slate-500">{property.agent.agencyName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <WhatsAppButton
                phoneNumber={property.agent.phone}
                message={`Salam ${property.agent.name}, I am interested in your listing: "${property.title}" on ZameenConnect.`}
                className="w-full h-11"
              />
              <Button variant="outline" className="w-full h-11 gap-2 text-xs">
                <Phone className="h-4 w-4" />
                <span>Call Agent ({property.agent.phone})</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
