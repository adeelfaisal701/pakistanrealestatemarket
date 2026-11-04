"use client";

import { useState, type ReactNode, type MouseEvent } from "react";
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
  const [error, setError] = useState("");
  const recordClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setError("");
    const newTab = window.open("about:blank", "_blank");
    void recordPropertyEvent(propertyId, "whatsapp-click")
      .then(() => {
        if (newTab) {
          newTab.location.href = href;
        } else {
          window.location.assign(href);
        }
      })
      .catch((requestError: unknown) => {
        newTab?.close();
        console.error("Unable to record WhatsApp click analytics.", requestError);
        setError("Could not record this contact request. Please try again.");
      });
  };

  return (
    <>
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={recordClick}>
        {children}
      </a>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </>
  );
}
