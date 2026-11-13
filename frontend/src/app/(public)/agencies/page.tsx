import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import PublicAgenciesPage from "./agencies-client";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFeaturedAgencies, resolveAgencyName } from "@/lib/seo/public-data";
import { agencyPath, slugify } from "@/lib/seo/slug";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function legacyName(params: Record<string, string | string[] | undefined>) {
  const value = params.name;
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const name = legacyName(await searchParams);
  if (name) {
    // Legacy profile URL (normally redirected below); point search engines at the clean URL.
    return buildMetadata({
      title: `${name} — Real Estate Agency | Ghar Safar`,
      description: `${name} on Ghar Safar: agency profile, agents and current property listings.`,
      path: agencyPath(name),
    });
  }
  return buildMetadata({
    title: "Real Estate Agencies in Lahore & Pakistan | Ghar Safar",
    description:
      "Browse trusted real estate agencies in Lahore and across Pakistan. View agency profiles, their agents and current property listings for sale and rent on Ghar Safar.",
    path: "/agencies",
    keywords: ["real estate agencies in Pakistan", "real estate agencies in Lahore", "property dealers in Lahore"],
  });
}

export default async function AgenciesPage({ searchParams }: { searchParams: SearchParams }) {
  const name = legacyName(await searchParams);
  if (name) {
    const path = agencyPath(name);
    // Move legacy `?name=` links to `/agencies/<slug>` once the agency is confirmed public.
    if (!path.includes("?") && (await resolveAgencyName(slugify(name)))) permanentRedirect(path);
    return <PublicAgenciesPage />;
  }
  // Directory: server-render the featured agencies (H1 + crawlable agency links).
  return <PublicAgenciesPage initialAgencies={await getFeaturedAgencies()} />;
}
