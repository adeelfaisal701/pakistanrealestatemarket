"use client";

import { useEffect, useState } from "react";
import { fetchPromotions, type PromoContext, type PromoPlacement, type ServeResponse } from "@/lib/promotions";

/** Sponsored campaigns for a placement; `null` while loading, disabled or on error. */
export function usePromotions(placement: PromoPlacement, context: PromoContext = {}, enabled = true): ServeResponse | null {
  const [data, setData] = useState<ServeResponse | null>(null);
  const city = context.city ?? "";
  const propertyType = context.propertyType ?? "";
  const purpose = context.purpose ?? "";

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchPromotions(placement, { city, propertyType, purpose })
      .then((response) => {
        if (active) setData(response);
      })
      .catch(() => {
        if (active) setData(null);
      });
    return () => {
      active = false;
    };
  }, [enabled, placement, city, propertyType, purpose]);

  return enabled ? data : null;
}
