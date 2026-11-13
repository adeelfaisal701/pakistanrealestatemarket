import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicAgenciesPage from "../agencies-client";
import type { PublicAgencyProfile } from "@/lib/public-directory";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicAgencyProfile, resolveAgencyName } from "@/lib/seo/public-data";
import { agencyPath, agentPath } from "@/lib/seo/slug";
import { absoluteUrl, truncateText } from "@/lib/seo/site";
import { JsonLd } from "@/lib/seo/structured-data";

interface AgencyPageProps {
  params: Promise<{ slug: string }>;
}

async function loadAgency(slug: string): Promise<{ name: string; profile: PublicAgencyProfile }> {
  const name = await resolveAgencyName(slug.toLowerCase());
  if (name === null) notFound();
  // API unreachable: fail with a server error (crawlers retry) rather than a false 404.
  if (name === undefined) throw new Error("Agency directory is temporarily unavailable.");
  const result = await getPublicAgencyProfile(name);
  if (!result.ok) {
    if (result.status === 404) notFound();
    throw new Error("Agency profile is temporarily unavailable.");
  }
  return { name, profile: result.data };
}

function agencyCity(profile: PublicAgencyProfile) {
  return profile.city?.trim() || profile.locations.find((location) => location?.trim());
}

export async function generateMetadata({ params }: AgencyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { profile } = await loadAgency(slug);
  const city = agencyCity(profile);
  const agents = `${profile.agentCount} ${profile.agentCount === 1 ? "agent" : "agents"}`;
  const image = profile.coverImageUrl || profile.logoUrl;
  return buildMetadata({
    title: `${profile.name} — Real Estate Agency${city ? ` in ${city}` : ""} | Ghar Safar`,
    description: truncateText(
      profile.description?.trim()
        ? `${profile.name}${city ? `, ${city}` : ""}: ${profile.description.trim()}`
        : `${profile.name} is a real estate agency${city ? ` in ${city}` : ""} with ${agents} on Ghar Safar. View the agency profile, its agents and current property listings for sale and rent.`,
    ),
    path: agencyPath(profile.name),
    images: image ? [{ url: image, alt: `${profile.name}${city ? `, ${city}` : ""}` }] : undefined,
  });
}

export default async function AgencyProfileRoute({ params }: AgencyPageProps) {
  const { slug } = await params;
  const { name, profile } = await loadAgency(slug);
  const city = agencyCity(profile);
  const streetAddress = profile.officeAddress?.trim() || profile.officeAddresses?.[0]?.trim();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: profile.name,
          url: absoluteUrl(agencyPath(profile.name)),
          ...(profile.description?.trim() ? { description: profile.description.trim() } : {}),
          ...(profile.logoUrl ? { logo: absoluteUrl(profile.logoUrl) } : {}),
          ...(profile.coverImageUrl || profile.logoUrl ? { image: absoluteUrl(profile.coverImageUrl || profile.logoUrl!) } : {}),
          ...(profile.phone?.trim() ? { telephone: profile.phone.trim() } : {}),
          ...(streetAddress || city
            ? {
                address: {
                  "@type": "PostalAddress",
                  ...(streetAddress ? { streetAddress } : {}),
                  ...(city ? { addressLocality: city } : {}),
                  addressCountry: "PK",
                },
              }
            : {}),
          ...(city ? { areaServed: { "@type": "City", name: city } } : {}),
          employee: profile.agents.map((agent) => ({
            "@type": "Person",
            name: agent.name,
            url: absoluteUrl(agentPath(agent)),
          })),
        }}
      />
      <PublicAgenciesPage initialAgencyName={name} initialAgency={profile} />
    </>
  );
}
