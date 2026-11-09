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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Home,
  MessageCircle,
  MapPin,
  Maximize2,
  Phone,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";
import Navbar from "@/components/marketplace/Navbar";
import { Card } from "@/components/ui/card";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { TrackedCallLink } from "@/components/marketplace/TrackedCallLink";
import { PropertyConversationChat } from "@/components/marketplace/PropertyConversationChat";
import { PropertyReportForm } from "@/components/marketplace/PropertyReportForm";
import { SavePropertyButton } from "@/components/buyer/SavePropertyButton";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchPublicProperties, fetchPublicProperty } from "@/lib/public-properties";
import { createAnalyticsId, recordPropertyEvent } from "@/lib/property-analytics";
import { normalizeInternationalPhone } from "@/lib/phone";
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
  return (values ?? [])
    .filter((value) => value.trim().length > 0)
    .map((value) => labels[value] ?? value);
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
          <li key={row} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300 max-md:text-xs">
            <Check className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span>{row}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobilePropertyHeader({
  propertyId,
  onShare,
}: {
  propertyId: string;
  onShare: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/90 px-3 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl md:hidden dark:border-slate-800/70 dark:bg-slate-950/90">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else window.location.assign("/");
          }}
          className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-800 transition-colors hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
          Property Details
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Share listing"
          onClick={onShare}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Share2 className="h-5 w-5" />
        </button>
        <SavePropertyButton propertyId={propertyId} compact />
      </div>
    </header>
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
  const [expandedFeatureCategory, setExpandedFeatureCategory] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [activeMobileSection, setActiveMobileSection] = useState("overview");
  const [showStickyContactActions, setShowStickyContactActions] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const viewVisit = useRef<{ propertyId: string; viewId: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (viewVisit.current?.propertyId !== propertyId) {
      viewVisit.current = { propertyId, viewId: createAnalyticsId() };
    }
    const visitId = viewVisit.current.viewId;
    setExpandedFeatureCategory(null);
    setLoading(true);
    setError("");

    fetchPublicProperty(propertyId)
      .then((result) => {
        if (!active) return;
        setProperty(result);
        setActiveImage(0);
        setBrokenImages(new Set());
        void recordPropertyEvent(propertyId, "view", visitId)
          .then(({ viewsCount }) => {
            if (active && typeof viewsCount === "number") {
              setProperty((current) =>
                current?.id === propertyId
                  ? { ...current, viewsCount }
                  : current,
              );
            }
          })
          .catch((requestError: unknown) => {
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
            if (["overview", "attributes", "features", "location", "similar-properties"].includes(visible.target.id)) {
              setActiveMobileSection(visible.target.id);
            }
          }
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [property, similarProperties]);

  useEffect(() => {
    const agentSection = document.getElementById("agent");
    if (!agentSection) return;

    const mobileQuery = window.matchMedia("(max-width: 767px)");
    let observer: IntersectionObserver | null = null;

    const observeAgentSection = () => {
      observer?.disconnect();
      if (!mobileQuery.matches) {
        setShowStickyContactActions(false);
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          setShowStickyContactActions(
            !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
          );
        },
        { threshold: 0 },
      );
      observer.observe(agentSection);
    };

    observeAgentSection();
    mobileQuery.addEventListener("change", observeAgentSection);
    return () => {
      observer?.disconnect();
      mobileQuery.removeEventListener("change", observeAgentSection);
    };
  }, [property]);

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

  const navigateToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    event.preventDefault();
    if (window.location.hash !== `#${sectionId}`) {
      window.history.pushState(null, "", `#${sectionId}`);
    }
    setActiveMobileSection(sectionId);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <MobilePropertyHeader propertyId={propertyId} onShare={() => void copyPageLink()} />
      <div className="hidden md:block">
        <Navbar showSearch />
      </div>
      {content}
      <div className="pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0" />
    </>
  );

  if (loading) {
    return pageShell(
      <main className="min-h-[65vh] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <p
          role="status"
          className="mx-auto max-w-7xl animate-pulse rounded-2xl border border-slate-200 bg-white p-10 pt-24 text-center text-sm text-slate-500 md:pt-10"
        >
          Loading property details…
        </p>
      </main>,
    );
  }

  if (error || !property) {
    return pageShell(
      <main className="min-h-[65vh] bg-slate-50 px-4 py-16 pt-24 text-center md:pt-16">
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
  const agentProfileHref = agent?._id
    ? `/agents/${encodeURIComponent(agent._id)}`
    : undefined;
  const phone = normalizeInternationalPhone(agent?.phone ?? "");
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
  const featureCategories: Array<{
    id: string;
    title: string;
    features: Array<{ label: string; value?: number | string }>;
  }> = [
    {
      id: "construction",
      title: "Construction, interior & utilities",
      features: [
        ...featureRows.map((label) => ({ label })),
        ...(isResidential && property.features?.furnishing
          ? [{ label: "Furnishing", value: property.features.furnishing }]
          : []),
      ],
    },
    {
      id: "community",
      title: "Community facilities",
      features: selectedCommunity.map((label) => ({ label })),
    },
    {
      id: "nearby",
      title: "Nearby facilities",
      features: selectedNearby.map((label) => ({ label })),
    },
    {
      id: "rooms",
      title: "Rooms & spaces",
      features: roomRows.map(({ label, value }) => ({ label, value })),
    },
    {
      id: "outdoor",
      title: "Outdoor spaces",
      features: outdoorRows.map(({ label, value }) => ({ label, value })),
    },
  ].filter((category) => category.features.length > 0);
  const totalFeatureCount = featureCategories.reduce(
    (total, category) => total + category.features.length,
    0,
  );
  const sectionLinks = [
    { id: "overview", label: "Overview" },
    { id: "attributes", label: "Attributes" },
    ...(featureRows.length || selectedCommunity.length || selectedNearby.length ||
    roomRows.length || outdoorRows.length ||
    (isResidential && property.features?.furnishing)
      ? [{ id: "features", label: "Features" }]
      : []),
    ...(approximateLocation ? [{ id: "location", label: "Location" }] : []),
    { id: "similar-properties", label: "Similar properties" },
  ];
  const mobileSectionLinks = [
    { id: "overview", label: "Overview" },
    { id: "attributes", label: "Attributes" },
    { id: "features", label: "Features" },
    { id: "location", label: "Location" },
    { id: "similar-properties", label: "Similar Properties" },
  ];

  return pageShell(
    <main className="min-h-screen bg-[#faf8ff] pb-14 pt-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-4 sm:px-6 lg:px-8 max-md:px-0 max-md:pb-8 max-md:pt-0">
        <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-2 overflow-hidden text-xs text-slate-500 sm:text-sm max-md:hidden">
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
          id="overview"
          data-property-section
          aria-label="Property summary"
          className="scroll-mt-24 grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)_minmax(260px,0.8fr)] max-md:gap-0 max-md:scroll-mt-16"
        >
          <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200 p-0 dark:border-slate-800 max-md:rounded-none max-md:border-0 max-md:shadow-none">
            <div className="group relative aspect-[4/3] min-h-64 overflow-hidden bg-slate-200 dark:bg-slate-800 max-xl:min-h-0 xl:aspect-[1.28/1] max-md:aspect-[4/3]">
              <div
                className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto scroll-smooth md:hidden"
                onScroll={(event) => {
                  const index = Math.round(
                    event.currentTarget.scrollLeft / event.currentTarget.clientWidth,
                  );
                  const image = validImages[index];
                  if (image) setActiveImage(images.indexOf(image));
                }}
              >
                {validImages.length > 0 ? validImages.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    aria-label={`Open property photo ${index + 1} of ${validImages.length}`}
                    onClick={() => {
                      setActiveImage(images.indexOf(image));
                      setLightboxOpen(true);
                    }}
                    className="h-full w-full shrink-0 snap-center"
                  >
                    <img
                      src={image}
                      alt={`${property.title} property photo ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => markImageBroken(image)}
                    />
                  </button>
                )) : (
                  <div className="flex h-full w-full shrink-0 items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Building2 className="mx-auto h-10 w-10" />
                      <p className="mt-2 text-sm">No property photo available</p>
                    </div>
                  </div>
                )}
              </div>
              <div
                className="relative hidden h-full w-full md:block"
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
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white max-xl:h-11 max-xl:w-11"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(1)}
                    aria-label="Next property photo"
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white max-xl:h-11 max-xl:w-11"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute left-3 right-3 top-3 flex items-start justify-between md:hidden">
                <span className="rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white shadow">
                  For {property.purpose}
                </span>
                <span className="rounded-full bg-slate-950/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  {Math.max(1, validImages.indexOf(currentImage ?? "") + 1)} / {validImages.length}
                </span>
              </div>
              {validImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-3 right-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-bold text-slate-800 shadow md:hidden"
                >
                  <Eye className="h-4 w-4" />
                  View all photos
                </button>
              )}
            </div>
            {validImages.length > 0 && (
              <div className="hidden items-center gap-2 overflow-x-auto p-3 sm:p-4 md:flex">
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

          <Card className="flex min-w-0 flex-col justify-between rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6 max-md:rounded-none max-md:border-0 max-md:px-4 max-md:py-5 max-md:shadow-none">
            <div className="flex flex-col">
              <p className="order-1 text-[26px] font-extrabold leading-8 tracking-tight text-[#005c55] dark:text-emerald-300 md:order-4 md:mt-5 md:text-2xl md:text-blue-800 dark:md:text-blue-300">
                {formatPrice(property.price)}
                {property.purpose === "Rent" && (
                  <span className="ml-1 text-sm font-medium text-slate-500">/ month</span>
                )}
              </p>
              <div className="order-2 mb-3 flex flex-wrap gap-2 max-md:mt-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                  {property.propertyType}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {availabilityLabel}
                </span>
              </div>
              <h1 className="text-xl font-bold leading-snug text-slate-900 dark:text-white sm:text-2xl max-md:order-3 max-md:mt-2">
                {property.title}
              </h1>
              {approximateLocation && (
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400 max-md:order-4">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{approximateLocation}</span>
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 border-y border-slate-100 py-4 dark:border-slate-800 max-md:mt-4 max-md:grid-cols-4 max-md:gap-1.5 max-md:border-0 max-md:py-0">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 max-md:flex-col max-md:gap-1 max-md:rounded-xl max-md:bg-[#f2f3ff] max-md:px-1 max-md:py-2 max-md:text-center max-md:text-[11px] dark:max-md:bg-slate-800">
                <Maximize2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span>{formatLandArea(property.areaSize, property.areaUnit)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 max-md:flex-col max-md:gap-1 max-md:rounded-xl max-md:bg-[#f2f3ff] max-md:px-1 max-md:py-2 max-md:text-center max-md:text-[11px] dark:max-md:bg-slate-800">
                <Home className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span>{property.propertyType}</span>
              </div>
              {isResidential && typeof property.features?.bedrooms === "number" && property.features.bedrooms > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 max-md:flex-col max-md:gap-1 max-md:rounded-xl max-md:bg-[#f2f3ff] max-md:px-1 max-md:py-2 max-md:text-center max-md:text-[11px] dark:max-md:bg-slate-800">
                  <Bed className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>{property.features.bedrooms} bedrooms</span>
                </div>
              )}
              {isResidential && typeof property.features?.bathrooms === "number" && property.features.bathrooms > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 max-md:flex-col max-md:gap-1 max-md:rounded-xl max-md:bg-[#f2f3ff] max-md:px-1 max-md:py-2 max-md:text-center max-md:text-[11px] dark:max-md:bg-slate-800">
                  <Bath className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>{property.features.bathrooms} bathrooms</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 max-md:hidden">
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
              <p role="status" className="mt-2 text-right text-xs text-slate-500 max-md:hidden">
                {shareMessage}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500 max-md:hidden">Property ID: {property.id}</p>
          </Card>

          <aside id="agent" data-property-section className="min-w-0 scroll-mt-28 md:col-span-2 lg:col-span-1 max-md:px-4">
            <Card className="h-full rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6 lg:sticky lg:top-24 max-md:gap-3 max-md:border-slate-100 max-md:p-4 max-md:shadow-sm">
              <div className="flex items-center gap-3">
                {agentProfileHref ? (
                  <Link href={agentProfileHref} aria-label={`View ${agent?.name ?? "agent"} profile`}>
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
                  </Link>
                ) : agent?.avatarUrl ? (
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
                    {agentProfileHref ? (
                      <Link href={agentProfileHref} className="truncate hover:text-emerald-700 dark:hover:text-emerald-300">
                        {agent?.name || "Agent details unavailable"}
                      </Link>
                    ) : (
                      <span className="truncate">{agent?.name || "Agent details unavailable"}</span>
                    )}
                    {agent?.isVerified === true && (
                      <span title="Verified agent" aria-label="Verified agent">
                        <CheckCircle2 className="h-4 w-4 shrink-0 fill-blue-700 text-white dark:fill-blue-400 dark:text-slate-950" />
                      </span>
                    )}
                  </h2>
                  {agent?.agencyName && (
                    <Link href={`/agencies?name=${encodeURIComponent(agent.agencyName)}`} className="mt-0.5 block truncate text-xs text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
                      {agent.agencyName}
                    </Link>
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
                      href={`tel:+${phone}`}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Phone className="h-4 w-4" />
                      Call agent
                    </TrackedCallLink>
                  </>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800">
                    Contact details are not available for this listing.
                  </p>
                )}
                {(phone || canChat) && (
                  <div
                    className={`grid min-w-0 grid-cols-3 gap-2 [&>button]:h-10 [&>button]:min-h-10 [&>button]:min-w-0 [&>button]:gap-1 [&>button]:rounded-xl [&>button]:px-1 [&>button]:text-[11px] [&>button]:font-semibold [&>button]:whitespace-nowrap [&>button>svg]:h-3.5 [&>button>svg]:w-3.5 ${
                      showStickyContactActions
                        ? "max-md:!fixed max-md:!inset-x-0 max-md:!top-16 max-md:!mt-0 max-md:z-[55] max-md:mx-auto max-md:max-w-lg max-md:!border-b max-md:border-slate-200 max-md:bg-white/95 max-md:px-3 max-md:py-2 max-md:shadow-md max-md:backdrop-blur-xl dark:max-md:border-slate-800 dark:max-md:bg-slate-950/95"
                        : ""
                    }`}
                  >
                    {phone && (
                      <WhatsAppButton
                        propertyId={property.id}
                        phoneNumber={phone}
                        message={`Salam, I am interested in "${property.title}" listed for ${formatPrice(property.price)} in ${approximateLocation}.`}
                        className="h-10 min-h-10 min-w-0 gap-1 rounded-xl px-1 text-[11px] font-semibold [&>svg]:h-3.5 [&>svg]:w-3.5"
                      >
                        WhatsApp
                      </WhatsAppButton>
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
                          buttonLabel="Chat"
                        />
                        <PropertyConversationChat
                          propertyId={property.id}
                          propertyTitle={property.title}
                          coverImage={images[0]}
                          location={approximateLocation}
                          price={property.price}
                          availability={availability}
                          disabled={!isAvailable}
                          buttonLabel="Enquiry"
                        />
                      </>
                    )}
                  </div>
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
          className="sticky top-20 z-30 -mx-4 mt-6 overflow-x-auto border-y border-slate-200 bg-slate-50/95 px-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2 dark:border-slate-800 dark:bg-slate-950/95 max-md:hidden"
        >
          <div className="flex min-w-max items-center gap-1 py-2">
            {sectionLinks.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={activeSection === id ? "location" : undefined}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  activeSection === id
                    ? "bg-emerald-800 text-white"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
        <nav
          aria-label="Property detail sections"
          className={`fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-950/95 ${
            showStickyContactActions ? "" : "hidden"
          }`}
        >
          <div
            className="mx-auto grid max-w-lg items-center gap-0.5"
            style={{
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            }}
          >
            {mobileSectionLinks.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={activeMobileSection === id ? "location" : undefined}
                onClick={(event) => navigateToSection(event, id)}
                className={`flex min-h-11 min-w-0 items-center justify-center rounded-lg px-0.5 text-center text-[10px] font-semibold leading-tight transition-colors ${
                  activeMobileSection === id
                    ? "bg-emerald-800 text-white"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                }`}
              >
                <span>{label}</span>
              </a>
            ))}
          </div>
        </nav>

        {property.description.trim() && (
          <section
            id="description"
            data-property-section
            className="mt-6 scroll-mt-28 max-md:mx-4 max-md:mt-4"
          >
            <Card className="rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6 max-md:border-0 max-md:p-4 max-md:shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Property Description</h2>
              <p
                className={`mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300 ${
                  !showFullDescription ? "line-clamp-7" : ""
                }`}
              >
                {property.description}
              </p>
              {property.description.length > 420 && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((current) => !current)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:text-emerald-900 dark:text-emerald-300"
                >
                  {showFullDescription ? "Show Less" : "Read More"}
                  <ChevronRight className={`h-4 w-4 transition-transform ${showFullDescription ? "-rotate-90" : "rotate-90"}`} />
                </button>
              )}
            </Card>
          </section>
        )}

        <section
          id="attributes"
          data-property-section
          className="mt-6 scroll-mt-28 max-md:mx-4 max-md:mt-4"
        >
          <Card className="rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6 max-md:border-0 max-md:p-4 max-md:shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Property Specifications</h2>
                <p className="mt-1 text-sm text-slate-500">Listing details and attributes</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {property.purpose}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-md:gap-x-3 max-md:gap-y-4">
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

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)] max-md:mx-4 max-md:mt-4 max-md:grid-cols-1">
          <div className="space-y-6">
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
            {(featureRows.length > 0 ||
              selectedCommunity.length > 0 ||
              selectedNearby.length > 0 ||
              roomRows.length > 0 ||
              outdoorRows.length > 0 ||
              (isResidential && property.features?.furnishing)) && (
              <section id="features" data-property-section className="scroll-mt-28">
                  <Card className="space-y-5 rounded-2xl border-slate-200 p-5 dark:border-slate-800 sm:p-6 max-md:space-y-3 max-md:border-0 max-md:p-4 max-md:shadow-sm">
                    <div className="md:hidden">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {totalFeatureCount} Features & amenities
                      </h2>
                      <div className="mt-3 space-y-2">
                        {featureCategories.map((category) => {
                          const expanded = expandedFeatureCategory === category.id;
                          const contentId = `feature-category-${category.id}`;
                          return (
                            <section
                              key={category.id}
                              className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                            >
                              <button
                                type="button"
                                aria-expanded={expanded}
                                aria-controls={contentId}
                                onClick={() =>
                                  setExpandedFeatureCategory(expanded ? null : category.id)
                                }
                                className="flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left"
                              >
                                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                                  {category.title}
                                </span>
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {category.features.length}
                                </span>
                                <ChevronDown
                                  aria-hidden="true"
                                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 ${
                                    expanded ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              <div
                                id={contentId}
                                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                }`}
                              >
                                <div className="min-h-0 overflow-hidden">
                                  <ul className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
                                    {category.features.map((feature) => (
                                      <li
                                        key={`${feature.label}-${feature.value ?? ""}`}
                                        className="max-w-full rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs leading-5 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
                                      >
                                        <span className="break-words">
                                          {feature.value !== undefined
                                            ? `${feature.label} · ${feature.value}`
                                            : feature.label}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </div>
                    <div className="hidden md:block">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Features & amenities</h2>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {featureRows.length + selectedCommunity.length + selectedNearby.length + roomRows.length + outdoorRows.length}
                    </span>
                  </div>
                  <FeatureList title="Construction, interior & utilities" rows={featureRows} />
                  <FeatureList title="Community facilities" rows={selectedCommunity} />
                  <FeatureList title="Nearby facilities" rows={selectedNearby} />
                  {isResidential && property.features?.furnishing && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Furnishing: <span className="font-semibold text-slate-900 dark:text-white">{property.features.furnishing}</span>
                    </p>
                  )}
                  {roomRows.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rooms & spaces</h3>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {roomRows.map(({ label, value }) => (
                          <li key={label} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/70">
                            <span className="text-slate-600 dark:text-slate-300">{label}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {outdoorRows.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Outdoor spaces</h3>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {outdoorRows.map(({ label, value }) => (
                          <li key={label} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/70">
                            <span className="text-slate-600 dark:text-slate-300">{label}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </div>
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
          className="mt-10 scroll-mt-28 space-y-4 max-md:mt-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 max-md:px-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Similar Properties</h2>
              <p className="mt-1 text-sm text-slate-500 max-md:text-xs">
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-3 max-md:overflow-x-auto max-md:px-4 max-md:pb-2">
              {similarProperties.map((similarProperty) => (
                <Card
                  key={similarProperty.id}
                  className="group min-w-0 overflow-hidden rounded-2xl border-slate-200 p-0 transition-shadow hover:shadow-md dark:border-slate-800 max-md:w-[260px] max-md:flex-none max-md:snap-start"
                >
                  <div className="relative aspect-[16/10] bg-slate-200 dark:bg-slate-800 max-md:h-36 max-md:aspect-auto">
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
                    <span className="absolute left-3 top-3 rounded-full bg-emerald-800 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                      For {similarProperty.purpose}
                    </span>
                    <div className="absolute right-3 top-3">
                      <SavePropertyButton propertyId={similarProperty.id} compact />
                    </div>
                  </div>
                  <div className="space-y-2.5 p-4 max-md:p-3">
                    <p className="truncate text-lg font-bold text-emerald-800 dark:text-emerald-300 max-md:text-base">
                      {formatPrice(similarProperty.price)}
                      {similarProperty.purpose === "Rent" && (
                        <span className="ml-1 text-xs font-medium text-slate-500">/ month</span>
                      )}
                    </p>
                    <Link
                      href={`/property/${encodeURIComponent(similarProperty.id)}`}
                      className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
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
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-emerald-200 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
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
