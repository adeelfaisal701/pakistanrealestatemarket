"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, UserRound, Users } from "lucide-react";
import { PagedCarousel } from "./PagedCarousel";
import { agencyPath, agentPath } from "@/lib/seo/slug";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchFeaturedAgencies,
  fetchFeaturedAgents,
  type PublicAgency,
  type PublicAgent,
} from "@/lib/public-directory";

function SectionHeading({
  eyebrow,
  title,
  id,
  action,
}: {
  eyebrow: string;
  title: string;
  id: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2 md:mb-6 md:gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 md:text-xs md:tracking-[0.16em] md:dark:text-emerald-400">
          {eyebrow}
        </p>
        <h2 id={id} className="mt-1 text-[17px] font-extrabold leading-tight tracking-tight text-[#101D32] md:text-2xl md:dark:text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function FeaturedAgents() {
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchFeaturedAgents()
      .then((result) => {
        if (active) setAgents(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="featured-agents-heading" className="bg-white px-4 py-5 text-[#101D32] sm:px-6 md:bg-gradient-to-br md:from-ink-900 md:via-ink-950 md:to-ink-950 md:py-8 md:text-white lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-end justify-between gap-2 md:mb-4 md:gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 md:text-xs md:tracking-[0.16em] md:text-emerald-300">
              Meet local experts
            </p>
            <h2 id="featured-agents-heading" className="mt-1 text-xl font-extrabold leading-tight tracking-tight text-[#101D32] md:text-2xl md:text-white">
              Featured Agents
            </h2>
          </div>
          <Link href="/agents" className="mb-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#008F68] md:text-emerald-300 md:hover:text-emerald-200">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:gap-3 md:pb-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex min-w-0 shrink-0 snap-start flex-col items-center gap-2 md:w-[230px] md:items-start md:rounded-2xl md:border md:border-white/10 md:bg-white/[0.06] md:p-3">
                <div className="h-16 w-16 animate-pulse rounded-full bg-emerald-100 md:h-11 md:w-11 md:bg-white/10" />
                <div className="h-2 w-14 animate-pulse rounded bg-slate-200 md:w-20 md:bg-white/10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:border-red-300/20 md:bg-red-950/40 md:text-red-200">
            {error}
          </p>
        ) : agents.length ? (
          <div
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:gap-3 md:pb-2"
          >
            {agents.map((agent) => (
              <article
                key={agent.id}
                className="relative flex w-[calc((100%_-_24px)_/_3.3)] min-w-0 shrink-0 snap-start rounded-2xl border border-slate-100 bg-white px-1.5 py-2.5 shadow-[0_1px_3px_rgba(16,29,50,0.06)] flex-col items-center text-center md:w-[230px] md:max-w-[230px] md:items-start md:rounded-2xl md:border md:border-white/10 md:bg-white/[0.06] md:p-3 md:text-left md:shadow-sm md:backdrop-blur-sm md:px-3 md:py-3"
              >
                <Link
                  href={agentPath(agent)}
                  aria-label={`View ${agent.name}'s profile`}
                  className="absolute inset-0 z-0 rounded-2xl"
                >
                  <span className="sr-only">View agent profile</span>
                </Link>
                {agent.avatarUrl ? (
                  <Link href={agentPath(agent)} aria-label={`View ${agent.name}'s profile`} className="relative z-10">
                    <img
                      src={agent.avatarUrl}
                      alt={`${agent.name} profile`}
                      className="h-14 w-14 rounded-full border-2 border-[#00B889] bg-[#EAF7F2] object-cover md:h-11 md:w-11 md:border md:border-white/15 md:bg-white/10"
                      loading="lazy"
                    />
                  </Link>
                ) : (
                  <Link href={agentPath(agent)} aria-label={`View ${agent.name}'s profile`} className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#00B889] bg-[#EAF7F2] text-[#008F68] md:h-11 md:w-11 md:border-0 md:bg-emerald-400/15 md:text-emerald-200">
                    <UserRound className="h-7 w-7 md:h-5 md:w-5" />
                  </Link>
                )}
                <Link href={agentPath(agent)} className="relative z-10 mt-1 flex w-full min-w-0 items-center justify-center gap-0.5 truncate text-xs font-bold leading-tight text-[#101D32] hover:text-emerald-700 md:mt-2 md:justify-start md:gap-1 md:text-sm md:text-white md:hover:text-emerald-200">
                  <span className="truncate">{agent.name}</span>
                  {agent.isVerified && (
                    <svg
                      aria-label="Verified agent"
                      role="img"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5"
                    >
                      <path
                        d="M3 11 12 3.5 21 11M5.5 10.5V20h13v-9.5"
                        stroke="#008F68"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m8 14.5 2.5 2.5 5.5-6"
                        stroke="#00B889"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </Link>
                {agent.isVerified && (
                  <p className="mt-0.5 text-[10px] font-semibold leading-tight text-[#008F68] md:hidden">Verified Agent</p>
                )}
                {agent.agencyName && (
                  <Link href={agencyPath(agent.agencyName)} className="relative z-10 mt-0.5 w-full truncate text-[10px] leading-tight text-[#64748B] hover:text-emerald-700 md:text-xs md:text-slate-300 md:hover:text-emerald-200">{agent.agencyName}</Link>
                )}
                {agent.city && (
                  <p className="mt-1 hidden min-w-0 items-center gap-1 text-xs text-slate-300 md:inline-flex">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{agent.city}</span>
                  </p>
                )}
                <Link
                  href={agentPath(agent)}
                  className="relative z-10 mt-2 inline-flex min-h-7 w-full items-center justify-center gap-0.5 rounded-full border border-[#00B889]/50 bg-[#EAF7F2] px-1 text-[10px] font-bold leading-none text-[#008F68] transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 md:mt-2 md:min-h-8 md:w-fit md:gap-1 md:rounded-lg md:border-emerald-300/20 md:bg-emerald-400/10 md:px-2.5 md:text-xs md:text-emerald-200 md:hover:bg-emerald-400/20"
                >
                  View Profile <ArrowRight className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 md:border-white/20 md:text-slate-300">
            No agent profiles are available yet.
          </p>
        )}
      </div>
    </section>
  );
}

export function FeaturedAgencies() {
  const [agencies, setAgencies] = useState<PublicAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchFeaturedAgencies()
      .then((result) => {
        if (active) setAgencies(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="featured-agencies-heading" className="border-y border-slate-100 bg-[#F6F8FB] px-4 py-6 md:border-slate-200 md:px-6 md:py-12 md:dark:border-slate-800 md:dark:bg-slate-900 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          id="featured-agencies-heading"
          eyebrow="Trusted local firms"
          title="Featured Agencies & Estates"
          action={
            <Link href="/agencies" className="mb-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#008F68] hover:text-emerald-800 md:text-sm md:dark:text-emerald-400">
              View All <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:gap-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[212px] animate-pulse rounded-2xl border border-slate-200 bg-white md:h-[264px] md:dark:border-slate-800 md:dark:bg-slate-950" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700 md:p-4 md:text-sm md:dark:bg-red-950/30 md:dark:text-red-300">
            {error}
          </p>
        ) : agencies.length ? (
          <PagedCarousel
            items={agencies}
            pageSize={4}
            label="Featured agencies"
            pageClassName="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:gap-5"
            getKey={(agency) => agency.name}
            renderItem={(agency) => <FeaturedAgencyCard agency={agency} />}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 md:p-6 md:text-sm md:dark:border-slate-700">
            No agency affiliations are available yet.
          </p>
        )}
      </div>
    </section>
  );
}

function FeaturedAgencyCard({ agency }: { agency: PublicAgency }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const city = agency.locations.find((location) => location?.trim());

  return (
    <Link
      href={agencyPath(agency.name)}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(16,29,50,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_30px_rgba(16,29,50,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:dark:border-slate-800 md:dark:bg-slate-950"
    >
      <div className="relative h-[76px] w-full shrink-0 overflow-hidden bg-gradient-to-br from-emerald-800 via-teal-700 to-slate-700 md:h-28">
        {agency.coverImageUrl && !coverFailed && (
          <img
            src={agency.coverImageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#071B2B]/45 via-transparent to-transparent" />
      </div>
      <div className="flex flex-1 flex-col items-center px-3 pb-3 text-center md:px-4 md:pb-4">
        <span className="relative -mt-8 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white bg-white text-[#008F68] shadow-md md:-mt-10 md:h-[72px] md:w-[72px] md:dark:border-slate-950 md:dark:bg-slate-900 md:dark:text-emerald-300">
          {agency.logoUrl && !logoFailed ? (
            <img
              src={agency.logoUrl}
              alt={`${agency.name} logo`}
              loading="lazy"
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <Building2 className="h-6 w-6 md:h-8 md:w-8" aria-hidden="true" />
          )}
        </span>
        <h3 className="mt-2 line-clamp-2 min-h-[2.5em] w-full text-[13px] font-bold leading-tight text-[#101D32] transition-colors group-hover:text-emerald-700 md:mt-3 md:text-base md:dark:text-white">
          {agency.name}
        </h3>
        <p className="mt-1 flex w-full min-w-0 items-center justify-center gap-1 text-[11px] text-[#64748B] md:text-xs md:dark:text-slate-400">
          <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="truncate">
            {agency.agentCount} {agency.agentCount === 1 ? "agent" : "agents"}
            {city ? ` · ${city}` : ""}
          </span>
        </p>
        <span className="mt-auto inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700 transition-colors group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white md:min-h-10 md:text-sm md:dark:border-emerald-800 md:dark:bg-emerald-950/60 md:dark:text-emerald-300">
          View Agency <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </span>
      </div>
    </Link>
  );
}
