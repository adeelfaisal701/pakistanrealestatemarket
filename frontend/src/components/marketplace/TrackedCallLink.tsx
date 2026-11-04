"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { recordPropertyEvent } from "@/lib/property-analytics";

interface TrackedCallLinkProps {
  propertyId: string;
  href: string;
  className?: string;
  children: ReactNode;
}

export function TrackedCallLink({
  propertyId,
  href,
  className,
  children,
}: TrackedCallLinkProps) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const trackBeforeCalling = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (recording) return;
    setRecording(true);
    setError("");
    void recordPropertyEvent(propertyId, "call-click")
      .then(() => window.location.assign(href))
      .catch((requestError: unknown) => {
        console.error("Unable to record call-click analytics.", requestError);
        setError("Could not record this call request. Please try again.");
      })
      .finally(() => setRecording(false));
  };

  return (
    <span className="flex flex-col">
      <a href={href} className={className} onClick={trackBeforeCalling} aria-busy={recording}>
        {recording ? "Recording…" : children}
      </a>
      {error && <span role="alert" className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}
