export type RequirementStatus =
  | "draft"
  | "published"
  | "paused"
  | "closed"
  | "suspended";

export type RequirementPurpose = "buy" | "rent";

export interface ClientRequirement {
  id: string;
  title: string;
  description: string;
  purpose: RequirementPurpose;
  propertyType: string;
  location: { city: string; area: string };
  minBudget?: number;
  maxBudget?: number;
  minArea?: number;
  maxArea?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  status: RequirementStatus;
  offerCount?: number;
  hasSubmittedOffer?: boolean;
  offers?: RequirementOffer[];
  createdAt: string;
}

export interface RequirementProperty {
  id: string;
  title: string;
  price: number;
  purpose: string;
  propertyType: string;
  areaSize: number;
  areaUnit: string;
  location: { city: string; area: string };
  images?: string[];
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  features?: { bedrooms?: number; bathrooms?: number };
}

export interface RequirementOffer {
  id: string;
  requirementId?: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  respondedAt?: string | null;
  conversationId?: string | null;
  requirement?: { title: string };
  agent?: {
    name: string;
    agencyName?: string | null;
    avatarUrl?: string | null;
    email?: string;
    phone?: string;
    verificationStatus?: string;
  };
  property?: RequirementProperty;
}

export function formatPkr(value?: number) {
  return value == null ? "" : `PKR ${value.toLocaleString("en-PK")}`;
}

export type RequirementPropertyMatch = {
  property: RequirementProperty;
  score: number;
  strength: "strong" | "partial";
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function rangeMatchScore(
  value: number,
  min?: number,
  max?: number,
): number {
  if (min == null && max == null) return 1;
  if ((min == null || value >= min) && (max == null || value <= max)) return 1;

  const distance = min != null && value < min
    ? min - value
    : max != null && value > max
      ? value - max
      : 0;
  const scale = Math.max(
    min != null && max != null ? (max - min) / 2 : 0,
    (min ?? max ?? 1) * 0.2,
    1,
  );
  return Math.max(0, 1 - distance / scale);
}

export function rankRequirementProperties(
  requirement: ClientRequirement,
  properties: RequirementProperty[],
): { matching: RequirementPropertyMatch[]; other: RequirementProperty[] } {
  const matching: RequirementPropertyMatch[] = [];
  const other: RequirementProperty[] = [];

  for (const property of properties) {
    const criteria: Array<{ weight: number; score: number }> = [
      {
        weight: 3,
        score: normalize(property.propertyType) === normalize(requirement.propertyType) ? 1 : 0,
      },
      {
        weight: 3,
        score:
          normalize(property.purpose) ===
          (requirement.purpose === "buy" ? "sale" : "rent")
            ? 1
            : 0,
      },
      {
        weight: 2,
        score: normalize(property.location.city) === normalize(requirement.location.city) ? 1 : 0,
      },
    ];

    const requiredArea = normalize(requirement.location.area);
    const propertyArea = normalize(property.location.area);
    const localityScore = requiredArea === propertyArea
      ? 1
      : Boolean(
          requiredArea &&
            propertyArea &&
            (requiredArea.includes(propertyArea) || propertyArea.includes(requiredArea)),
        )
        ? 0.7
        : 0;
    criteria.push({ weight: 2, score: localityScore });

    if (requirement.minBudget != null || requirement.maxBudget != null) {
      criteria.push({
        weight: 2,
        score: rangeMatchScore(
          property.price,
          requirement.minBudget,
          requirement.maxBudget,
        ),
      });
    }

    if (requirement.minArea != null || requirement.maxArea != null) {
      const sameAreaUnit = !requirement.areaUnit || property.areaUnit === requirement.areaUnit;
      criteria.push({
        weight: 1,
        score: sameAreaUnit ? 1 : 0,
      });
      criteria.push({
        weight: 2,
        score: sameAreaUnit
          ? rangeMatchScore(property.areaSize, requirement.minArea, requirement.maxArea)
          : 0,
      });
    }

    const bedrooms = property.bedrooms ?? property.features?.bedrooms;
    if (requirement.bedrooms != null) {
      criteria.push({
        weight: 1,
        score: bedrooms != null && bedrooms >= requirement.bedrooms
          ? 1
          : bedrooms == null
            ? 0
            : requirement.bedrooms === 0
              ? 1
              : bedrooms / requirement.bedrooms,
      });
    }

    const bathrooms = property.bathrooms ?? property.features?.bathrooms;
    if (requirement.bathrooms != null) {
      criteria.push({
        weight: 1,
        score: bathrooms != null && bathrooms >= requirement.bathrooms
          ? 1
          : bathrooms == null
            ? 0
            : requirement.bathrooms === 0
              ? 1
              : bathrooms / requirement.bathrooms,
      });
    }

    const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    const score = criteria.reduce(
      (sum, criterion) => sum + criterion.weight * criterion.score,
      0,
    ) / totalWeight;
    if (score === 0) {
      other.push(property);
      continue;
    }

    matching.push({
      property,
      score,
      strength: criteria.every((criterion) => criterion.score === 1)
        ? "strong"
        : "partial",
    });
  }

  matching.sort(
    (left, right) =>
      right.score - left.score ||
      left.property.title.localeCompare(right.property.title),
  );
  return { matching, other };
}
