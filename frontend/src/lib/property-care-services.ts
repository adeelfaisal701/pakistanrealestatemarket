/**
 * Static marketing content for the public Property Care service pages.
 * Category keys mirror the backend MAINTENANCE_CATEGORIES (backend is the
 * source of truth for which categories can be requested). No prices or
 * unverifiable claims are listed here — pricing is always quoted per job.
 */
export interface PropertyCareService {
  key: string;
  slug: string;
  title: string;
  shortTitle: string;
  tagline: string;
  summary: string;
  commonJobs: string[];
  included: string[];
  goodToKnow: string[];
  accent: string; // tailwind background tint for icon tiles
}

export const PROPERTY_CARE_SERVICES: PropertyCareService[] = [
  {
    key: "plumbing",
    slug: "plumbing",
    title: "Plumbing",
    shortTitle: "Plumbing",
    tagline: "Leaks, blockages, taps and geysers",
    summary:
      "From a dripping tap to a blocked drain or a geyser that will not heat, our plumbing technicians diagnose the cause and fix it properly.",
    commonJobs: [
      "Leaking taps, pipes and joints",
      "Blocked sinks, drains and commodes",
      "Geyser installation and repair",
      "Water pump and motor issues",
      "Bathroom and kitchen fittings",
      "Low water pressure",
    ],
    included: [
      "On-site inspection and diagnosis",
      "Written quotation before chargeable work",
      "Before and after photos of the job",
      "Clean-up of the work area",
    ],
    goodToKnow: [
      "If possible, turn off the main valve for active leaks before the visit.",
      "Photos of the leak or fitting help the technician bring the right parts.",
    ],
    accent: "bg-sky-50 text-sky-700",
  },
  {
    key: "electrical",
    slug: "electrical",
    title: "Electrical",
    shortTitle: "Electrical",
    tagline: "Wiring, sockets, breakers, lights and fans",
    summary:
      "Safe, tidy electrical work for homes and offices — from replacing a socket to tracing a tripping breaker.",
    commonJobs: [
      "Tripping breakers and short circuits",
      "Socket, switch and DB repairs",
      "Ceiling fan and light installation",
      "UPS and inverter wiring",
      "New points and rewiring",
      "Earthing checks",
    ],
    included: [
      "Safety-first fault finding",
      "Written quotation before chargeable work",
      "Before and after photos of the job",
      "Testing after completion",
    ],
    goodToKnow: [
      "Do not attempt repairs on live wiring — switch off the affected circuit if safe to do so.",
      "Note which rooms or appliances are affected.",
    ],
    accent: "bg-amber-50 text-amber-700",
  },
  {
    key: "ac_repair",
    slug: "ac-repair",
    title: "AC Repair & Maintenance",
    shortTitle: "AC Repair",
    tagline: "Servicing, gas refill, installation and repair",
    summary:
      "Keep your split or inverter AC cooling efficiently with servicing, gas top-ups, installation and fault repair.",
    commonJobs: [
      "General AC service and cleaning",
      "Gas refill and leak checks",
      "Not cooling or water dripping",
      "Installation and uninstallation",
      "PCB and compressor faults",
      "Inverter AC diagnostics",
    ],
    included: [
      "Inspection and diagnosis",
      "Written quotation before chargeable work",
      "Before and after photos",
      "Cooling performance check",
    ],
    goodToKnow: [
      "Share the AC brand, tonnage and model if you know it.",
      "Clear access to indoor and outdoor units speeds up the visit.",
    ],
    accent: "bg-cyan-50 text-cyan-700",
  },
  {
    key: "general_handyman",
    slug: "general-handyman",
    title: "General Handyman",
    shortTitle: "Handyman",
    tagline: "Fixtures, fittings, mounting and small repairs",
    summary:
      "For the to-do list that keeps growing — mounting, assembling, fixing and adjusting around the home.",
    commonJobs: [
      "TV and shelf mounting",
      "Curtain rods and blinds",
      "Door handles, locks and hinges",
      "Furniture assembly",
      "Minor wall and tile repairs",
      "Hanging frames and mirrors",
    ],
    included: [
      "One technician for multiple small tasks",
      "Written quotation before chargeable work",
      "Before and after photos",
      "Clean-up of the work area",
    ],
    goodToKnow: [
      "List every small task in one request so they can be done in a single visit.",
    ],
    accent: "bg-indigo-50 text-indigo-700",
  },
  {
    key: "painting",
    slug: "painting",
    title: "Painting",
    shortTitle: "Painting",
    tagline: "Interior, exterior and touch-ups",
    summary:
      "Fresh walls without the hassle — surface preparation, painting and touch-ups for rooms, homes and offices.",
    commonJobs: [
      "Room and full-house painting",
      "Touch-ups and patch repairs",
      "Damp and seepage treatment",
      "Exterior wall painting",
      "Wood and metal polishing",
      "Wall putty and preparation",
    ],
    included: [
      "Site inspection and area measurement",
      "Itemised quotation for labour and materials",
      "Furniture covering and clean-up",
      "Before and after photos",
    ],
    goodToKnow: [
      "Larger jobs usually start with an inspection visit so the quotation is accurate.",
      "Share photos of each wall and any damp patches.",
    ],
    accent: "bg-rose-50 text-rose-700",
  },
  {
    key: "carpentry",
    slug: "carpentry",
    title: "Carpentry",
    shortTitle: "Carpentry",
    tagline: "Doors, cabinets, furniture and woodwork",
    summary:
      "Repairs and adjustments for doors, wardrobes, kitchen cabinets and furniture, done neatly and built to last.",
    commonJobs: [
      "Door alignment and repair",
      "Kitchen cabinet hinges and shutters",
      "Wardrobe and drawer repairs",
      "Furniture repair and polishing",
      "Lock and handle replacement",
      "Custom shelving",
    ],
    included: [
      "Inspection and diagnosis",
      "Written quotation before chargeable work",
      "Before and after photos",
      "Clean-up of sawdust and debris",
    ],
    goodToKnow: [
      "Measurements and photos help the technician bring matching hardware.",
    ],
    accent: "bg-orange-50 text-orange-700",
  },
  {
    key: "water_tank_cleaning",
    slug: "water-tank-cleaning",
    title: "Water Tank Cleaning",
    shortTitle: "Tank Cleaning",
    tagline: "Overhead and underground tanks",
    summary:
      "Thorough cleaning of overhead and underground water tanks to keep your household water supply clean.",
    commonJobs: [
      "Overhead tank cleaning",
      "Underground tank cleaning",
      "Sludge and sediment removal",
      "Tank lid and fitting checks",
    ],
    included: [
      "Draining, scrubbing and rinsing",
      "Written quotation before chargeable work",
      "Before and after photos",
      "Refill guidance after cleaning",
    ],
    goodToKnow: [
      "Water supply is interrupted during cleaning — plan for a few hours without tank water.",
      "Mention tank size and location (roof or underground).",
    ],
    accent: "bg-teal-50 text-teal-700",
  },
];

export function findServiceBySlug(slug: string) {
  return PROPERTY_CARE_SERVICES.find((service) => service.slug === slug);
}

export function findServiceByKey(key: string) {
  return PROPERTY_CARE_SERVICES.find((service) => service.key === key);
}

export const REQUEST_SERVICE_PATH = "/care/new";

export function requestServiceHref(key?: string) {
  return key ? `${REQUEST_SERVICE_PATH}?category=${encodeURIComponent(key)}` : REQUEST_SERVICE_PATH;
}
