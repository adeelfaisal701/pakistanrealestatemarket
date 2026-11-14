"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { PromoMedia, PromoPlacement, ServedCampaign } from "@/lib/promotions";
import { trackPromotion } from "@/lib/promotions";

const SLIDE_MS = 5000;
const IMPRESSION_MS = 1000;

export type SponsoredLayout = "feature" | "inline";

interface Slide {
  key: string;
  campaign: ServedCampaign;
  media: PromoMedia;
}

interface SponsoredCarouselProps {
  campaigns: ServedCampaign[];
  placement: PromoPlacement;
  layout?: SponsoredLayout;
  /** Admin preview: no analytics events are sent. */
  preview?: boolean;
  className?: string;
}

function safeHref(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function SponsoredBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-700 shadow-sm ring-1 ring-ink-900/10">
      Sponsored
    </span>
  );
}

/**
 * Rotating sponsored media (images and videos) for one placement.
 * Pauses on interaction, when off-screen, when the tab is hidden and while a
 * video plays. Media keep their aspect ratio inside a fixed frame, so the
 * page never shifts when slides change.
 */
export default function SponsoredCarousel({
  campaigns,
  placement,
  layout = "feature",
  preview = false,
  className = "",
}: SponsoredCarouselProps) {
  const slides = useMemo<Slide[]>(
    () =>
      campaigns.flatMap((campaign) =>
        campaign.media.map((media, index) => ({ key: `${campaign.id}:${index}`, campaign, media })),
      ),
    [campaigns],
  );
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const impressed = useRef(new Set<string>());
  const videoViewed = useRef(new Set<string>());
  const videoCompleted = useRef(new Set<string>());

  const count = slides.length;
  const current = slides[Math.min(active, Math.max(count - 1, 0))];
  const multiple = count > 1;

  const track = useCallback(
    (campaignId: string, type: Parameters<typeof trackPromotion>[1]) => {
      if (!preview) trackPromotion(campaignId, type, placement);
    },
    [placement, preview],
  );

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setActive((value) => (value + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  // At least half of the slot must be visible to count as "in view".
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // Impression: campaign visible (≥50%) for one continuous second, once per page view.
  useEffect(() => {
    if (!current || !inView || !pageVisible) return;
    const id = current.campaign.id;
    if (impressed.current.has(id)) return;
    const timer = window.setTimeout(() => {
      impressed.current.add(id);
      track(id, "impression");
    }, IMPRESSION_MS);
    return () => window.clearTimeout(timer);
  }, [current, inView, pageVisible, track]);

  const isVideo = current?.media.kind === "video" && !failed[current.key];

  // Auto-advance image slides; video slides advance on end or playback limit.
  useEffect(() => {
    if (!multiple || !inView || !pageVisible || interacting || isVideo) return;
    const timer = window.setTimeout(() => go(1), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [active, multiple, inView, pageVisible, interacting, isVideo, go]);

  // Muted autoplay only while visible; always pause when out of view.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;
    if (inView && pageVisible && !userPaused) {
      video.muted = muted;
      void video.play().catch(() => setVideoPlaying(false));
    } else {
      video.pause();
    }
  }, [isVideo, inView, pageVisible, userPaused, muted, active]);

  useEffect(() => {
    setVideoPlaying(false);
    setUserPaused(false);
  }, [active]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || !multiple) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  };

  if (!current) return null;

  const { campaign } = current;
  const href = safeHref(campaign.destinationUrl);
  const linkProps = href
    ? { href, target: "_blank", rel: "sponsored noopener noreferrer", onClick: () => track(campaign.id, "click") }
    : {};
  const isFeature = layout === "feature";
  const frameAspect = isFeature ? "aspect-[16/9] @4xl:aspect-[16/8]" : "aspect-[16/9] @4xl:aspect-[2/1]";

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setUserPaused(false);
      void video.play().catch(() => undefined);
    } else {
      setUserPaused(true);
      video.pause();
    }
  };

  const media = (
    <div
      className={`relative w-full overflow-hidden bg-ink-950 ${frameAspect}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (pointerStart.current = null)}
      style={{ touchAction: "pan-y" }}
    >
      {slides.map((slide, index) => {
        const visible = index === active;
        const hasFailed = failed[slide.key];
        const showVideo = slide.media.kind === "video" && visible && !hasFailed;
        const still = slide.media.kind === "image" ? slide.media.url : slide.media.posterUrl;
        // Only the active slide and its neighbours load; others wait.
        const near = Math.abs(index - active) <= 1 || (active === 0 && index === count - 1) || (active === count - 1 && index === 0);
        return (
          <div
            key={slide.key}
            aria-hidden={!visible}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {still && near && !(slide.media.kind === "image" && hasFailed) ? (
              <>
                {/* Blurred backdrop fills the frame; the media itself is never cropped or stretched. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={still} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" loading="lazy" decoding="async" />
                {!showVideo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={still}
                    alt={slide.media.alt || `${slide.campaign.companyName} — ${slide.campaign.title}`}
                    className="relative h-full w-full object-contain"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    onError={() => setFailed((value) => ({ ...value, [slide.key]: true }))}
                  />
                ) : null}
              </>
            ) : null}
            {(!still || hasFailed) && !showVideo ? (
              <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-900 via-ink-950 to-ink-800 p-6 text-center">
                <p className="text-lg font-extrabold tracking-tight text-white @xl:text-2xl">{slide.campaign.companyName}</p>
              </div>
            ) : null}
            {showVideo ? (
              <video
                ref={videoRef}
                className="relative h-full w-full object-contain"
                src={slide.media.url}
                poster={slide.media.posterUrl}
                muted={muted}
                playsInline
                preload="metadata"
                aria-label={slide.media.alt || `${slide.campaign.companyName} video`}
                onPlay={() => {
                  setVideoPlaying(true);
                  if (!videoViewed.current.has(slide.campaign.id)) {
                    videoViewed.current.add(slide.campaign.id);
                    track(slide.campaign.id, "video_view");
                  }
                }}
                onPause={() => setVideoPlaying(false)}
                onEnded={() => {
                  setVideoPlaying(false);
                  if (!videoCompleted.current.has(slide.campaign.id)) {
                    videoCompleted.current.add(slide.campaign.id);
                    track(slide.campaign.id, "video_complete");
                  }
                  if (multiple) go(1);
                }}
                onTimeUpdate={(event) => {
                  const limit = slide.campaign.videoMaxSeconds;
                  if (multiple && limit > 0 && event.currentTarget.currentTime >= limit) go(1);
                }}
                onError={() => {
                  setFailed((value) => ({ ...value, [slide.key]: true }));
                  setVideoPlaying(false);
                }}
              />
            ) : null}
          </div>
        );
      })}

      {/* Whole frame is a link; controls sit above it as siblings. */}
      {href ? (
        <a {...linkProps} className="absolute inset-0 z-[1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-500" aria-label={`${campaign.title} — ${campaign.companyName} (sponsored, opens in a new tab)`} />
      ) : null}

      <div className="pointer-events-none absolute left-3 top-3 z-[2]">
        <SponsoredBadge />
      </div>

      {isVideo ? (
        <div className="absolute bottom-3 right-3 z-[2] flex gap-2">
          <button
            type="button"
            onClick={toggleVideo}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/70 text-white backdrop-blur transition hover:bg-ink-950/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={videoPlaying ? "Pause video" : "Play video"}
          >
            {videoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/70 text-white backdrop-blur transition hover:bg-ink-950/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={muted ? "Unmute video" : "Mute video"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      ) : null}

      {multiple ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-[2] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 @xl:flex"
            aria-label="Previous sponsored slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-[2] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 @xl:flex"
            aria-label="Next sponsored slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className={`absolute bottom-3 z-[2] flex gap-1.5 rounded-full bg-ink-950/45 px-2 py-1.5 backdrop-blur ${isVideo ? "left-3" : "left-1/2 -translate-x-1/2"}`}>
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => setActive(index)}
                className={`h-1.5 rounded-full transition-all ${index === active ? "w-5 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"}`}
                aria-label={`Show sponsored slide ${index + 1} of ${count}`}
                aria-current={index === active}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );

  const info = (
    <div className={`flex w-full min-w-0 flex-col gap-3 ${isFeature ? "@xl:flex-row @xl:items-center @4xl:h-full @4xl:flex-col @4xl:items-stretch @4xl:gap-4" : ""}`}>
      <div className={`flex min-w-0 flex-1 items-center gap-3 ${isFeature ? "@4xl:flex-none @4xl:flex-col @4xl:items-start" : ""}`}>
      {campaign.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.logoUrl}
          alt={`${campaign.companyName} logo`}
          className={`h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1 ${isFeature ? "@4xl:h-14 @4xl:w-14" : ""}`}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-sm font-extrabold text-white">
          {campaign.companyName.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{campaign.companyName}</p>
        <p className={`mt-0.5 line-clamp-2 font-extrabold leading-snug tracking-tight text-ink-900 ${isFeature ? "text-base @4xl:text-xl" : "text-sm @xl:text-base"}`}>
          {campaign.title}
        </p>
        {campaign.description ? (
          <p className={`mt-1 text-sm leading-relaxed text-slate-600 ${isFeature ? "hidden @xl:line-clamp-2 @4xl:line-clamp-4" : "hidden @xl:line-clamp-2"}`}>
            {campaign.description}
          </p>
        ) : null}
      </div>
      </div>
      {href ? (
        <a
          {...linkProps}
          className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 @xl:w-auto @xl:self-start ${isFeature ? "@xl:self-center @4xl:mt-auto @4xl:self-start @4xl:px-5 @4xl:py-3" : ""}`}
        >
          <span className="truncate">{campaign.ctaText || "Learn more"}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" />
        </a>
      ) : null}
    </div>
  );

  // Layout follows the slot's own width (container queries), so the same
  // campaign looks right in a full-width banner, a feed row or a preview pane.
  return (
    <div className={`@container min-w-0 ${className}`}>
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Sponsored by ${campaign.companyName}`}
      tabIndex={multiple ? 0 : undefined}
      onKeyDown={multiple ? onKeyDown : undefined}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
      onTouchStart={() => setInteracting(true)}
      onTouchEnd={() => window.setTimeout(() => setInteracting(false), 2500)}
      className={`overflow-hidden rounded-2xl border border-gold-500/30 bg-white shadow-[0_1px_2px_rgba(16,29,50,0.04),0_8px_24px_-12px_rgba(16,29,50,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        isFeature ? "@4xl:grid @4xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]" : "@xl:grid @xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      }`}
    >
      {media}
      <div className={`border-t border-gold-100 bg-gradient-to-br from-gold-100/50 via-white to-white p-3.5 @xl:p-4 ${isFeature ? "@4xl:flex @4xl:border-l @4xl:border-t-0 @4xl:p-6" : "@xl:flex @xl:items-center @xl:border-l @xl:border-t-0 @xl:p-5"}`}>
        {info}
      </div>
    </div>
    </div>
  );
}
