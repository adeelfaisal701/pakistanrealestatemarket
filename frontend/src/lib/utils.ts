import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with clsx and merges Tailwind classes cleanly
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency to Pakistani Rupees (PKR) format
 * Example: 15000000 -> PKR 1.50 Crore or PKR 15,000,000
 */
export function formatPKR(amount: number): string {
  if (amount >= 10000000) {
    const crore = (amount / 10000000).toFixed(2);
    return `PKR ${crore} Crore`;
  }
  if (amount >= 100000) {
    const lac = (amount / 100000).toFixed(2);
    return `PKR ${lac} Lac`;
  }
  return `PKR ${new Intl.NumberFormat("en-PK").format(amount)}`;
}

/**
 * Format land area into Pakistani unit representation (Marla / Kanal / Sq. Ft.)
 */
export function formatLandArea(size: number, unit: "Marla" | "Kanal" | "SqFt" | "SqYd"): string {
  return `${size} ${unit}`;
}
