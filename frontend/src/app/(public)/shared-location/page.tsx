import type { Metadata } from "next";
import { NOINDEX_NOFOLLOW } from "@/lib/seo/metadata";
import SharedLocationClient from "./shared-location-client";

/** Private, token-based location shares must never be indexed. */
export const metadata: Metadata = {
  title: "Shared Property Location | Ghar Safar",
  robots: NOINDEX_NOFOLLOW,
};

export default function SharedLocationPage() {
  return <SharedLocationClient />;
}
