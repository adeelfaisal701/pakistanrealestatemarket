"use client";

import type { ReactNode } from "react";
import { recordPropertyEvent } from "@/lib/property-analytics";

interface TrackedWhatsAppLinkProps {
  propertyId: string;
  href: string;
  className?: string;
  children: ReactNode;
}

export function TrackedWhatsAppLink({
  propertyId,
  href,
  className,
  children,
}: TrackedWhatsAppLinkProps) {
  const recordClick = () => {
    void recordPropertyEvent(propertyId, "whatsapp-click")
      .catch((requestError: unknown) => {
        console.error("Unable to record WhatsApp click analytics.", requestError);
      });
  };

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={recordClick}>
      {children}
    </a>
  );
}
