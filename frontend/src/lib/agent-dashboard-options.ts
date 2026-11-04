export type AdRange = "today" | "7d" | "30d";

export const AD_RANGE_OPTIONS: { value: AdRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

export interface AdMetrics {
  views: number;
  reach: number;
  calls: number;
  whatsapp: number;
}

export const LEAD_SOURCES = [
  { value: "marketplace", label: "Marketplace" },
  { value: "direct_whatsapp", label: "Direct WhatsApp" },
  { value: "phone_call", label: "Phone Call" },
  { value: "referral", label: "Referral" },
  { value: "website_chat", label: "Website Chat" },
] as const;
