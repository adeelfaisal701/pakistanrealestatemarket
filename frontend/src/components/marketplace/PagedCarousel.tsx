'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

interface PagedCarouselProps<T> {
  items: T[];
  /** Items shown together on one page (e.g. 4 agencies, 3 projects). */
  pageSize: number;
  /** Accessible name for the carousel region. */
  label: string;
  /** Layout classes applied to each page (a grid of `pageSize` items). */
  pageClassName: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

/**
 * Horizontal, page-at-a-time carousel. Pages use native scroll snapping, so
 * touch swiping and trackpads work without extra libraries; arrows and dots
 * provide keyboard and mouse navigation.
 */
export function PagedCarousel<T>({
  items,
  pageSize,
  label,
  pageClassName,
  getKey,
  renderItem,
}: PagedCarouselProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pages = chunk(items, pageSize);
  const pageCount = pages.length;

  const syncPage = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setPage(Math.min(pageCount - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))));
  }, [pageCount]);

  useEffect(() => {
    window.addEventListener('resize', syncPage);
    return () => window.removeEventListener('resize', syncPage);
  }, [syncPage]);

  function goTo(target: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.min(pageCount - 1, Math.max(0, target));
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: next * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    setPage(next);
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={trackRef}
        onScroll={syncPage}
        className="-mx-1 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((pageItems, index) => (
          <div
            key={pageItems.map(getKey).join('|')}
            role="group"
            aria-roledescription="slide"
            aria-label={`Page ${index + 1} of ${pageCount}`}
            aria-hidden={index !== page}
            inert={index !== page ? true : undefined}
            className="w-full shrink-0 snap-start snap-always px-1 pb-2 pt-1"
          >
            <div className={pageClassName}>
              {pageItems.map((item) => (
                <div key={getKey(item)} className="min-w-0">
                  {renderItem(item)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {pages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show page ${index + 1} of ${pageCount}`}
                aria-current={index === page ? 'true' : undefined}
                className="flex h-6 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    index === page ? 'w-6 bg-emerald-600' : 'w-1.5 bg-slate-300 md:dark:bg-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(page - 1)}
              disabled={page === 0}
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 md:dark:border-slate-700 md:dark:bg-slate-900 md:dark:text-slate-200"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(page + 1)}
              disabled={page === pageCount - 1}
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 md:dark:border-slate-700 md:dark:bg-slate-900 md:dark:text-slate-200"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
