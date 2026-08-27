export interface PendingAgent {
  id: string;
  name: string;
  agencyName: string;
  phone: string;
  city: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
  cnic?: string;
  experienceYears?: number;
  activeListingsCount?: number;
}

export interface ModerationProperty {
  id: string;
  title: string;
  price: string;
  society: string;
  agentName: string;
  status: 'Pending Review' | 'Live' | 'Blocked';
  propertyType?: string;
  area?: string;
  imageUrl?: string;
  submittedAt?: string;
}

export interface AdminKPIMetrics {
  totalListings: number;
  pendingAgentsCount: number;
  totalVerifiedAgents: number;
  activeLeadsCount: number;
  monthlyPlatformRevenue: string;
  flaggedSpamCount: number;
}
