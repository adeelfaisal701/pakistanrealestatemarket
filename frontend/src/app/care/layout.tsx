import type { Metadata } from "next";
import { CareAccessGate } from "@/components/care/CareAccessGate";
import { CareShell } from "@/components/care/CareShell";
import { NOINDEX_NOFOLLOW } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Property Care | Ghar Safar",
  description: "Your Ghar Safar Property Care workspace: requests, quotations, payments and maintenance history.",
  robots: NOINDEX_NOFOLLOW,
};

/** Customer Property Care workspace — independent of the Real Estate buyer layout. */
export default function CareLayout({ children }: { children: React.ReactNode }) {
  return (
    <CareAccessGate>
      <CareShell>{children}</CareShell>
    </CareAccessGate>
  );
}
