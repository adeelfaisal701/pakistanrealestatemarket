export type LeadStatus =
  | 'New'
  | 'Connected'
  | 'Site Visit'
  | 'Negotiation'
  | 'Closed Won'
  | 'Lost';

export type PropertyRequirement = 'Buy' | 'Rent';

export type PropertyType = 'House' | 'Plot' | 'Apartment' | 'Upper Portion' | 'Lower Portion' | 'Commercial';

export interface CRMLead {
  id: string;
  clientName: string;
  clientPhone: string;
  requirement: PropertyRequirement;
  propertyType: PropertyType;
  budgetMin: string;
  budgetMax: string;
  preferredSocieties: string[];
  status: LeadStatus;
  createdAt: string;
  notes?: string;
  /** Where the lead came from (e.g. "Facebook Ad", "Walk-in"). */
  source?: string;
  /** What the lead asked about, in the client's words (e.g. "5 Marla House"). */
  interest?: string;
  /** Preferred way to reach the lead. */
  contactMethod?: 'call' | 'whatsapp';
  /** Ad that generated this lead, if any. */
  adId?: string;
  /** Existing website chat thread for chat-originated leads. */
  conversationId?: string;
  /** Thumbnail from the linked listing, when this lead has a property. */
  propertyImageUrl?: string;
}

export interface AgentPropertyListing {
  id: string;
  title: string;
  price: string;
  society: string;
  area: string;
  beds: number;
  baths: number;
  status:
    | 'Active'
    | 'Pending Review'
    | 'Draft'
    | 'Rejected'
    | 'Sold'
    | 'Rented'
    | 'Reserved'
    | 'Unavailable'
    | 'Available';
  createdAt: string;
  purpose?: PropertyRequirement;
  propertyType?: PropertyType;
  imageUrl?: string;
  description?: string;
}
