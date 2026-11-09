"use client";

import type { ReactNode } from "react";
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
  const recordClick = () => {
    void recordPropertyEvent(propertyId, "call-click")
      .catch((requestError: unknown) => {
        console.error("Unable to record call-click analytics.", requestError);
      });
  };

  return (
    <span className="flex flex-col">
      <a href={href} className={className} onClick={recordClick}>
        {children}
      </a>
    </span>
  );
}
