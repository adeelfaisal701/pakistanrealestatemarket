"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPromotions, type PromoContext, type PromoPlacement, type ServeResponse } from "@/lib/promotions";
import SponsoredCarousel, { type SponsoredLayout } from "./SponsoredCarousel";

interface SponsoredSlotProps {
  placement: PromoPlacement;
  context?: PromoContext;
  layout?: SponsoredLayout;
  /** Wrapper applied only when a campaign is shown (spacing, section chrome). */
  className?: string;
  /** Inner wrapper (e.g. the page's max-width container). */
  innerClassName?: string;
  /** Optional heading shown above the campaign. */
  heading?: string;
  /** Offset into the served list, so several inline slots on a page rotate different campaigns. */
  rotate?: number;
}

/**
 * Loads sponsored campaigns for a placement only when the slot approaches the
 * viewport (hidden responsive layouts never fetch) and renders nothing when
 * no campaign qualifies — the page looks exactly as before.
 */
export default function SponsoredSlot({ placement, context, layout = "feature", className = "", innerClassName = "", heading, rotate = 0 }: SponsoredSlotProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [data, setData] = useState<ServeResponse | null>(null);
  const city = context?.city ?? "";
  const propertyType = context?.propertyType ?? "";
  const purpose = context?.purpose ?? "";

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near) return;
    let active = true;
    fetchPromotions(placement, { city, propertyType, purpose })
      .then((response) => {
        if (active) setData(response);
      })
      .catch(() => {
        // Sponsored content is optional; failures never affect the page.
        if (active) setData(null);
      });
    return () => {
      active = false;
    };
  }, [near, placement, city, propertyType, purpose]);

  const campaigns = data?.enabled ? data.campaigns : [];
  const ordered = campaigns.length > 1 && rotate > 0
    ? [...campaigns.slice(rotate % campaigns.length), ...campaigns.slice(0, rotate % campaigns.length)]
    : campaigns;

  if (!ordered.length) return <div ref={sentinelRef} aria-hidden className="h-0 w-full" />;

  return (
    <aside className={className} aria-label="Sponsored">
      <div className={innerClassName}>
        {heading ? (
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{heading}</p>
        ) : null}
        <SponsoredCarousel campaigns={ordered} placement={placement} layout={layout} />
      </div>
    </aside>
  );
}
