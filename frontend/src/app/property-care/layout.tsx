import type { Metadata } from "next";
import { NOINDEX_FOLLOW } from "@/lib/seo/metadata";

/** Property Care account pages (sign-in, registration, customer dashboard) are not indexed. */
export const metadata: Metadata = {
  robots: NOINDEX_FOLLOW,
};

export default function PropertyCareAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
