import React from "react";
import { FilterPanel } from "@/components/marketplace/filter-panel";
import { PropertyCard } from "@/components/marketplace/property-card";
import { SearchBar } from "@/components/marketplace/search-bar";
import type { Property } from "@/types";

const MOCK_CATALOG: Property[] = [
  {
    id: "prop-101",
    title: "1 Kanal Modern Elevation House in DHA Phase 5",
    description: "Solid construction with basement, rooftop terrace, 5 master beds, and Jacuzzi baths.",
    purpose: "Sale",
    propertyType: "House",
    price: 88000000,
    areaSize: 1,
    areaUnit: "Kanal",
    location: {
      city: "Lahore",
      area: "DHA Phase 5, Sector C",
    },
    features: {
      bedrooms: 5,
      bathrooms: 6,
      parkingSpaces: 3,
    },
    images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"],
    agentId: "agent-1",
    status: "published",
    isFeatured: true,
    viewsCount: 940,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prop-102",
    title: "5 Marla Brand New House in Central Park Housing Scheme",
    description: "Compact luxury family home with double unit setup, modern kitchen, and 3 bedrooms.",
    purpose: "Sale",
    propertyType: "House",
    price: 18500000,
    areaSize: 5,
    areaUnit: "Marla",
    location: {
      city: "Lahore",
      area: "Central Park Housing Scheme",
    },
    features: {
      bedrooms: 3,
      bathrooms: 3,
      parkingSpaces: 1,
    },
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"],
    agentId: "agent-2",
    status: "published",
    isFeatured: false,
    viewsCount: 410,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prop-103",
    title: "2 Bed Corner Apartment in Gulberg Greens",
    description: "High-floor luxury flat with fast elevators, gymnasium, swimming pool, and 24/7 security.",
    purpose: "Rent",
    propertyType: "Flat",
    price: 110000,
    areaSize: 1450,
    areaUnit: "SqFt",
    location: {
      city: "Islamabad",
      area: "Gulberg Greens, Civic Center",
    },
    features: {
      bedrooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
    },
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"],
    agentId: "agent-3",
    status: "published",
    isFeatured: true,
    viewsCount: 780,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function PropertiesCatalogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Search Filter Header */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Properties for Sale & Rent in Pakistan
        </h1>
        <SearchBar />
      </div>

      {/* Main Filter Sidebar & Listings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filter Panel */}
        <aside className="lg:col-span-1">
          <FilterPanel />
        </aside>

        {/* Right Listings Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between text-sm text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span>Showing <strong>{MOCK_CATALOG.length}</strong> verified properties</span>
            <div className="flex items-center gap-2">
              <span>Sort by:</span>
              <select className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-transparent">
                <option>Newest Listed</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {MOCK_CATALOG.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
