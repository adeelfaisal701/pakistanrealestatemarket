"use client";

import React, { useEffect, useState } from "react";

export function formatTimeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Relative time that refreshes every 30 seconds. The first client render can
 * differ from the server by a few seconds, so hydration warnings are
 * suppressed for this span only.
 */
export function TimeAgo({ iso }: { iso: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    setTick((t) => t + 1);
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  return <span suppressHydrationWarning>{formatTimeAgo(iso)}</span>;
}
