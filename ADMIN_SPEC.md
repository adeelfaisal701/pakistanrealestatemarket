# Module Specification: Super Admin Panel (Strict Folder Isolation)

## Core Rule & Constraint
- **DO NOT TOUCH OR MODIFY** existing landing page (`(public)`) or agent CRM (`(dashboard)/agent`) code.
- Create a completely isolated, dedicated folder structure for the Super Admin Panel inside `/frontend/src/app/(dashboard)/admin` and `/frontend/src/components/admin`.

---

## 1. Isolated Directory Structure

Create the following dedicated structure for the Admin module:

frontend/
└── src/
    ├── app/
    │   └── (dashboard)/
    │       └── admin/
    │           ├── layout.tsx                  # Admin Dashboard Shell (Admin Sidebar & Topbar)
    │           ├── page.tsx                    # Admin Overview & Platform Analytics
    │           ├── agents/
    │           │   └── page.tsx                # Agent Approvals & Verification Manager
    │           └── properties/
    │               └── page.tsx                # Property Moderation & Spam Removal
    ├── components/
    │   └── admin/                              # Isolated Admin Components
    │       ├── AdminSidebar.tsx                # Admin Navigation Sidebar
    │       ├── AdminStatsCard.tsx              # KPI Metrics Cards (Total Users, Listings, Revenue)
    │       ├── AgentApprovalTable.tsx          # Table to Approve/Reject Real Estate Agents
    │       └── PropertyModerationGrid.tsx      # Grid to Approve or Delete Pending Listings
    ├── lib/
    │   └── admin-mock-data.ts                  # Dedicated admin analytics and pending requests
    └── types/
        └── admin.ts                            # Dedicated TypeScript interfaces for Admin

---

## 2. TypeScript Interfaces (`frontend/src/types/admin.ts`)

```typescript
export interface PendingAgent {
  id: string;
  name: string;
  agencyName: string;
  phone: string;
  city: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
}

export interface ModerationProperty {
  id: string;
  title: string;
  price: string;
  society: string;
  agentName: string;
  status: 'Pending Review' | 'Live' | 'Blocked';
}
3. Dedicated Mock Data (frontend/src/lib/admin-mock-data.ts)
TypeScript
import { PendingAgent, ModerationProperty } from '@/types/admin';

export const INITIAL_PENDING_AGENTS: PendingAgent[] = [
  {
    id: 'ag-1',
    name: 'Malik Zohaib',
    agencyName: 'Zohaib Associates',
    phone: '923007778899',
    city: 'Lahore',
    status: 'Pending',
    submittedAt: '2026-08-26',
  },
  {
    id: 'ag-2',
    name: 'Sheikh Usman',
    agencyName: 'Lahore Real Estate Hub',
    phone: '923214443322',
    city: 'Lahore',
    status: 'Pending',
    submittedAt: '2026-08-27',
  },
];

export const INITIAL_MODERATION_PROPERTIES: ModerationProperty[] = [
  {
    id: 'mp-1',
    title: '1 Kanal Luxury Villa in DHA Phase 6',
    price: 'PKR 12.5 Crore',
    society: 'DHA Lahore',
    agentName: 'Zohaib Associates',
    status: 'Pending Review',
  },
];
4. Component Implementation Guidelines
A. Layout (src/app/(dashboard)/admin/layout.tsx)
Dedicated admin shell with a dark/slate sidebar.

Navigation Links: Dashboard Overview, Agent Approvals, Property Moderation.

B. Admin Dashboard (src/app/(dashboard)/admin/page.tsx)
KPI Stats: Total Platform Listings, Pending Agent Requests, Active Leads, Total Verified Agents.

Quick action shortcuts.

C. Agent Approvals (src/app/(dashboard)/admin/agents/page.tsx)
Table showing pending local brokers with Approve and Reject buttons that update state instantly.

D. Property Moderation (src/app/(dashboard)/admin/properties/page.tsx)
Review list of newly posted properties with Make Live or Block / Delete options.

Action Plan for AntiGravity
Read this ADMIN_SPEC.md file.

Build all isolated Admin components and pages strictly inside /frontend/src/app/(dashboard)/admin and /frontend/src/components/admin.

Ensure zero build errors.