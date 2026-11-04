"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { PropertyFeatureData } from "@/types/marketplace";

type PropertyKind = "House" | "Plot" | "Apartment" | "Upper Portion" | "Lower Portion" | "Commercial";

const ROOMS = [
  ["attachedBathrooms", "Attached bathrooms"],
  ["tvLounges", "TV lounges"],
  ["drawingRooms", "Drawing rooms"],
  ["diningRooms", "Dining rooms"],
  ["powderRooms", "Powder rooms"],
  ["kitchens", "Main kitchens"],
  ["additionalKitchens", "Additional kitchens"],
  ["serviceKitchens", "Dirty / service kitchens"],
  ["pantries", "Pantries"],
  ["studyRooms", "Study rooms"],
  ["prayerRooms", "Prayer rooms"],
  ["familyLounges", "Family lounges"],
  ["guestRooms", "Guest rooms"],
  ["dressingRooms", "Dressing rooms"],
  ["storeRooms", "Store rooms"],
  ["laundryRooms", "Laundry rooms"],
  ["servantQuarters", "Servant quarters"],
  ["servantBathrooms", "Servant bathrooms"],
  ["basementRooms", "Basement rooms"],
  ["lobbies", "Lobbies"],
  ["receptionAreas", "Sitting / reception areas"],
  ["homeOffices", "Home offices"],
  ["homeGyms", "Home gyms"],
  ["homeTheatres", "Home theatres"],
  ["steamRooms", "Steam rooms"],
] as const;

const OUTDOOR = [
  ["terraces", "Terraces"],
  ["balconies", "Balconies"],
  ["openTerraces", "Open terraces"],
  ["roofAccess", "Roof access"],
  ["lawnGardens", "Lawn / gardens"],
  ["frontYards", "Front yards"],
  ["backyards", "Backyards"],
  ["courtyardsPatios", "Courtyards / patios"],
  ["verandas", "Verandas"],
  ["carPorches", "Car porches"],
  ["coveredGarages", "Covered garages"],
  ["openParking", "Open parking"],
  ["basementParking", "Basement parking"],
  ["rooftopSittingAreas", "Rooftop sitting areas"],
  ["bbqAreas", "BBQ areas"],
] as const;

const INTERIOR = [
  ["tiles", "Tiles"],
  ["marbleFlooring", "Marble flooring"],
  ["woodenFlooring", "Wooden flooring"],
  ["builtInWardrobes", "Built-in wardrobes"],
  ["fittedKitchen", "Fitted kitchen"],
  ["kitchenAppliances", "Kitchen appliances"],
  ["falseCeiling", "False ceiling"],
  ["doubleGlazedWindows", "Double-glazed windows"],
  ["centralAc", "Central AC"],
  ["heatingSystem", "Heating system"],
  ["solarSystem", "Solar system"],
  ["upsGeneratorBackup", "UPS / generator backup"],
  ["waterTank", "Water tank"],
  ["waterFiltration", "Water filtration"],
  ["lift", "Lift"],
  ["intercom", "Intercom"],
  ["cctv", "CCTV"],
  ["broadbandInternet", "Broadband / internet"],
] as const;

const COMMUNITY = [
  ["gatedCommunity", "Gated community"],
  ["securityStaff", "Security staff"],
  ["maintenanceStaff", "Maintenance staff"],
  ["mosque", "Mosque"],
  ["park", "Park"],
  ["childrensPlayArea", "Children's play area"],
  ["communityCentre", "Community centre"],
  ["swimmingPool", "Swimming pool"],
  ["communityGym", "Community gym"],
  ["sportsArea", "Sports area"],
  ["walkingTrack", "Walking track"],
  ["wasteDisposal", "Waste disposal"],
] as const;

const NEARBY = [
  ["school", "School"],
  ["hospital", "Hospital"],
  ["market", "Market"],
  ["mosque", "Mosque"],
  ["publicTransport", "Public transport"],
] as const;

const RESIDENTIAL_TYPES = new Set<PropertyKind>([
  "House",
  "Apartment",
  "Upper Portion",
  "Lower Portion",
]);
const COMMERCIAL_ROOMS = new Set([
  "lobbies",
  "receptionAreas",
  "storeRooms",
  "basementRooms",
  "homeOffices",
  "homeGyms",
  "homeTheatres",
]);
const PLOT_OUTDOOR = new Set([
  "roofAccess",
  "lawnGardens",
  "frontYards",
  "backyards",
  "courtyardsPatios",
  "openParking",
  "basementParking",
]);
const PLOT_UTILITIES = new Set([
  "solarSystem",
  "upsGeneratorBackup",
  "waterTank",
  "waterFiltration",
  "broadbandInternet",
]);

interface PropertyFeatureSelectorProps {
  propertyType: PropertyKind;
  value: PropertyFeatureData;
  onChange: (features: PropertyFeatureData) => void;
}

export function PropertyFeatureSelector({
  propertyType,
  value,
  onChange,
}: PropertyFeatureSelectorProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const residential = RESIDENTIAL_TYPES.has(propertyType);
  const rooms = propertyType === "Commercial"
    ? ROOMS.filter(([key]) => COMMERCIAL_ROOMS.has(key))
    : residential
      ? ROOMS
      : [];
  const outdoor = propertyType === "Plot"
    ? OUTDOOR.filter(([key]) => PLOT_OUTDOOR.has(key))
    : OUTDOOR;
  const interior = propertyType === "Plot"
    ? INTERIOR.filter(([key]) => PLOT_UTILITIES.has(key))
    : INTERIOR;
  const groups: Array<{
    key: "rooms" | "outdoor" | "interior" | "community" | "nearby";
    title: string;
    options: ReadonlyArray<readonly [string, string]>;
  }> = [
    { key: "rooms", title: "Rooms and indoor spaces", options: rooms },
    { key: "outdoor", title: "Outdoor spaces and parking", options: outdoor },
    { key: "interior", title: "Construction, interior, and utilities", options: interior },
    { key: "community", title: "Community facilities", options: COMMUNITY },
    { key: "nearby", title: "Nearby facilities", options: NEARBY },
  ];

  const toggleSelection = (
    group: "interior" | "community" | "nearby",
    option: string,
    checked: boolean,
  ) => {
    const selections = new Set(value[group] ?? []);
    if (checked) selections.add(option);
    else selections.delete(option);
    onChange({ ...value, [group]: [...selections] });
  };

  const changeCount = (
    group: "rooms" | "outdoor",
    option: string,
    raw: string,
  ) => {
    const values = { ...(value[group] ?? {}) };
    if (!raw) delete values[option];
    else values[option] = Math.min(50, Math.max(0, Number(raw)));
    onChange({ ...value, [group]: values });
  };

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      options: group.options.filter(([, label]) =>
        !query || label.toLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.options.length > 0);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
      <header>
        <h4 className="font-semibold text-slate-900 dark:text-white">
          Rooms and property features
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          All fields are optional. Counts can be left blank when a feature is not present.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {residential && (
          <>
            <label className="text-sm text-slate-700 dark:text-slate-300">
              Bedrooms
              <input
                type="number"
                min="0"
                max="50"
                value={value.bedrooms ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    bedrooms: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-300">
              Bathrooms
              <input
                type="number"
                min="0"
                max="50"
                value={value.bathrooms ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    bathrooms: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"
              />
            </label>
          </>
        )}
        {residential && (
          <label className="text-sm text-slate-700 dark:text-slate-300">
            Furnishing
            <select
              value={value.furnishing ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  furnishing: event.target.value
                    ? (event.target.value as PropertyFeatureData["furnishing"])
                    : undefined,
                  furnished: event.target.value === "Furnished" || undefined,
                })
              }
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Not specified</option>
              <option value="Furnished">Furnished</option>
              <option value="Semi-furnished">Semi-furnished</option>
              <option value="Unfurnished">Unfurnished</option>
            </select>
          </label>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Connections
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ["electricityMeter", "Electricity meter"],
            ["gasConnection", "Gas connection"],
            ["waterSupply", "Water supply"],
          ] as const).map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm dark:bg-slate-800/60"
            >
              <input
                type="checkbox"
                checked={value[key] ?? false}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.checked })
                }
                className="h-4 w-4 accent-emerald-600"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="relative block">
        <span className="sr-only">Search property features</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search rooms or facilities"
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent pl-9 pr-3 text-sm dark:border-slate-700"
        />
      </label>

      <div className="space-y-2">
        {visibleGroups.map((group, index) => (
          <details
            key={group.key}
            open={index === 0 || Boolean(query)}
            className="rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {group.title}
            </summary>
            <div className="grid gap-2 border-t border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-2">
              {group.options.map(([key, label]) => {
                if (group.key === "rooms" || group.key === "outdoor") {
                  const countGroup = group.key;
                  const record = value[countGroup] ?? {};
                  return (
                    <label
                      key={key}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 text-sm dark:bg-slate-800/60"
                    >
                      <span>{label}</span>
                      <input
                        type="number"
                        aria-label={`${label} count`}
                        min="0"
                        max="50"
                        value={record[key] ?? ""}
                        onChange={(event) => changeCount(countGroup, key, event.target.value)}
                        className="min-h-9 w-20 rounded-md border border-slate-300 bg-white px-2 text-center dark:border-slate-600 dark:bg-slate-900"
                      />
                    </label>
                  );
                }
                const groupKey = group.key as "interior" | "community" | "nearby";
                return (
                  <label
                    key={key}
                    className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm dark:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={(value[groupKey] ?? []).includes(key)}
                      onChange={(event) =>
                        toggleSelection(groupKey, key, event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </details>
        ))}
        {visibleGroups.length === 0 && (
          <p className="py-3 text-sm text-slate-500">No matching features for this property type.</p>
        )}
      </div>
    </section>
  );
}
