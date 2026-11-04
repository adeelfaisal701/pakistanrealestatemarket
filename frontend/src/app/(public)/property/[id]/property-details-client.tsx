"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bath,
  Bed,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Home,
  MapPin,
  Maximize2,
  Phone,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";
import Navbar from "@/components/marketplace/Navbar";
import Footer from "@/components/marketplace/Footer";
import { Card } from "@/components/ui/card";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { TrackedCallLink } from "@/components/marketplace/TrackedCallLink";
import { PropertyConversationChat } from "@/components/marketplace/PropertyConversationChat";
import { PropertyReportForm } from "@/components/marketplace/PropertyReportForm";
import { SavePropertyButton } from "@/components/buyer/SavePropertyButton";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchPublicProperties, fetchPublicProperty } from "@/lib/public-properties";
import { recordPropertyEvent } from "@/lib/property-analytics";
import { formatLandArea } from "@/lib/utils";
import type { MarketplaceProperty, PropertyFeatureData } from "@/types/marketplace";

interface PropertyDetailsClientProps {
  propertyId: string;
}

const ROOM_LABELS: Record<string, string> = {
  attachedBathrooms: "Attached bathrooms",
  tvLounges: "TV lounges",
  drawingRooms: "Drawing rooms",
  diningRooms: "Dining rooms",
  powderRooms: "Powder rooms",
  kitchens: "Kitchens",
  additionalKitchens: "Additional kitchens",
  serviceKitchens: "Service kitchens",
  pantries: "Pantries",
  studyRooms: "Study rooms",
  prayerRooms: "Prayer rooms",
  familyLounges: "Family lounges",
  guestRooms: "Guest rooms",
  dressingRooms: "Dressing rooms",
  storeRooms: "Store rooms",
  laundryRooms: "Laundry rooms",
  servantQuarters: "Servant quarters",
  servantBathrooms: "Servant bathrooms",
  basementRooms: "Basement rooms",
  lobbies: "Lobbies",
  receptionAreas: "Sitting / reception areas",
  homeOffices: "Home offices",
  homeGyms: "Home gyms",
  homeTheatres: "Home theatres",
  steamRooms: "Steam rooms",
};

const OUTDOOR_LABELS: Record<string, string> = {
  terraces: "Terraces",
  balconies: "Balconies",
  openTerraces: "Open terraces",
  roofAccess: "Roof access",
  lawnGardens: "Lawn / gardens",
  frontYards: "Front yards",
  backyards: "Backyards",
  courtyardsPatios: "Courtyards / patios",
  verandas: "Verandas",
  carPorches: "Car porches",
  coveredGarages: "Covered garages",
  openParking: "Open parking",
  basementParking: "Basement parking",
  rooftopSittingAreas: "Rooftop sitting areas",
  bbqAreas: "BBQ areas",
};

const INTERIOR_LABELS: Record<string, string> = {
  tiles: "Tiles",
  marbleFlooring: "Marble flooring",
  woodenFlooring: "Wooden flooring",
  builtInWardrobes: "Built-in wardrobes",
  fittedKitchen: "Fitted kitchen",
  kitchenAppliances: "Kitchen appliances",
  falseCeiling: "False ceiling",
  doubleGlazedWindows: "Double-glazed windows",
  centralAc: "Central AC",
  heatingSystem: "Heating system",
  solarSystem: "Solar system",
  upsGeneratorBackup: "UPS / generator backup",
  waterTank: "Water tank",
  waterFiltration: "Water filtration",
  lift: "Lift",
  intercom: "Intercom",
  cctv: "CCTV",
  broadbandInternet: "Broadband / internet",
};

const COMMUNITY_LABELS: Record<string, string> = {
  gatedCommunity: "Gated community",
  securityStaff: "Security staff",
  maintenanceStaff: "Maintenance staff",
  mosque: "Mosque",
  park: "Park",
  childrensPlayArea: "Children's play area",
  communityCentre: "Community centre",
  swimmingPool: "Swimming pool",
  communityGym: "Community gym",
  sportsArea: "Sports area",
  walkingTrack: "Walking track",
  wasteDisposal: "Waste disposal",
};

const NEARBY_LABELS: Record<string, string> = {
  school: "School",
  hospital: "Hospital",
  market: "Market",
  mosque: "Mosque",
  publicTransport: "Public transport",
};

function formatListingDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

function formatPrice(amount: number): string {
  if (amount >= 10_000_000) {
    return `PKR ${new Intl.NumberFormat("en-PK", {
      maximumFractionDigits: 1,
    }).format(amount / 10_000_000)} Crore`;
  }
  if (amount >= 100_000) {
    return `PKR ${new Intl.NumberFormat("en-PK", {
      maximumFractionDigits: 1,
    }).format(amount / 100_000)} Lakh`;
  }
  return `PKR ${new Intl.NumberFormat("en-PK").format(amount)}`;
}

function makeFeatureRows(
  features: PropertyFeatureData | undefined,
  labels: Record<string, string>,
  group: "rooms" | "outdoor",
): Array<{ label: string; value: number }> {
  const values = features?.[group];
  if (!values) return [];
  return Object.entries(values)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0)
    .map(([key, value]) => ({ label: labels[key] ?? key, value }));
}

function makeSelectedRows(
  values: string[] | undefined,
  labels: Record<string, string>,
): string[] {
  return (values ?? []).map((value) => labels[value] ?? value);
}

function similarityScore(
  candidate: MarketplaceProperty,
  property: MarketplaceProperty,
): number {
  const localityMatch =
    candidate.location.area.trim().toLocaleLowerCase() ===
    property.location.area.trim().toLocaleLowerCase();
  const cityMatch =
    candidate.location.city.trim().toLocaleLowerCase() ===
    property.location.city.trim().toLocaleLowerCase();
  const areaRatio =
    Math.min(candidate.areaSize, property.areaSize) /
    Math.max(candidate.areaSize, property.areaSize, 1);
  const priceRatio =
    Math.min(candidate.price, property.price) /
    Math.max(candidate.price, property.price, 1);

  return (
    (localityMatch ? 100_000 : 0) +
    (candidate.propertyType === property.propertyType ? 10_000 : 0) +
    (candidate.purpose === property.purpose ? 1_000 : 0) +
    (cityMatch ? 100 : 0) +
    areaRatio * 50 +
    priceRatio * 25
  );
}

function FeatureList({
  title,
  rows,
}: {
  title: string;
  rows: string[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
            <span>{row}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PropertyDetailsClient({
  propertyId,
}: PropertyDetailsClientProps) {
  const [property, setProperty] = useState<MarketplaceProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [shareMessage, setShareMessage] = useState("");
  const [similarProperties, setSimilarProperties] = useState<MarketplaceProperty[]>([]);
  const [similarError, setSimilarError] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchPublicProperty(propertyId)
      .then((result) => {
        if (!active) return;
        setProperty(result);
        setActiveImage(0);
        setBrokenImages(new Set());
        void recordPropertyEvent(propertyId, "view").catch((requestError: unknown) => {
          console.error("Unable to record property view analytics.", requestError);
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        const status = (
          requestError as { response?: { status?: number } }
        )?.response?.status;
        setError(
          status === 400 || status === 404
            ? "This property listing could not be found or is no longer available."
            : getApiErrorMessage(requestError),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!property) {
      setSimilarProperties([]);
      setSimilarError("");
      return;
    }

    let active = true;
    setSimilarError("");
    const filters = {
      city: property.location.city || undefined,
      limit: 100,
    };

    Promise.allSettled([
      fetchPublicProperties({
        ...filters,
        area: property.location.area || undefined,
      }),
      fetchPublicProperties(filters),
    ]).then((responses) => {
      if (!active) return;
      const successful = responses.filter(
        (response): response is PromiseFulfilledResult<MarketplaceProperty[]> =>
          response.status === "fulfilled",
      );
      if (successful.length === 0) {
        const failed = responses.find(
          (response): response is PromiseRejectedResult =>
            response.status === "rejected",
        );
        setSimilarError(
          failed ? getApiErrorMessage(failed.reason) : "Similar properties could not be loaded.",
        );
        return;
      }

      const candidates = new Map<string, MarketplaceProperty>();
      successful.forEach(({ value }) => {
        value.forEach((candidate) => {
          if (
            candidate.id !== property.id &&
            candidate.status === "published" &&
            candidate.availabilityStatus !== "sold" &&
            candidate.availabilityStatus !== "rented" &&
            candidate.availabilityStatus !== "ended"
          ) {
            candidates.set(candidate.id, candidate);
          }
        });
      });

      setSimilarProperties(
        [...candidates.values()]
          .sort((left, right) => similarityScore(right, property) - similarityScore(left, property))
          .slice(0, 4),
      );
      if (successful.length < responses.length) {
        const failed = responses.find(
          (response): response is PromiseRejectedResult =>
            response.status === "rejected",
        );
        if (failed) console.error("One similar-property query failed.", failed.reason);
      }
    });

    return () => {
      active = false;
    };
  }, [property]);

  const images = property?.images ?? [];
  const validImages = images.filter((image) => !brokenImages.has(image));
  const currentImage = images[activeImage];
  const currentImageIsAvailable =
    Boolean(currentImage) && !brokenImages.has(currentImage);

  const moveImage = useCallback(
    (direction: number) => {
      if (validImages.length < 2) return;
      const current = validImages.indexOf(currentImage ?? "");
      const next = (Math.max(0, current) + direction + validImages.length) % validImages.length;
      const image = validImages[next];
      setActiveImage(images.indexOf(image));
    },
    [currentImage, images, validImages],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") moveImage(-1);
      if (event.key === "ArrowRight") moveImage(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, moveImage]);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-property-section]");
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
        if (visible?.target instanceof HTMLElement) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [property, similarProperties]);

  const markImageBroken = (image: string) => {
    setBrokenImages((current) => new Set(current).add(image));
  };

  const copyPageLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: property?.title,
          url: window.location.href,
        });
        setShareMessage("Property link shared.");
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("Property link copied.");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setShareMessage("Could not share the link. Copy it from your browser address bar.");
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const diff =
      (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(diff) > 40) moveImage(diff < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const pageShell = (content: React.ReactNode) => (
    <>
      <Navbar showSearch />
      {content}
      <Footer />
    </>
  );

  if (loading) {
    return pageShell(
      <main className="min-h-[65vh] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <p
          role="status"
          className="mx-auto max-w-7xl animate-pulse rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"
        >
          Loading property details…
        </p>
      </main>,
    );
  }

  if (error || !property) {
    return pageShell(
      <main className="min-h-[65vh] bg-slate-50 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Property unavailable</h1>
        <p role="alert" className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
          {error || "This property listing could not be found or is no longer available."}
        </p>
        <Link
          href="/properties"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Browse available properties
        </Link>
      </main>,
    );
  }

  const agent = property.agent;
  const phone = agent?.phone?.trim();
  const availability = property.availabilityStatus ?? "available";
  const availabilityLabel = availability
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const isAvailable = availability === "available";
  const canChat = /^[0-9a-f]{24}$/i.test(property.id);
  const listedDate = formatListingDate(property.createdAt);
  const approximateLocation = [property.location.area, property.location.city]
    .filter(Boolean)
    .join(", ");
  const mapSearchUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(approximateLocation)}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(approximateLocation)}`;
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(approximateLocation)}&output=embed`;
  const isResidential = ["House", "Flat", "Upper Portion", "Lower Portion"].includes(
    property.propertyType,
  );
  const roomRows = makeFeatureRows(property.features, ROOM_LABELS, "rooms");
  const outdoorRows = makeFeatureRows(property.features, OUTDOOR_LABELS, "outdoor");
  const selectedInterior = makeSelectedRows(property.features?.interior, INTERIOR_LABELS);
  const selectedCommunity = makeSelectedRows(property.features?.community, COMMUNITY_LABELS);
  const selectedNearby = makeSelectedRows(property.features?.nearby, NEARBY_LABELS);
  const featureRows = [
    ...(property.features?.servantQuarter ? ["Servant quarter"] : []),
    ...(property.features?.electricityMeter ? ["Electricity meter"] : []),
    ...(property.features?.gasConnection ? ["Gas connection"] : []),
    ...(property.features?.waterSupply ? ["Water supply"] : []),
    ...selectedInterior,
  ];
  const sectionLinks = [
    { id: "overview", label: "Overview" },
    ...(property.description.trim() ? [{ id: "description", label: "Description" }] : []),
    ...(featureRows.length || selectedCommunity.length || selectedNearby.length
      ? [{ id: "features", label: "Features" }]
      : []),
    ...(roomRows.length || outdoorRows.length || property.features?.bedrooms || property.features?.bathrooms
      ? [{ id: "rooms", label: "Rooms & spaces" }]
      : []),
    ...(approximateLocation ? [{ id: "location", label: "Location" }] : []),
    { id: "agent", label: "Agent" },
    { id: "similar-properties", label: "Similar properties" },
  ];

  return pageShell(
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-2 overflow-hidden text-xs text-slate-500 sm:text-sm">
          <Link href="/" className="shrink-0 hover:text-blue-700">Home</Link>
          <span aria-hidden="true">/</span>
          {property.location.city && (
            <>
              <Link
                href={`/properties?city=${encodeURIComponent(property.location.city)}`}
                className="shrink-0 hover:text-blue-700"
              >
                {property.location.city}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          {property.location.area && (
            <>
              <span className="shrink-0">{property.location.area}</span>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="truncate font-medium text-slate-700 dark:text-slate-300">
            {property.title}
          </span>
        </nav>

        <section
          aria-label="Property summary"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)_minmax(260px,0.8fr)]"
        >
          <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200 p-0 dark:border-slate-800">
            <div
              className="group relative aspect-[16/10] min-h-64 overflow-hidden bg-slate-200 dark:bg-slate-800 sm:aspect-[1.65/1] lg:aspect-[1.28/1]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentImageIsAvailable ? (
                <button
                  type="button"
                  aria-label="Open property photo gallery"
                  onClick={() => setLightboxOpen(true)}
                  className="h-full w-full cursor-zoom-in"
                >
                  <img
                    src={currentImage}
                    alt={`${property.title} property photo ${activeImage + 1}`}
                    className="h-full w-full object-cover"
                    onError={() => markImageBroken(currentImage)}
                  />
                </button>
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Building2 className="mx-auto h-10 w-10" />
                    <p className="mt-2 text-sm">No property photo available</p>
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
              <span className="absolute left-4 top-4 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-bold uppercase text-white shadow-sm">
                For {property.purpose}
              </span>
              {images.length > 0 && (
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-lg bg-black/65 px-3 py-2 text-xs font-semibold text-white">
                  <Eye className="h-4 w-4" />
                  {Math.min(activeImage + 1, images.length)} / {images.length}
                </span>
              )}
              {validImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveImage(-1)}
                    aria-label="Previous property photo"
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(1)}
                    aria-label="Next property photo"
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {validImages.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto p-3 sm:p-4">
                {validImages.slice(0, 4).map((image) => {
                  const imageIndex = images.indexOf(image);
                  return (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setActiveImage(imageIndex)}
                      aria-label={`Show property photo ${imageIndex + 1}`}
                      aria-pressed={activeImage === imageIndex}
                      className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 sm:h-[72px] sm:w-24 ${
                        activeImage === imageIndex
                          ? "border-blue-700"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={() => markImageBroken(image)}
                      />
                    </button>
                  );
                })}
                {images.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="flex h-16 min-w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 sm:h-[72px] sm:min-w-24 dark:bg-slate-800 dark:text-slate-200"
                  >
                    +{images.length - 4} photos
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="ml-auto flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200"
                >
                  View all photos
                </button>
              </div>
            )}
          </Card>

          <Card className="flex min-w-0 flex-col justify-between rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                  {property.propertyType}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {availabilityLabel}
                </span>
              </div>
              <h1 className="text-xl font-bold leading-snug text-slate-900 dark:text-white sm:text-2xl">
                {property.title}
              </h1>
              {approximateLocation && (
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{approximateLocation}</span>
                </p>
              )}
              <p className="mt-5 text-2xl font-extrabold tracking-tight text-blue-800 dark:text-blue-300 sm:text-3xl">
                {formatPrice(property.price)}
                {property.purpose === "Rent" && (
                  <span className="ml-1 text-sm font-medium text-slate-500">/ month</span>
                )}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 border-y border-slate-100 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Maximize2 className="h-4 w-4 shrink-0 text-blue-700" />
                <span>{formatLandArea(property.areaSize, property.areaUnit)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Home className="h-4 w-4 shrink-0 text-blue-700" />
                <span>{property.propertyType}</span>
              </div>
              {isResidential && typeof property.features?.bedrooms === "number" && property.features.bedrooms > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Bed className="h-4 w-4 shrink-0 text-blue-700" />
                  <span>{property.features.bedrooms} bedrooms</span>
                </div>
              )}
              {isResidential && typeof property.features?.bathrooms === "number" && property.features.bathrooms > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Bath className="h-4 w-4 shrink-0 text-blue-700" />
                  <span>{property.features.bathrooms} bathrooms</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {listedDate ? `Listed ${listedDate}` : "Listing date unavailable"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyPageLink()}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <SavePropertyButton propertyId={property.id} compact />
              </div>
            </div>
            {shareMessage && (
              <p role="status" className="mt-2 text-right text-xs text-slate-500">
                {shareMessage}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">Property ID: {property.id}</p>
          </Card>

          <aside id="agent" data-property-section className="min-w-0 scroll-mt-28 md:col-span-2 lg:col-span-1">
            <Card className="h-full rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6 lg:sticky lg:top-24">
              <div className="flex items-center gap-3">
                {agent?.avatarUrl ? (
                  <img
                    src={agent.avatarUrl}
                    alt={`${agent.name ?? "Agent"} profile`}
                    className="h-14 w-14 shrink-0 rounded-full bg-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {(agent?.name || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-white">
                    <span className="truncate">{agent?.name || "Agent details unavailable"}</span>
                    {agent?.isVerified === true && (
                      <span title="Verified agent" aria-label="Verified agent">
                        <CheckCircle2 className="h-4 w-4 shrink-0 fill-blue-700 text-white dark:fill-blue-400 dark:text-slate-950" />
                      </span>
                    )}
                  </h2>
                  {agent?.agencyName && (
                    <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                      {agent.agencyName}
                    </p>
                  )}
                  {agent?.city && (
                    <p className="mt-0.5 text-xs text-slate-500">{agent.city}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {phone ? (
                  <>
                    <TrackedCallLink
                      propertyId={property.id}
                      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Phone className="h-4 w-4" />
                      Call agent
                    </TrackedCallLink>
                    <WhatsAppButton
                      propertyId={property.id}
                      phoneNumber={phone}
                      message={`Salam, I am interested in "${property.title}" listed for ${formatPrice(property.price)} in ${approximateLocation}.`}
                      className="min-h-11"
                    >
                      WhatsApp agent
                    </WhatsAppButton>
                  </>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800">
                    Contact details are not available for this listing.
                  </p>
                )}
                {canChat && (
                  <>
                    <PropertyConversationChat
                      propertyId={property.id}
                      propertyTitle={property.title}
                      coverImage={images[0]}
                      location={approximateLocation}
                      price={property.price}
                      availability={availability}
                      disabled={!isAvailable}
                    />
                    <PropertyConversationChat
                      propertyId={property.id}
                      propertyTitle={property.title}
                      coverImage={images[0]}
                      location={approximateLocation}
                      price={property.price}
                      availability={availability}
                      disabled={!isAvailable}
                      buttonLabel="Send inquiry"
                    />
                  </>
                )}
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
                {listedDate && (
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Listed {listedDate}
                  </p>
                )}
                {typeof property.viewsCount === "number" && (
                  <p className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {property.viewsCount.toLocaleString()} views
                  </p>
                )}
              </div>
              {/^[0-9a-f]{24}$/i.test(property.id) && (
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <PropertyReportForm propertyId={property.id} />
                </div>
              )}
            </Card>
          </aside>
        </section>

        <nav
          aria-label="Property detail sections"
          className="sticky top-20 z-30 -mx-4 mt-6 overflow-x-auto border-y border-slate-200 bg-slate-50/95 px-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2 dark:border-slate-800 dark:bg-slate-950/95"
        >
          <div className="flex min-w-max items-center gap-1 py-2">
            {sectionLinks.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={activeSection === id ? "location" : undefined}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  activeSection === id
                    ? "bg-blue-700 text-white"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-800 dark:text-slate-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <section
          id="overview"
          data-property-section
          className="mt-6 scroll-mt-28"
        >
          <Card className="rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Property overview</h2>
                <p className="mt-1 text-sm text-slate-500">Listing details and specifications</p>
              </div>
              <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 sm:inline-flex dark:bg-blue-950/50 dark:text-blue-300">
                {property.purpose}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <div>
                <dt className="text-xs text-slate-500">Property type</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{property.propertyType}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Purpose</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{property.purpose}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Price</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{formatPrice(property.price)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Area</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{formatLandArea(property.areaSize, property.areaUnit)}</dd>
              </div>
              {property.location.area && (
                <div>
                  <dt className="text-xs text-slate-500">Locality</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{property.location.area}</dd>
                </div>
              )}
              {property.location.city && (
                <div>
                  <dt className="text-xs text-slate-500">City</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{property.location.city}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Availability</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{availabilityLabel}</dd>
              </div>
              {isResidential && typeof property.features?.bedrooms === "number" && property.features.bedrooms > 0 && (
                <div>
                  <dt className="text-xs text-slate-500">Bedrooms</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{property.features.bedrooms}</dd>
                </div>
              )}
              {isResidential && typeof property.features?.bathrooms === "number" && property.features.bathrooms > 0 && (
                <div>
                  <dt className="text-xs text-slate-500">Bathrooms</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{property.features.bathrooms}</dd>
                </div>
              )}
              {typeof property.features?.parkingSpaces === "number" && property.features.parkingSpaces > 0 && (
                <div>
                  <dt className="text-xs text-slate-500">Parking</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{property.features.parkingSpaces} spaces</dd>
                </div>
              )}
              {listedDate && (
                <div>
                  <dt className="text-xs text-slate-500">Listed</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{listedDate}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Property ID</dt>
                <dd className="mt-1 break-all font-semibold text-slate-900 dark:text-white">{property.id}</dd>
              </div>
            </dl>
          </Card>
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          <div className="space-y-6">
            {property.description.trim() && (
              <section id="description" data-property-section className="scroll-mt-28">
                <Card className="rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Description</h2>
                  <p
                    className={`mt-4 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300 ${
                      !showFullDescription ? "line-clamp-7" : ""
                    }`}
                  >
                    {property.description}
                  </p>
                  {property.description.length > 420 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((current) => !current)}
                      className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
                    >
                      {showFullDescription ? "Show less" : "Read full description"}
                    </button>
                  )}
                </Card>
              </section>
            )}

            <Card className="rounded-2xl border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900/60 dark:bg-blue-950/20 sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Safety tips</h2>
              </div>
              <ul className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                {[
                  "Verify ownership and documents before making a payment.",
                  "Inspect the property and confirm its exact location with the agent.",
                  "Check agent or agency credentials before proceeding.",
                  "Use secure payment channels and keep written transaction records.",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="space-y-6">
            {(featureRows.length > 0 || selectedCommunity.length > 0 || selectedNearby.length > 0) && (
              <section id="features" data-property-section className="scroll-mt-28">
                <Card className="space-y-5 rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Amenities & features</h2>
                  <FeatureList title="Construction, interior & utilities" rows={featureRows} />
                  <FeatureList title="Community facilities" rows={selectedCommunity} />
                  <FeatureList title="Nearby facilities" rows={selectedNearby} />
                </Card>
              </section>
            )}

            {(roomRows.length > 0 ||
              outdoorRows.length > 0 ||
              (isResidential && property.features?.furnishing)) && (
              <section id="rooms" data-property-section className="scroll-mt-28">
                <Card className="space-y-5 rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rooms & spaces</h2>
                  {isResidential && property.features?.furnishing && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Furnishing: <span className="font-semibold text-slate-900 dark:text-white">{property.features.furnishing}</span>
                    </p>
                  )}
                  {roomRows.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {roomRows.map(({ label, value }) => (
                        <li key={label} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/70">
                          <span className="text-slate-600 dark:text-slate-300">{label}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {outdoorRows.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {outdoorRows.map(({ label, value }) => (
                        <li key={label} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/70">
                          <span className="text-slate-600 dark:text-slate-300">{label}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>
            )}

            {approximateLocation && (
              <section id="location" data-property-section className="scroll-mt-28">
                <Card className="overflow-hidden rounded-2xl border-slate-200 p-0 dark:border-slate-800">
                  <div className="p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Approximate location</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <MapPin className="h-4 w-4 shrink-0 text-blue-700" />
                      {approximateLocation}
                    </p>
                  </div>
                  <div className="relative h-48 bg-slate-100 sm:h-56 dark:bg-slate-800">
                    <iframe
                      title={`Approximate map of ${approximateLocation}`}
                      src={googleMapsEmbedUrl}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="h-full w-full border-0"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 p-5 sm:px-6">
                    <a
                      href={mapSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                    >
                      OpenStreetMap <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                    >
                      Google Maps <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="px-5 pb-5 text-xs text-slate-500 sm:px-6">
                    Only the public locality is shown. Exact addresses and private coordinates are shared by the agent when authorized.
                  </p>
                </Card>
              </section>
            )}
          </div>
        </div>

        <section
          id="similar-properties"
          data-property-section
          className="mt-10 scroll-mt-28 space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Similar properties</h2>
              <p className="mt-1 text-sm text-slate-500">
                Published listings in a similar locality, type and price range.
              </p>
            </div>
            <Link
              href="/properties"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
            >
              Browse all listings
            </Link>
          </div>
          {similarError ? (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Similar properties could not be loaded: {similarError}
            </p>
          ) : similarProperties.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {similarProperties.map((similarProperty) => (
                <Card
                  key={similarProperty.id}
                  className="group min-w-0 overflow-hidden rounded-2xl border-slate-200 p-0 transition-shadow hover:shadow-md dark:border-slate-800"
                >
                  <div className="relative aspect-[16/10] bg-slate-200 dark:bg-slate-800">
                    {similarProperty.images[0] ? (
                      <img
                        src={similarProperty.images[0]}
                        alt={similarProperty.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-md bg-blue-700 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                      For {similarProperty.purpose}
                    </span>
                    <div className="absolute right-3 top-3">
                      <SavePropertyButton propertyId={similarProperty.id} compact />
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="truncate text-lg font-bold text-blue-800 dark:text-blue-300">
                      {formatPrice(similarProperty.price)}
                      {similarProperty.purpose === "Rent" && (
                        <span className="ml-1 text-xs font-medium text-slate-500">/ month</span>
                      )}
                    </p>
                    <Link
                      href={`/property/${encodeURIComponent(similarProperty.id)}`}
                      className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-300"
                    >
                      {similarProperty.title}
                    </Link>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Maximize2 className="h-3.5 w-3.5" />
                        {formatLandArea(similarProperty.areaSize, similarProperty.areaUnit)}
                      </span>
                      <span>{similarProperty.propertyType}</span>
                    </div>
                    <p className="flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" />
                      <span className="line-clamp-1">
                        {[similarProperty.location.area, similarProperty.location.city]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </p>
                    <Link
                      href={`/property/${encodeURIComponent(similarProperty.id)}`}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-blue-200 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
                    >
                      View details
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No similar published listings are available right now.
            </p>
          )}
        </section>
      </div>

      {lightboxOpen && currentImageIsAvailable && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Property image viewer"
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                moveImage(-1);
              }}
              aria-label="Previous property image"
              className="absolute left-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}
          <img
            src={currentImage}
            alt={`${property.title} photo ${activeImage + 1}`}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
            onError={() => markImageBroken(currentImage)}
          />
          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                moveImage(1);
              }}
              aria-label="Next property image"
              className="absolute right-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}
        </div>
      )}
    </main>,
  );
}
