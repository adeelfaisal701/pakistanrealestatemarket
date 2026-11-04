import { BadRequestException } from '@nestjs/common';
import { AreaUnit, PropertyPurpose, PropertyType } from '../properties/schemas/property.schema';

export type BuyerSearchFilters = Record<string, string>;

const FILTER_KEYS = new Set([
  'city',
  'area',
  'purpose',
  'propertyType',
  'minPrice',
  'maxPrice',
  'minArea',
  'maxArea',
  'areaUnit',
  'bedrooms',
]);

const enumValues = (value: object) => new Set(Object.values(value));

export function normalizeSearchFilters(input: unknown): BuyerSearchFilters {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('filters must be an object.');
  }

  const filters: BuyerSearchFilters = {};
  for (const [key, rawValue] of Object.entries(input)) {
    if (!FILTER_KEYS.has(key)) {
      throw new BadRequestException(`Unsupported saved-search filter: ${key}.`);
    }
    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
      throw new BadRequestException(`Filter '${key}' must be a non-empty string.`);
    }
    const value = rawValue.trim();
    if (value.length > 100) {
      throw new BadRequestException(`Filter '${key}' is too long.`);
    }
    filters[key] = value;
  }

  for (const key of ['minPrice', 'maxPrice', 'minArea', 'maxArea']) {
    if (filters[key] !== undefined && (!/^\d+(\.\d{1,2})?$/.test(filters[key]) || Number(filters[key]) < 0)) {
      throw new BadRequestException(`Filter '${key}' must be a non-negative number.`);
    }
  }
  if (
    filters.bedrooms !== undefined &&
    (!/^\d+$/.test(filters.bedrooms) ||
      Number(filters.bedrooms) > 100)
  ) {
    throw new BadRequestException('Filter bedrooms must be an integer from 0 to 100.');
  }
  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    Number(filters.minPrice) > Number(filters.maxPrice)
  ) {
    throw new BadRequestException('minPrice cannot be greater than maxPrice.');
  }
  if (
    filters.minArea !== undefined &&
    filters.maxArea !== undefined &&
    Number(filters.minArea) > Number(filters.maxArea)
  ) {
    throw new BadRequestException('minArea cannot be greater than maxArea.');
  }
  if (
    filters.purpose !== undefined &&
    !enumValues(PropertyPurpose).has(filters.purpose)
  ) {
    throw new BadRequestException('Unsupported property purpose.');
  }
  if (
    filters.propertyType !== undefined &&
    !enumValues(PropertyType).has(filters.propertyType)
  ) {
    throw new BadRequestException('Unsupported property type.');
  }
  if (
    filters.areaUnit !== undefined &&
    !enumValues(AreaUnit).has(filters.areaUnit)
  ) {
    throw new BadRequestException('Unsupported area unit.');
  }

  return filters;
}

export function buildPropertySearchFilter(filters: BuyerSearchFilters) {
  const query: Record<string, unknown> = {
    status: 'published',
    inventoryStatus: 'available',
    adminHidden: { $ne: true },
    adminRemoved: { $ne: true },
    agentArchived: { $ne: true },
  };
  if (filters.city) {
    query['location.city'] = new RegExp(escapeRegex(filters.city), 'i');
  }
  if (filters.area) {
    query['location.area'] = new RegExp(escapeRegex(filters.area), 'i');
  }
  if (filters.purpose) query.purpose = filters.purpose;
  if (filters.propertyType) query.propertyType = filters.propertyType;
  if (filters.areaUnit) query.areaUnit = filters.areaUnit;
  if (filters.bedrooms !== undefined) {
    query['features.bedrooms'] = Number(filters.bedrooms);
  }

  const price: Record<string, number> = {};
  if (filters.minPrice !== undefined) price.$gte = Number(filters.minPrice);
  if (filters.maxPrice !== undefined) price.$lte = Number(filters.maxPrice);
  if (Object.keys(price).length) query.price = price;

  const area: Record<string, number> = {};
  if (filters.minArea !== undefined) area.$gte = Number(filters.minArea);
  if (filters.maxArea !== undefined) area.$lte = Number(filters.maxArea);
  if (Object.keys(area).length) query.areaSize = area;
  return query;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
