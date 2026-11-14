'use client';

import { Children, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Shows the first `visibleCount` items and lets the rest scroll vertically
 * inside the section. The height is measured from the rendered items, so it
 * stays correct for any column count (e.g. 2×2 on phones, 4×1 on desktop).
 */
export function VerticalScrollList({
  visibleCount,
  className,
  label,
  children,
}: {
  visibleCount: number;
  /** Layout classes for the item grid/list. */
  className: string;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>();
  const scrollable = Children.count(children) > visibleCount;

  useEffect(() => {
    const element = ref.current;
    if (!element || !scrollable) {
      setMaxHeight(undefined);
      return;
    }
    const measure = () => {
      const items = Array.from(element.children) as HTMLElement[];
      const last = items[visibleCount - 1];
      if (!last) return;
      const top = element.getBoundingClientRect().top - element.scrollTop;
      const lastRect = last.getBoundingClientRect();
      // Bottom of the last fully visible item, plus room for its shadow.
      setMaxHeight(Math.ceil(lastRect.bottom - top + 6));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollable, visibleCount, children]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={scrollable ? 0 : undefined}
      style={scrollable && maxHeight ? { maxHeight } : undefined}
      className={`${className} ${
        scrollable
          ? '-mx-1 overflow-y-auto px-1 pb-1 pt-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl'
          : ''
      }`}
    >
      {children}
    </div>
  );
}
