import type { Metadata } from "next";
import { NOINDEX_FOLLOW } from "@/lib/seo/metadata";

/** Sign-in / registration pages stay out of search results. */
export const metadata: Metadata = {
  robots: NOINDEX_FOLLOW,
};

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
