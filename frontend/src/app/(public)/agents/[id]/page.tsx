import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PublicAgentProfilePage from "./agent-profile-client";
import type { PublicAgent } from "@/lib/public-directory";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicAgent } from "@/lib/seo/public-data";
import { agencyPath, agentPath, splitSlugId } from "@/lib/seo/slug";
import { absoluteUrl, truncateText } from "@/lib/seo/site";
import { JsonLd } from "@/lib/seo/structured-data";

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

async function loadAgent(param: string) {
  const parsed = splitSlugId(param);
  if (!parsed) return { kind: "invalid" as const };
  const result = await getPublicAgent(parsed.id);
  if (result.ok) return { kind: "found" as const, id: parsed.id, agent: result.data };
  if (result.status === 404 || result.status === 400) return { kind: "missing" as const };
  return { kind: "unavailable" as const, id: parsed.id };
}

function agentHeadline(agent: PublicAgent) {
  return [
    `${agent.name} — Real Estate Agent`,
    agent.agencyName ? ` at ${agent.agencyName}` : "",
    agent.city ? ` in ${agent.city}` : "",
  ].join("");
}

export async function generateMetadata({ params }: AgentPageProps): Promise<Metadata> {
  const { id: param } = await params;
  const loaded = await loadAgent(param);
  if (loaded.kind === "invalid" || loaded.kind === "missing") notFound();
  if (loaded.kind === "unavailable") {
    return { title: "Real Estate Agent Profile | Ghar Safar", alternates: { canonical: `/agents/${param}` } };
  }
  const { agent } = loaded;
  const firstName = agent.name.split(/\s+/)[0] ?? agent.name;
  return buildMetadata({
    title: `${agentHeadline(agent)} | Ghar Safar`,
    description: truncateText(
      `${agent.name} is a ${agent.isVerified ? "verified " : ""}real estate agent${agent.agencyName ? ` with ${agent.agencyName}` : ""}${agent.city ? ` in ${agent.city}` : ""}. View current property listings and contact ${firstName} directly on Ghar Safar.`,
    ),
    path: agentPath(agent),
    images: agent.avatarUrl ? [{ url: agent.avatarUrl, alt: `${agent.name}, real estate agent` }] : undefined,
  });
}

export default async function AgentProfileRoute({ params }: AgentPageProps) {
  const { id: param } = await params;
  const loaded = await loadAgent(param);
  if (loaded.kind === "invalid" || loaded.kind === "missing") notFound();

  if (loaded.kind === "found") {
    const canonical = agentPath(loaded.agent);
    if (`/agents/${param}` !== canonical) permanentRedirect(canonical);
    const { agent } = loaded;
    return (
      <>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url: absoluteUrl(canonical),
            mainEntity: {
              "@type": "Person",
              name: agent.name,
              jobTitle: "Real Estate Agent",
              ...(agent.avatarUrl ? { image: absoluteUrl(agent.avatarUrl) } : {}),
              ...(agent.city ? { address: { "@type": "PostalAddress", addressLocality: agent.city, addressCountry: "PK" } } : {}),
              ...(agent.agencyName
                ? { worksFor: { "@type": "RealEstateAgent", name: agent.agencyName, url: absoluteUrl(agencyPath(agent.agencyName)) } }
                : {}),
            },
          }}
        />
        <PublicAgentProfilePage agentId={loaded.id} initialAgent={agent} />
      </>
    );
  }

  return <PublicAgentProfilePage agentId={loaded.id} />;
}
