/**
 * Sponsored campaigns ("promotions") — third-party advertising shown on
 * Ghar Safar. Deliberately separate from PropertyAdvertisement, which is an
 * agent's own property listing ad.
 */

export enum PromoPlacement {
  HOME_FEATURED = 'home_featured',
  LISTINGS_INLINE = 'listings_inline',
  PROPERTY_DETAIL_CONTENT = 'property_detail_content',
  PROPERTY_DETAIL_SIMILAR = 'property_detail_similar',
  PROJECTS_SECTION = 'projects_section',
  AGENCIES_SECTION = 'agencies_section',
}

export const PROMO_PLACEMENTS = Object.values(PromoPlacement);

export enum PromoDevice {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
}

export enum PromoCampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum PromoMediaKind {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum PromoEventType {
  IMPRESSION = 'impression',
  CLICK = 'click',
  VIDEO_VIEW = 'video_view',
  VIDEO_COMPLETE = 'video_complete',
}

/** Reserved for future paid packages (no billing logic yet). */
export enum PromoPackage {
  HOMEPAGE_FEATURED = 'homepage_featured',
  LISTINGS_SPONSORED = 'listings_sponsored',
  PROPERTY_DETAILS = 'property_details',
  VIDEO_PROMOTION = 'video_promotion',
  MULTI_PLACEMENT = 'multi_placement',
  PREMIUM = 'premium',
}

/** Property categories / purposes mirror the property schema values. */
export const PROMO_PROPERTY_TYPES = ['House', 'Flat', 'Upper Portion', 'Lower Portion', 'Plot', 'Commercial'] as const;
export const PROMO_PURPOSES = ['Sale', 'Rent'] as const;

export const PROMO_LIMITS = {
  maxMediaPerCampaign: 8,
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 60 * 1024 * 1024,
  maxServedPerRequest: 8,
} as const;
