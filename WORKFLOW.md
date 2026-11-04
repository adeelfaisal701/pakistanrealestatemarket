# EstatePro Project Workflow and Audit

> **Audit date:** 2026-11-01
> **Purpose:** Central project reference for current implementation evidence, user workflows, product research, release gaps, and subsequent audit history.
> **Status rule:** “Implemented” means code exists, not that a complete production workflow has been proven. No feature below is called end-to-end complete without evidence of a complete test. Research prices and competitor pages are dated snapshots, not contractual offers.

## 1. Project Overview

### Purpose and vision

EstatePro (also branded in the UI as PRM / Pakistan Real Estate Marketplace) is intended to combine a Pakistan-focused property marketplace with agent lead-management tools and administrative moderation. The product direction is a trustworthy inventory source with clearer listing availability, useful agent productivity tools, direct buyer-agent communication, and a real administrative control plane.

The current scope is strongest in the public listing experience, individual agent CRM workflows, database-backed buyer account primitives, and administrative review. The project is not yet a complete commercial SaaS marketplace: subscriptions, payments, production operations, and broad end-to-end verification remain open.

### Users and roles

| Role | Intended use | Current account model |
|---|---|---|
| Buyer / investor | Search, save and inquire about published listings; manage preferences and conversations | `User.role = buyer`; buyer-owned data is scoped by authenticated user ID |
| Agent | Maintain private inventory, submit ads, manage leads and communicate with clients | `User.role = agent`; agency is currently a string on the user, not a first-class agency entity |
| Administrator | Review users, properties, advertisements and reports; retain action history | `User.role = admin`; authenticated through a dedicated configured-admin login |
| Agency / team | Coordinate agents, shared inventory and billing | Intended customer segment; no distinct agency account, team-membership model or agency collection exists yet |

### Product modules

1. Public Marketplace
2. Buyer Account
3. Agent CRM
4. Agency Management
5. Super Admin Portal and moderation
6. Communication and Messaging
7. Property / agent analytics
8. Monetization and Subscriptions
9. AI and advanced discovery/productivity
10. Client Requirements (buyer requests and agent property offers)

### Current architecture

- **Frontend:** Next.js App Router 15.1.7, React 19, TypeScript, Tailwind CSS 4, Axios, TanStack Query, Zustand, and Lucide icons. App routes are under `frontend/src/app`; reusable UI is in `frontend/src/components`.
- **Backend:** NestJS 11 REST API, class-validator/class-transformer DTO validation, Passport/JWT authentication, and Mongoose.
- **Database:** MongoDB. User, property, ad, lead, message, buyer, client requirement, requirement offer, analytics, report, and admin-audit records are represented by Mongoose schemas in `backend/src/modules/**/schemas`.
- **API base:** Backend sets the `/api/v1` prefix. The frontend defaults to same-origin `/api/v1`; Next.js rewrites this to `http://127.0.0.1:5000/api/v1` unless `API_PROXY_TARGET` is configured.
- **Authentication:** The client stores a signed access credential in browser `localStorage` and attaches it to API requests in `frontend/src/lib/api-client.ts`. Backend validation reloads the account and role from MongoDB. Admin login uses `/api/v1/auth/admin-login`; there is no public admin registration.
- **Images:** Image bytes are stored on the backend filesystem and property image references/metadata are stored on property records. Production requires durable storage and a stable public image URL.
- **Agency model:** Agency names are embedded on agent user records. Admin agency listings are grouped views, not standalone agency records.
- **No workspace root build orchestration:** Root `package.json` does not define build/test scripts; run frontend and backend commands in their respective folders.

## 2. Complete Feature Inventory

### Status vocabulary

- **Implemented, focused-tested:** Code and related unit/authorization tests exist. This still does not imply full browser-to-production end-to-end coverage.
- **Implemented, smoke-checked:** Code and limited live local API/browser checks exist; important workflows or mutations are not fully verified.
- **Partial:** Some surfaces are connected, while data sources, workflows, persistence, or authorization have gaps.
- **Planned / absent:** No complete feature implementation was found in the audited routes, modules, schemas, dependencies, and tests.

### 2.1 Public Marketplace

| Feature | Description | Frontend | Backend/API | Database | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Homepage and discovery | Homepage, hero search, popular locations, trust and category content | Present: `frontend/src/app/(public)/page.tsx`, `components/marketplace/HeroSearch.tsx`, `PopularLocations.tsx`, `TrustBanner.tsx` | Uses public listing API in relevant discovery surfaces | Listing data is from `Property` / `PropertyAdvertisement`; location shortcuts are static curated UI data | Page/API and prior build checks recorded; no broad conversion test | Verify every home widget is database-driven where it claims to be; static location names are navigation aids, not live inventory |
| Property search and filters | City, area, sale/rent, type, budget, area, bedroom, feature and sorting filters | `frontend/src/app/(public)/properties/page.tsx`, `components/marketplace/filter-panel.tsx`, `search-bar.tsx` | `GET /api/v1/properties`; validated `QueryPropertyDto` | Published property/ad records | Search/DTO tests passed in the full backend suite; no exhaustive browser filter matrix | Add browser tests for query-string preservation, pagination, empty/error states, and every filter |
| Property detail and gallery | Actual listing image gallery, specifications, description, agent details, contacts, similar listings | `frontend/src/app/(public)/property/[id]/page.tsx` and `property-details-client.tsx` | `GET /api/v1/properties/:id`; public projection omits private exact location | `Property`, linked ad, agent `User` | Backend public-projection/privacy tests passed; visual build and earlier responsive checks recorded; no five-property-type matrix | Verify actual House/Flat/Upper Portion/Plot/Commercial examples and interactions against deployed data |
| Property publishing rules | Public results must be approved/published and not hidden/removed | Rendered by property pages/cards | `GET /api/v1/properties` and `GET /api/v1/properties/:id` filter for public eligibility | Property lifecycle plus separate ad lifecycle | Advertisement tests cover publication eligibility and linked state | Keep inventory (`available/sold/rented`) separate from ad (`pending_review/published/paused/...`) and test every combined state |
| Report a listing or agent | Public report form for supported report categories | `components/marketplace/PropertyReportForm.tsx` | `POST /api/v1/reports` is public; admin reads/updates at `/api/v1/admin/reports` | `UserReport` with category, target type/id, reporter contact, status and private internal notes | Report storage/admin tests are covered partly by admin tests; browser submit/resolve E2E not run | Add abuse controls/monitoring and verify report submission to admin resolution |
| Call and WhatsApp actions | Launch direct phone/WhatsApp contact and track click events | `TrackedCallLink.tsx`, `TrackedWhatsAppLink.tsx` | `POST /api/v1/properties/:id/call-click` and `whatsapp-click` | `PropertyAnalyticsEvent` stores deduplicated visitor event linked to property/ad/agent | Analytics tests verify events and duplicate/bot rejection | Actual call completion cannot be measured by a click; distinguish clicks from completed calls/chats in UI |
| Property availability | Inventory status independently reflects available, sold, rented, reserved or unavailable | Detail and CRM listing surfaces | Agent inventory status API; public API exposes availability | `Property.inventoryStatus`; legacy `Property.status` also has overlapping historic values | Property/API tests cover status-related behavior; no full UI sync matrix | Define and migrate legacy status combinations; ensure all portals display one canonical value |
| Secure exact location sharing | Agent can store exact location privately and send a scoped expiring link to a buyer | `components/crm/ExactLocationMap.tsx`, `ShareExactLocationControl.tsx`, `app/(public)/shared-location/` | Private location/share routes under `/api/v1/properties`; JWT-protected access | Encrypted private location plus hashed, expiring, revocable recipient-bound share token | Encryption, privacy, expiry, revocation, recipient-binding, and validation tests passed | Configure encryption key and TTL in deployment; run operational key-rotation/recovery procedure |
| Projects, society maps, tools and blogs | Navigation/content directions visible in some UI, but no matching implemented pages were found in the audited App Router route inventory | No dedicated project/blog/tool routes identified; home location lists are static | No dedicated APIs found | No dedicated schemas found | Not tested; treat as absent | Implement only when launch scope is approved; remove or redirect navigation that implies unavailable functionality |

### 2.2 Buyer Account

| Feature | Description | Frontend | Backend/API | Database | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Buyer registration/login | Shared public registration/login supports buyer role | `app/(auth)/register/page.tsx`, `login/page.tsx`, `components/auth/RegisterForm.tsx` | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/users/profile` | `User` | Registration validation and role tests passed; authenticated profile returned 200 in local smoke check | Add browser E2E for return-to route, account recovery and expired token |
| Buyer route protection | Guard checks authenticated profile and buyer role; backend protects buyer APIs independently | `BuyerAccessGuard.tsx`, `app/(dashboard)/buyer/layout.tsx` | Buyer routes use `JwtAuthGuard`, `RolesGuard`, `@Roles(buyer)` | Role is read from existing `User` record | JWT role tests passed; local buyer API returned 200 and agent access returned 403 | Keep backend role checks authoritative; improve error states and verify redirect/login flows in browser |
| Buyer overview and recommendations | Shows saved counts, inquiry counts, notifications/new matches and property recommendations | `components/buyer/BuyerDashboard.tsx` | `GET /api/v1/buyer/overview`, `/buyer/recommendations` | Buyer collections plus public properties/ads | API endpoints smoke-checked; service tests exist; UI workflow not fully E2E-tested | Recommendation logic is rule/filter-based, not machine-learning personalization; confirm all displayed metrics against live records |
| Saved properties | Save/unsave supported from property cards/detail; account list only exposes currently public listings | `BuyerSavedPropertiesProvider.tsx`, `SavePropertyButton.tsx`, `BuyerSavedProperties.tsx` | `GET/POST/DELETE /api/v1/buyer/saved-properties`, `GET .../ids` | `SavedProperty`, unique `(buyerId, propertyId)` | Service tests verify buyer scoping and property projection; no full click-to-database browser test | Verify saved state across browser sessions/devices and when property/ad becomes private |
| Saved searches | Save marketplace filter set; rename, change frequency, view matches and delete | `SaveSearchButton.tsx`, `BuyerSavedSearches.tsx` | Saved-search CRUD under `/api/v1/buyer/saved-searches` | `SavedSearch` stores buyer, filters, frequency and alert state | DTO/filter/notification tests passed. A frontend response-shape bug was fixed: API returns an array and `matchCount`, not `{items}`/`matchingCount`; live GET returned 200 | Daily/weekly frequency is stored but no scheduler/queue was found; do not promise timed delivery until added. Verify saved-search creation/updates via UI |
| Buyer-agent inquiries and internal chat | Authenticated inquiry creates/links a CRM lead and buyer-owned conversation; agent replies share the conversation model | `BuyerInquiries.tsx`, property `PropertyConversationChat.tsx`, agent `PropertyConversationsInbox.tsx` | `POST /api/v1/buyer/inquiries`; list `/buyer/inquiries`; messages `/buyer/conversations/:id/messages`; agent/visitor routes `/api/v1/messages/...` | `PropertyConversation`, `PropertyMessage`, linked `Lead`, optional `buyerId` | Tests cover buyer ownership, visitor-session isolation, message DTO and CRM linkage; buyer inquiry GET smoke returned 200 | Frontend inquiry route was aligned to backend paths and message payload requires idempotency key. End-to-end send/reply/read/unread flow still needs browser verification |
| Notifications | In-app notifications, read/unread state, property/conversation links | `BuyerNotifications.tsx` | `GET /api/v1/buyer/notifications?limit=...`, PATCH one read, POST read-all | `BuyerNotification`, deduped per buyer/event | Notification persistence test passed; live buyer GET returned 200 | API returns latest bounded list rather than paginated page metadata; UI reflects this. No push or outbound email |
| Client requirements | Buyers create/edit drafts, publish/pause/close requirements and review/accept/reject offers; offers link to existing listings | `BuyerRequirementsManager.tsx`, `BuyerRequirementDetails.tsx` | `/api/v1/requirements/buyer` CRUD/status/offer-response routes | Separate `ClientRequirement` and `RequirementOffer`; new offer notification uses `BuyerNotification` | Source implemented; focused backend privacy, ownership, locality, verification and offer-reservation tests pass; no browser/database verification | Requires production index rollout and buyer/agent/admin E2E; offer response closes the requirement and rejects remaining pending offers |
| Buyer profile/preferences | Contact fields, locations, budgets, types/purposes and email/in-app preferences | `BuyerProfileSettings.tsx` | `GET/PATCH /api/v1/buyer/profile`, notification-preference endpoints | `BuyerProfile` references buyer `User` | DTO validations tested; profile API returned 200 in local smoke check | Email preference is stored only; there is no mail delivery integration. Verify email changes/uniqueness and user verification flow |

### 2.3 Agent CRM

| Feature | Description | Frontend | Backend/API | Database | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Agent registration and access | Agent registration, login and role-guarded CRM | `app/(auth)/agent/register/page.tsx`, `login/page.tsx`, `components/crm/AgentAccessGuard.tsx` | Auth endpoints; `/api/v1/users/profile` | `User` with role, verification/account status and optional `agencyName` | Registration and JWT role tests passed | Add complete login/agent lifecycle browser test; ensure unverified/suspended capability policy is consistent |
| Inventory/listings | Agent can create/edit listing, browse own listing and update inventory status | `AddPropertyForm.tsx`, `/agent/listings`, edit route | `POST/PUT/DELETE /api/v1/properties`, `/properties/agent/my-listings`, `/properties/manage/:id`, `/properties/:id/inventory-status` | `Property` linked to `User` agent | Property DTO, owner checks, and listing tests passed | Verify real image/edit/availability flows and preserve messages/analytics on deletion |
| Property photos | JPEG/PNG/WebP upload, reorder and remove, metadata persisted; files stored on disk | `PropertyMediaPicker.tsx`, `AddPropertyForm.tsx` | `POST /properties/:id/images`, `PUT .../images/order`, `DELETE .../images` | Property image URLs and metadata; bytes on configured filesystem | Image persistence/type/size/path traversal/ownership tests passed | Deploy durable volume, backup/restore, CDN/HTTPS and cleanup/retention policy |
| Advertisement lifecycle | Submit private inventory as an ad; track ad status separately from property inventory | `/agent/ads`, Agent ad components | `POST /api/v1/properties/:id/advertisement`, `GET /properties/agent/my-ads`, `PUT /properties/advertisements/:id/status` | `PropertyAdvertisement` has unique `propertyId`, agent, status and moderation timestamps | Ad lifecycle, approval linkage and analytics tests passed | End-to-end verify public visibility and My Ads/My Listings status consistency across every action |
| Lead management | Agent-owned leads, pipeline status, notes and activity | `LeadPipeline.tsx`, `LeadCard.tsx`, `AgentModals.tsx` | `POST/GET /api/v1/crm/leads`, PATCH `/crm/leads/:id/status`, `/crm/activity`, `/crm/stats` | `Lead` linked to agent, optional property/ad/conversation and buyer identity | Property-messaging tests and auth/service tests cover selected data paths | The Zustand store imports demo seed data and multiple dashboard widgets rely on it. Audit/replace all demo metrics, contacts and notification state before representing CRM as fully live |
| Agent inbox and messages | Agent conversations, unread count and authenticated reply | `PropertyConversationsInbox.tsx` | `/api/v1/messages/agent/unread-count`, `/agent/conversations`, conversation/messages GET/POST | `PropertyConversation`, `PropertyMessage`, lead reference | Messaging service/authorization tests passed | Verify read receipts/polling and agent replies through browser with buyer-owned conversation |
| Exact-location sharing | Private coordinates can be granted to a registered buyer using time-bound link | `ShareExactLocationControl.tsx`, `ExactLocationMap.tsx` | Property private-location and share APIs | Encrypted property data and hashed share token | Location privacy tests passed | UI/manual recipient journey not fully E2E-verified |
| Analytics dashboard | Event-backed views, unique reach, calls/WhatsApp click counts and activity | `AgentOverviewAnalytics.tsx`, `LiveAgentAnalytics.tsx` | `/api/v1/properties/agent/analytics`, `/properties/agent/activity`, `/crm/activity` | `PropertyAnalyticsEvent` tied to property/ad/agent | Backend event aggregation and bot/deduplication tests passed | Audit `AgentTopBar` notifications, profile and ad/contacts store: mock/demo sources remain in `agent-dashboard-mock-data.ts` and `agent-store.ts` |
| Agent account verification | Admin verification badge and status metadata | Agent profile/approval UI | Admin verify/unverify/reject endpoints; public projections use verified value | `User.isVerified`, verification status, timestamp/admin ID | Admin auth/moderation tests passed | No verification-document storage/review evidence was found; define safe document workflow if required before representing documents as supported |
| Client requirement offers | Verified active agents browse published requests and offer their own eligible published, available listings | `AgentRequirementsManager.tsx`, `/agent/requirements` | `/api/v1/requirements/agent`; listing and offer routes require a fresh DB check for verified/active agent status | `RequirementOffer` references the requirement, agent and existing `Property` | Source implemented; focused backend unit tests pass; no browser/database verification | Buyer identity/contact fields are omitted and contact-like text is redacted; add browser workflow tests |

### 2.4 Agency Management

| Feature | Description | Frontend | Backend/API | Database | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Agency directory | Admin groups agent records by agency name and lists affiliated agents/statuses | `AdminAgencyDirectory.tsx` | `GET /api/v1/admin/agencies` | No agency collection; uses `User.agencyName` | Backend API included in admin work; no agency-specific E2E test | Directory is derived/read-only. Agent controls remain per-user; agency logo/contact verification/suspension are not independently persisted |
| Agency team management | Invitations, teams, roles, shared inventory and activity | No complete agency-member pages found | No agency membership APIs found | No `Agency` or membership schema | Not implemented/tested | Design first-class agency membership and tenant isolation; avoid duplicating current agent records |
| Agency plans/billing | Agency account subscription and payments | No subscription UI found | No billing APIs found | No subscription/payment schemas found | Not implemented/tested | Requires approved commercial plans, payment provider, webhook/idempotency and accounting/reporting decisions |

### 2.5 Admin Portal

| Feature | Description | Frontend | Backend/API | Database | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Admin login and protected portal | Dedicated configured credential login, admin identity must already exist as admin in DB; APIs re-check role | `/admin-login`, `AdminAccessGuard.tsx`, `(dashboard)/admin/layout.tsx` | `POST /api/v1/auth/admin-login`; all `/api/v1/admin/*` protected by JWT and role guards | `User` with admin role | Admin auth tests passed (5 tests in full run); role-denial paths tested | Production configuration, TLS, domain/CORS and deployment not verified |
| Overview/stats | Counts for agents, listings, pending ads/reviews and reports from DB | `AdminOverviewDashboard.tsx`, `AdminStatsCard.tsx` | `GET /api/v1/admin/stats` | Counts from users, properties, ads, reports | Build and API-oriented tests; no dashboard metric reconciliation E2E | Review six expected KPIs against returned fields and label each count precisely |
| Agent management | Search/filter, profile, verify/unverify/reject, suspend/reactivate/deactivate and protected delete | `AgentApprovalTable.tsx`, `AdminAgentProfile.tsx` | `/admin/agents`, `/admin/agents/:id`, verify/unverify/reject/account-status/delete | `User` lifecycle fields, related properties/ads/leads/chats | Admin auth/moderation tests cover authorization and state rules | Verify real UI confirmation/reason requirements and badge updates; deletion refuses linked history |
| Property moderation | List/filter/search/paginate, approve/reject/hide/unpublish/flag/remove/restore and protected delete | `PropertyModerationGrid.tsx` | `/admin/properties`, `/properties/pending`, `/properties/:id/moderate`, `/properties/:id/action`, DELETE `/properties/:id` | `Property` moderation flags/reason/status, linked ad and audit activity | Admin moderation tests passed; public projection/retention tests passed | Exercise every moderation state against real records; hard deletion is confirmation-protected and retention-aware |
| Advertisement moderation | Approve/reject/publish/pause/resume/end/remove with linked property/agent | `AdminAdvertisementManager.tsx` | `/admin/advertisements`, PATCH `/admin/advertisements/:id/action` | `PropertyAdvertisement` independent from `Property` | Backend moderation tests include linked state sync; UI build | Verify actions preserve the property, and agent/public/admin views agree immediately |
| Reports and complaints | Public report submission; admin review, internal notes/status/resolution | `AdminReportsManager.tsx`, `PropertyReportForm.tsx` | `POST /api/v1/reports`, GET/PATCH `/api/v1/admin/reports` | `UserReport`; internal notes excluded by default selection | Targeted admin tests; no full browser submission/resolution | Validate report target existence and privacy visibility; verify status/resolution trail |
| Client requirement moderation | Admin search/details include buyer contact data and offers; suspend, restore or close actions are audited | `AdminRequirementsManager.tsx`, `/admin/requirements` | `/api/v1/requirements/admin` list/detail/moderation routes; moderation writes `AdminActivity` | `ClientRequirement`, `RequirementOffer`, `AdminActivity` | Source implemented; no focused moderation test or browser/database verification | Review PII access policy, moderation/audit permissions, and index rollout before production |
| Activity/audit log | Searchable admin event history; backend writes action, admin, entity, status, reason and metadata | `AdminActivityLog.tsx` | `GET /api/v1/admin/activity` | `AdminActivity`; no agent mutation endpoints | Audit state/actions tested in admin suite | Ensure all sensitive actions log consistently; monitor missing optional audit model configuration |
| Agency directory controls | Derived directory and associated agent links | `AdminAgencyDirectory.tsx` | GET `/admin/agencies` only | No independent agency state | Not full feature tested | Agency-level verify/suspend/remove cannot truthfully be offered until an agency record model exists |

### 2.6 Communication and Messaging

| Feature | Description | Frontend | Backend/API | Database | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Buyer-agent chat | Visitor session for anonymous visitors and authenticated buyer ownership for buyer accounts; agent view shares conversations | `PropertyConversationChat.tsx`, `BuyerInquiries.tsx`, `PropertyConversationsInbox.tsx` | `/messages/visitor-*`, `/messages/agent-*`, `/buyer/inquiries`, `/buyer/conversations/:id/messages` | Conversations, messages and CRM leads | Message size/idempotency and authorization tests passed | Complete live buyer-agent send/read/reply/notification test |
| WhatsApp support | Footer support link and external agent listing links | `Footer.tsx`, `TrackedWhatsAppLink.tsx` | Agent click tracking API; support link opens `wa.me` externally | Click events only for tracked property WhatsApp | Footer URL/code checked; no WhatsApp-delivery integration test | Support URL is `https://wa.me/923007589188?text=Assalam%20o%20Alaikum%20PRM%20Support`; external messaging delivery is not controlled by EstatePro |
| Phone/calls | Click-to-call, with click analytics | `TrackedCallLink.tsx` | `/properties/:id/call-click` | Analytics event, not call recording | Click tracking tests passed | No telephony integration or confirmed-call outcome |
| Email and push | Preferences UI/model includes email boolean; no delivery service or push integration found | Buyer preferences only | No mail/push APIs or delivery worker found | Preference only | Not implemented/tested | Do not claim email, SMS or push delivery |

### 2.7 Analytics

| Feature | Description | Frontend | Backend/API | Database | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Property events | Property view, call click and WhatsApp click, deduped and linked to active published ad | Tracking components and analytics dashboards | Public event routes and agent analytics | `PropertyAnalyticsEvent` with hidden visitor/dedupe hashes | Aggregation, bot and duplicate tests passed | Clicks are intent signals, not completed calls or attributed sales |
| Agent metrics/activity | Aggregated real persisted analytics and CRM activity | Agent analytics pages; some separate widgets still demo-backed | `/properties/agent/analytics`, `/properties/agent/activity`, `/crm/activity` | Analytics events and leads | Backend tests passed; no report correctness reconciliation against production | Identify and remove/label sample metrics and mock widgets |
| Admin platform counts | Database count cards | Admin dashboard | `/admin/stats` | Existing user/property/ad/report collections | API coverage present; no visual acceptance test for every metric | Confirm counts and time windows; avoid hard-coded counts |
| Development analytics demo | Deterministic generated sample values, explicit development-only mode, skips DB/auth modules | Agent overview may use the analytics surface | Separate module enabled only when `NODE_ENV=development` and `ANALYTICS_DEMO_MODE=true` | In-memory only; not persistent or real | Code guard present; not a production feature | Clearly label sample mode and never use those metrics in production |

### 2.8 Monetization and Subscriptions

| Feature | Description | Frontend status | Backend/API status | Database status | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Paid listing slots/boosts | Buy additional listing quota or paid visibility | Planned / absent; no checkout UI found | Planned / absent; no purchase endpoint found | No plan/order/payment schema | Not tested; no implementation | Specify inventory quotas, prices, duration, cancellation, refunds and boost ranking |
| Agency subscription tiers | Agency plans, seats, quota and entitlements | Planned / absent | Planned / absent; no billing module | No agency or subscription collection | Not tested; no implementation | Build first-class agency tenant, entitlements, invoices, lifecycle and admin reporting |
| Payment processing/webhooks | Collect, reconcile and refund payments | Planned / absent | Planned / absent; no payment provider/webhook integration found in manifests/source | No payment transaction ledger | Not tested; no implementation | Select Pakistan-supported payment rails; implement signature validation, idempotency, reconciliation and sandbox/live testing |
| Revenue dashboards | Admin visibility into paid usage, renewals and revenue | Planned / absent | Planned / absent | No persisted paid transactions | Not tested; no implementation | Add only after a payment ledger becomes the source of truth |

### 2.9 AI and Advanced Features

| Feature | Description | Frontend status | Backend/API status | Database status | Testing status | Evidence and remaining work |
|---|---|---|---|---|---|---|
| Buyer recommendations | Rank actual published properties for a buyer | Implemented, deterministic UI consumption | `/buyer/recommendations` filters actual active ads/properties using profile/saved searches | Uses existing buyer preferences/searches and property/ad records; no ML model | Service/API code present; limited API smoke and backend suite, no relevance evaluation | Measure relevance; add explanation and do not claim machine-learning personalization |
| CRM auto-match | Suggest agent inventory for a lead | Prototype heuristic UI | No dedicated ranking API; client-side match logic | Uses current agent state/inventory; no model or persisted match record | Not independently evaluated | Current hard-coded score starts at 50 and uses limited society/type criteria. Replace score semantics and include real budget/purpose/area with explainable matching |
| Generative AI/search assistant/valuation | Natural-language search, copy assistance or valuation | Planned / absent | No AI API/provider found | No prompts, model output or usage records | Not implemented/tested | Define safe scope, sourcing, confidence, PII handling, cost and human-review rules before implementation |
| Predictive pricing/fraud scoring | Detect anomalies or predict pricing/risk | Planned / absent | No trained model or scoring service found | No training/evaluation data store | Not implemented/tested | Collect lawful quality data, establish evaluation/appeal policy and avoid unvalidated automated decisions |

## 3. Complete User Workflows

### 3.1 Buyer registration and property discovery

1. Buyer opens `/register` and submits user details with buyer role.
2. Frontend calls `POST /api/v1/auth/register`; backend validates input, creates a `User`, hashes the password and returns a JWT.
3. Frontend stores token and user in browser storage, dispatches the auth-change event, and routes the buyer to `/buyer`.
4. Buyer searches `/properties`; validated filters are passed to `GET /api/v1/properties`.
5. Public API returns only eligible published records and omits exact/private address coordinates.
6. Buyer opens `/property/:id` for gallery, detail and contact options.

**Status:** Auth and public listing endpoints have focused tests and local API checks. Full registration-to-search-to-contact browser E2E is still required.

### 3.2 Saving properties and searches

1. Authenticated buyer clicks the save-property control.
2. Frontend calls `POST /buyer/saved-properties` with `propertyId`; remove uses `DELETE /buyer/saved-properties/:propertyId`.
3. Backend confirms the property is currently public and upserts a buyer-scoped saved link; duplicate links are constrained by a unique index.
4. Buyer opens `/buyer/saved-properties`; only currently public property cards are hydrated.
5. Buyer saves current marketplace filters through `POST /buyer/saved-searches`; update/delete use corresponding PATCH/DELETE endpoints.

**Status:** Persistence service, DTO and response-shape paths exist and have focused tests; local GET was checked. UI mutation and cross-session E2E remain open.

### 3.3 Sending inquiries and buyer-agent internal chat

1. Buyer opens a published property and starts an inquiry/chat.
2. Authenticated inquiry uses `POST /buyer/inquiries` with property ID and initial message.
3. Backend creates or reuses a buyer-owned conversation, sends the first message with an idempotency key, and links the CRM lead.
4. Buyer reads/replies at `/buyer/conversations/:conversationId/messages`.
5. Agent sees the corresponding conversation in `/agent/calls`/CRM inbox and replies through `/messages/agent/...`.
6. Message unread counts and persistent notifications are stored in the database.

**Status:** Ownership/linkage and message authorization are unit tested. Real UI round trip, read receipts, and notification behavior need E2E verification.

### 3.4 Agent registration and verification

1. Agent registers through `/agent/register` using public auth registration.
2. Account has agent role and pending verification by default.
3. Admin searches agents at `/admin/agents`, inspects profile, and verifies/rejects or changes account status.
4. Backend records status/timestamp/admin ID and audit event; public badge is based on persisted `isVerified`.
5. Suspension/deactivation requires a reason, prevents protected requests when role strategy rejects inactive accounts, and pauses published ads.

**Status:** Auth/role/moderation service tests exist. Verification-document submission/review is not evidenced. Test suspended access against each CRM mutation endpoint and actual publication state before launch.

### 3.5 Adding private property inventory

1. Authenticated agent enters property through `/agent/add-property`.
2. `POST /api/v1/properties` creates one property record owned by agent.
3. Photo files are uploaded to `/properties/:id/images`, with metadata/references saved to MongoDB.
4. Agent edits using owner-scoped management routes and changes inventory availability independently of the ad.

**Status:** Backend validation, owner checks, image integrity and upload tests passed. Full browser UI and durable production storage remain to verify.

### 3.6 Submitting advertisements, moderation and publication

1. Agent submits existing property through `POST /api/v1/properties/:id/advertisement`; backend creates/updates the unique ad linked to the property.
2. Admin lists and filters ads at `/admin/advertisements`.
3. Admin approves/rejects/pauses/ends/removes using PATCH action; moderation timestamps/reasons and audit rows are persisted.
4. Public property APIs return only eligible published property/ad pairs.
5. Agent My Ads and My Listings query separate but related records.

**Status:** Backend moderation tests verify linked state changes and public filtering. Validate the entire UI/state flow against real records and ensure removal never deletes original property.

### 3.7 Managing leads and follow-ups

1. Buyer/visitor starts conversation or agent creates lead.
2. Backend stores lead under authenticated agent, optionally linked to property/ad/conversation.
3. Agent opens `/agent/leads`, searches/updates pipeline status and notes; statuses are New, Contacted, Site Visit Scheduled, Negotiation, Closed Won, Lost.
4. Contact/call/WhatsApp interactions may be tracked as clicks/events; there is no telephony system.

**Status:** Core lead API and conversation link have tests. A Zustand demo store and dashboard widgets still exist; complete persistent CRM workflow and demo-data removal/audit are launch priorities.

### 3.8 Agency team workflow

**Intended:** Admin/owner creates an agency, invites agents, manages roles, shared inventory, verification and subscription.

**Current:** No agency entity, member invitations, membership permissions, agency profile, or team APIs exist. Directory is derived from `User.agencyName`; it does not persist agency status or support independent agency moderation.

### 3.9 Subscription and payment workflow

**Intended:** Agent/agency selects plan or boosts, pays, receives entitlements/invoice, renews/cancels, and admin reconciles transactions.

**Current:** No subscription/payment implementation or data model was found. All pricing/business mechanics remain a proposal, not a working workflow.

### 3.10 Client Requirements workflow

1. A buyer creates a Bahria Town, Lahore requirement as a draft under `/buyer/requirements`, then publishes it; only the owning buyer can update/delete drafts or publish, pause, and close permitted statuses.
2. Agent requirement APIs re-check that the account is active and both `isVerified` and `verificationStatus` indicate verified. Published requests expose requirement criteria only; buyer account fields are not returned, and contact-like text is redacted.
3. Agents can offer one existing property they own per requirement when its property and advertisement are published and inventory is available. The agent UI ranks exact and partial matches by type, purpose, city/locality, budget, size, bedrooms and bathrooms, while keeping all other eligible listings selectable. The backend does not reject a listing solely for not matching buyer criteria. A compound unique index plus an atomic per-requirement reservation prevents duplicate agent offers. When a buyer accepts an offer, the offer is linked to the existing property conversation, and the agent's submitted message is persisted in that conversation.
4. A new offer creates a buyer notification. Buyer review is scoped to the owning requirement; accepting one offer closes the requirement and rejects the remaining pending offers. Buyer contact with the accepted agent reuses the existing property inquiry/conversation workflow.
5. Admin requirement listing/detail can include buyer contact information. Suspend/restore/close actions write an `AdminActivity` record.

**Status:** Source implementation exists; six focused backend unit tests pass. No build, database operation, or browser verification was run. Production has automatic index creation disabled; review and provision the new requirement/offer indexes through the approved database release process before relying on index-backed query performance. Add moderation/status lifecycle and buyer/agent/admin browser tests before launch.

## 4. Development Phase Tracker

“Completion” below records evidence, not an estimated percentage. A phase is not called complete merely because UI or endpoint code exists.

| Phase | Description | Status | Completion evidence | Remaining tasks |
|---|---|---|---|---|
| Foundation and architecture | Next.js/NestJS/MongoDB, role auth, API proxy, shared design system | Partial / usable foundation | Frontend/backend builds pass; API proxy and role checks exercised locally | Production deployment architecture, monitoring, recovery/runbooks, formal CI |
| Public marketplace | Search, property details, images, contact and public data policy | Implemented, partially verified | API/property projection tests and browser/build checks recorded | Full type/viewport matrix, accessibility, production SEO/performance |
| Buyer account | Buyer profile, favorites, searches, inquiries, notifications, recommendations | Implemented, focused-tested/smoke-checked | 70 backend tests pass; live local buyer read endpoints return 200; response mismatch fixed | Full browser mutation and buyer-agent reply E2E; alert scheduler/email absent |
| Agent CRM | Inventory, ads, leads, chat and analytics | Partial | Listing/message/analytics tests exist; core screens and APIs are present | Replace/label demo store and mock widgets; end-to-end CRM and lifecycle tests |
| Admin moderation | Protected admin control plane for agents, properties, ads, reports and audit | Implemented, focused-tested | Admin authorization/moderation test coverage in 70-test run | Production admin environment; full browser action test and concurrency/retention review |
| Agency management | Agency record, team membership and controls | Planned / absent | Only agent agency-name grouping exists | Design and implement agency tenancy, permissions and persistence |
| Analytics | Property click events and agent/admin aggregates | Partial | Event schema and aggregation/security tests pass | Dashboard reconciliation, eliminate sample/demo values from live surfaces |
| Security/data integrity | Authorization, validation, location privacy, audit and data retention | Partial / good foundations | JWT DB-role tests, property privacy/image, report and moderation tests pass | Rate-limit distribution, security review, production secrets/CSRF/XSS posture, backups and migrations |
| Monetization | Listing tiers, subscription, payment and entitlement | Planned / absent | No payment or subscription models/APIs found | Product pricing and payment rail decision; implement and reconcile |
| AI/advanced | Smart matching, valuations and assistant | Planned / prototype | Heuristic drawer and filter-based recommendations exist | Rework explainable matching; decide measured AI scope and safeguards |
| Launch and operations | Production-grade deployment and customer support | Not verified | Local build/test commands work | Production infrastructure, domain/TLS, durable media, alerts, backups, incident response, data/privacy/legal review |

## 5. Market Research and Competitor Benchmark

**Research date:** 2026-11-01. Public competitor pages were fetched on this date; content/pricing can change. Only directly visible official-page information is recorded. No market share, conversion, or package-performance claims are made.

| Competitor | Publicly verified features | Public package/pricing information captured | Source and research limitation |
|---|---|---|---|
| Zameen.com | Agent finder provides property-type, city, location and company-name filters. New-project finder exposes city/type/budget/area/project/developer filters. Advertise page separates individuals, agencies and developers and offers paid boosts. | Official advertise page displayed individual Listing Slot **PKR 3,000/month**, Hot Listing **PKR 7,800/month**, Super Hot **PKR 21,000/month**, Refresh Credits **PKR 240/credit**, Story Ads **PKR 1,000/credit**. Agency Starter starts at **PKR 14,000/month billed annually**, Business **PKR 55,000/month billed annually**, Titanium **PKR 200,000/month billed annually**, Titanium Plus **PKR 333,000/month billed annually**. The page lists differing listing/boost quotas by tier. | [Agents](https://www.zameen.com/agents/), [New Projects](https://www.zameen.com/new-projects/), [Advertise](https://www.zameen.com/advertise/). Snapshot only; recheck current checkout/terms before any business comparison. |
| OLX Pakistan | Public properties page shows a broad property classifieds feed with title, asking price, type, room/bath/area details and location; listings include recency. | No official package/pricing page was verified during this audit; no price is asserted. | [Properties](https://www.olx.com.pk/properties_c2). A sample public listing was visible; individual listing contents are user-generated and not a quality guarantee. |
| Lamudi Pakistan | Public homepage exposes buy/rent discovery, Homes/Plots/Commercial categories, home subtypes, budget min/max, area range and bedroom filters. | No package/pricing information verified. | [Lamudi Pakistan](https://www.lamudi.pk/). Feature observations from publicly rendered page only. |
| Graana | No feature or pricing claims included. | Not verified. | `graana.com` could not be fetched in this audit due host-resolution failure; retry research before using in a formal competitor comparison. |

### Common market practices observed

- Sale/rent separation, property-type and location filters, and budget/area constraints are baseline discovery patterns.
- Detail cards commonly show asking price, locality, area and selected room counts.
- Agent/company discovery is a distinct acquisition surface.
- Paid visibility/boost credits and agency packages are a demonstrated incumbent monetization pattern (Zameen’s public page).
- Cross-platform phone/WhatsApp is a low-friction contact expectation in the local market; it is not evidence that a portal can attribute completed deals.
- Property portal and classifieds models coexist. Better availability/fraud controls and useful CRM can differentiate EstatePro from a listings-only experience.

### Competitive gaps and opportunities for EstatePro

- Build a verified availability and last-confirmed timestamp system end-to-end; the footer currently claims a 14-day confirmation concept, but audit evidence for an automated enforcement workflow is insufficient.
- Keep original property and advertisement as separate records and make every public status change explainable.
- Make buyer-agent chat persistent and CRM-linked, with response-time and read/unread evidence.
- Give agents measurable, honest analytics: clicks/reach only where recorded; avoid implying phone calls or closings occurred.
- Make agency collaboration a real tenant/team model rather than a label on individual users.
- Offer simpler, transparent paid promotion with visible quota, duration and outcome metrics after payments are implemented.

## 6. EstatePro Differentiation Strategy

Complexity is relative engineering/product effort: **S** small, **M** medium, **L** large. Recommendations are proposals, not existing features.

| Recommendation | Value | Priority | Complexity | Dependencies |
|---|---|---:|---:|---|
| One-tap availability confirmation with “last confirmed” age, expiry policy and agent reminders | Reduces stale inventory and buyer wasted contact; differentiates on trust | P0 | M | Status policy, scheduled worker, notification delivery, agent UI, public display |
| Buyer-to-agent inbox shared with agent CRM, persistent identity and response state | Reduces lost inquiries and manual copy/paste | P0 | M | Existing conversation model; finish E2E, read receipts and SLA events |
| Explainable verified listing/agent badges with visible criteria and history | Builds trust without implying an unperformed verification | P0 | M | Admin criteria, evidence retention, audit trail and public badge policy |
| Privacy-safe location with buyer-controlled exact-location sharing | Enables useful maps without leaking private addresses | P0 | M | Existing encrypted/share model; operational key management and buyer experience |
| Agent CRM inbox with tasks, follow-up reminders, lead aging and outcome tracking | Improves agent productivity and manager visibility | P1 | M/L | Persistent task/activity model, schedules/notifications and migration of demo state |
| Useful saved-search alerts at selectable cadence | Repeat discovery without manually re-running filters | P1 | M | Existing saved search/notification models; scheduler, idempotency and delivery policies |
| Agency workspace with invitations, roles, shared listing ownership and audit | Supports team offices and agency plans | P1 | L | Agency tenant/membership schemas, access-control design and data migration |
| Transparent paid listing packages with usage ledger | Creates sustainable revenue and predictable listing promotion | P1 | L | Commercial validation, agency/plan model, supported gateway, webhook/reconciliation |
| Deterministic, explainable property recommendations | More relevant discovery without claiming AI | P1 | M | Canonical structured criteria, live inventory, offline evaluation and feedback |
| AI-assisted listing text/quality checks with agent approval | Saves agent time and improves listing completeness | P2 | M/L | Provider/data policy, cost controls, secure prompt handling, explicit human review |
| Fraud/anomaly triage for duplicate images, suspicious contact or price outliers | Helps moderation prioritize risk | P2 | L | Carefully labeled training/heuristic data, privacy/appeal rules, admin review |
| Property document/verification workflow | More defensible ownership/agent verification | P2 | L | Secure private object storage, authorization, retention and legal review |

## 7. Remaining Work and Priorities

### Critical blockers

- [ ] Remove or clearly label agent dashboard/store demo data, especially notification, profile, ad/contact metrics, and hardcoded values in `agent-dashboard-mock-data.ts` / `agent-store.ts`.
- [ ] Define and test one canonical property publication/inventory/ad status policy, including all combinations across public detail, buyer saved properties, agent CRM, and admin.
- [ ] Complete real buyer-to-agent browser E2E: create inquiry, persist lead, agent reply, buyer receives message, read state updates.
- [ ] Productionize rate limiting: current admin mutation limiter is process-local and does not coordinate across replicas. Review public report and visitor-session abuse protections too.
- [ ] Validate deployment configuration for strong JWT secret, admin identity, HTTPS/CORS, encryption key, durable image volume and backups. Never put secrets in frontend variables or source.
- [ ] Review schema index creation and existing MongoDB data before production auto-indexing; unique index creation can fail if legacy duplicates exist. Add explicit migrations/preflight and backup/rollback procedures.

### Required for launch

- [ ] Create automated browser tests for signup/login, property search/detail, save/remove property, save/update search, inquiry/chat, agent CRM and admin moderation.
- [ ] Verify desktop/tablet/mobile layouts and keyboard/accessibility behavior for all account/admin screens.
- [ ] Test real published records for House Sale, Apartment Rent, Upper Portion Rent, Plot Sale and Commercial Property.
- [ ] Test agent verification, suspended account denial across all protected endpoints, reactivation, and ad pause/resume.
- [ ] Test property hide/restore, ad removal without property deletion, report resolution, audit history, and hard-delete safeguards.
- [ ] Decide exact data retention and deletion behavior for images, conversations, leads, analytics, reports and location shares.
- [ ] Review public report target validation and privacy-safe reporter exposure.
- [ ] Add monitoring, structured logs, health/readiness endpoints for regular production mode, error reporting, database backups and restore drills.
- [ ] Confirm legal documents and privacy/data handling are real and reviewed; footer links currently point to routes not present in the audited route inventory.
- [ ] Confirm sitemap, metadata, canonical URLs, search crawl behavior, rate limits and public API/cache policy.

### Important improvements

- [ ] Build first-class agency and membership model before agency-level controls or plans are claimed.
- [ ] Implement a worker/scheduler for daily/weekly alerts or remove unsupported cadence options until it exists.
- [ ] Add secure email verification/password reset and email delivery if required.
- [ ] Reconcile AgentTopBar, persisted CRM store and metrics to authoritative backend records.
- [ ] Improve analytics definitions and label call/WhatsApp clicks as clicks, not completed interactions.
- [ ] Review photo lifecycle, storage capacity, backups, CDN, image resizing and orphan cleanup.
- [ ] Add pagination/filters to buyer notifications and inquiries if account volumes require it; current notifications endpoint returns a bounded recent list.
- [ ] Add business audit exports and admin filters for long-term moderation/report operations.

### Premium features

- [ ] Payment-enabled individual boosts and agency subscription tiers.
- [ ] Agency banners, project promotion and configurable listing quotas.
- [ ] Verified documents and stronger agent/property trust levels.
- [ ] Appointment scheduling, viewing calendar and follow-up automation.
- [ ] Multi-agent team dashboard, task assignment and shared inbox.

### Future innovations

- [ ] Explainable recommendations and buyer preference learning.
- [ ] AI-assisted listing quality checks and draft generation with explicit agent approval.
- [ ] Duplicate-image, suspicious-price and scam-risk triage with human decision and appeals.
- [ ] Market trend reports only after sufficient clean, representative persisted data exists.
- [ ] Society/project directory and map tools after authoritative data/licensing sources are selected.

## 8. Technical Findings

### Frontend routes audited

- **Public:** `/`, `/properties`, `/property/[id]`, `/post-property`, `/shared-location`
- **Authentication:** `/login`, `/register`, `/agent/register`, `/admin-login`
- **Buyer:** `/buyer`, `/buyer/inquiries`, `/buyer/notifications`, `/buyer/profile`, `/buyer/saved-properties`, `/buyer/saved-searches`
- **Agent:** `/agent`, `/agent/add-property`, `/agent/ads`, `/agent/calls`, `/agent/leads`, `/agent/listings`, `/agent/listings/[id]/edit`
- **Admin:** `/admin`, `/admin/activity`, `/admin/advertisements`, `/admin/agencies`, `/admin/agents`, `/admin/agents/[id]`, `/admin/properties`, `/admin/reports`
- No dedicated blog, calculator/tools, society map, privacy, terms, agency membership or billing route was found in the audited App Router page list.
- Admin host path handling is in `frontend/src/middleware.ts`; API proxy configuration is in `frontend/next.config.ts`.

### Backend API inventory

All routes below are prefixed `/api/v1`.

| Controller/module | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/admin-login` |
| Users | `GET /users/profile`, `GET /users/:id` (self or admin protected) |
| Public property discovery | `GET /properties`, `GET /properties/:id`, `GET /properties/images/:filename`; public view/call/WhatsApp event posts |
| Property management | `POST /properties`, `PUT/DELETE /properties/:id`, `PATCH /properties/:id/inventory-status`, image upload/order/delete, `/properties/agent/my-listings`, `/properties/agent/my-ads`, `/properties/agent/activity`, ad submission/status, `/properties/agent/analytics`, `/properties/manage/:id` |
| Private location | Property private-location GET/PUT, location-share GET/POST/revoke, authenticated `/properties/private-location/access` |
| CRM | `/crm/leads` GET/POST, `/crm/leads/:id/status` PATCH, `/crm/activity`, `/crm/stats` |
| Messaging | Visitor session/start/read/send under `/messages/visitor-*`; agent unread/list/conversation/messages under `/messages/agent-*` |
| Buyer | Overview, saved properties/IDs, saved-search CRUD, inquiries, buyer conversations/messages, recommendations, notifications/read/read-all, buyer profile and notification preferences under `/buyer/*` |
| Admin | Stats; agents/profile/verify/unverify/reject/account status/delete; agencies; properties/list/pending/moderate/action/delete; advertisements/list/action; reports/list/update; activity list |
| Public report | `POST /reports` |

### Database entities and relationships

- `User`: buyer/agent/admin roles; verification and account lifecycle attributes; optional `agencyName`.
- `Property`: owner `agentId`, purpose/type/price/area, public city/area, `select:false` address/coordinates, optional encrypted private location, structured features, images, moderation/inventory state.
- `PropertyAdvertisement`: separate record uniquely keyed by property; agent, publication/review/pause/end states and dates. Removing an ad should not automatically erase its property.
- `Lead`: agent-owned contact/pipeline data, optional property/ad/conversation and buyer ID; visitor hash and buyer ID are excluded from default selection.
- `PropertyConversation` / `PropertyMessage`: property/ad/agent/lead references; optional buyer owner; anonymous visitor identity is stored as hashed session identifier; message idempotency index.
- `SavedProperty`: buyer/property link, unique buyer+property index.
- `SavedSearch`: buyer filters/cadence/enabled state/last-alert time.
- `BuyerProfile`: buyer preference fields and notification preferences; unique buyer ID. Redundant duplicate index declaration was removed and regression-tested.
- `BuyerNotification`: buyer, event type, property/conversation link, read state, dedupe key.
- `PropertyAnalyticsEvent`: event linked to property/ad/agent with hidden visitor hash/dedupe key.
- `PropertyLocationShare`: agent/property/recipient, unique token hash, expiry/revocation.
- `UserReport`: target type and string ID, category/details/reporter metadata, status, private internal notes, resolution.
- `AdminActivity`: admin, action/entity IDs/types, previous/new status, reason, metadata, timestamp.

### Authorization and security

- Nest global validation uses whitelist, transformation and rejection of unknown DTO fields.
- JWT strategy loads the current `User` by token subject, checks active account status, and returns the DB role; role guards protect agent, buyer and admin modules.
- Admin has dedicated configured login; regular public login rejects admin accounts. Public registration DTO does not allow admin role/privilege fields.
- Admin mutation endpoints use confirmation/reason DTOs where relevant, mutation rate guard and audit logging. Hard deletion checks linked records and confirmation phrase.
- Public property projection and schema selection omit exact location; exact coordinates are encrypted for restricted sharing. Share tokens are random, hashed in storage, expiring/revocable and recipient-bound.
- Image endpoints restrict file MIME/size/count and guard path traversal; files are stored outside MongoDB.
- JWT is held in browser `localStorage`; review XSS exposure and CSP. Backend APIs remain the security boundary.
- The admin rate limiter is process-local; use shared/distributed limiting for horizontally scaled deployments.
- Do not store admin credentials, JWTs, Mongo URIs or encryption keys in this document or source control.

### Integrations and known bugs/status changes

- **Existing:** MongoDB, filesystem image storage, OpenStreetMap/map links where used, external `wa.me` links, JWT authentication.
- **Not found:** payment gateway, subscription billing, outbound email/SMS/push provider, job queue/scheduler, AI provider.
- **Resolved during buyer work:** saved-search UI expected an object response while backend returns an array with `matchCount`; UI was aligned and production build passed.
- **Resolved during buyer work:** duplicate unique buyer-profile index declaration removed; schema regression test verifies a single unique index.
- **Open known concern:** Agent CRM contains mock/demo imports and local persisted demo store; inspect every rendered metric and notification before claiming live persistence.
- **Open known concern:** CRM matching drawer uses a heuristic score initialized at 50 and only a limited subset of criteria; avoid presenting as AI or a calibrated probability.
- **Open known concern:** frequency settings allow daily/weekly but there is no scheduler; email preference is stored without delivery.
- **Open known concern:** no first-class agency, payments, blogs/tools pages, or full regression UI test suite is evidenced.

## 9. Testing and Verification

### Prior workflow audit verification record (2026-11-01; retained historical results)

The following checks and results were recorded in the preceding workflow audit. They are retained as history and were not all repeated during the master verification audit below.

| Check | How performed | Result | Limitations |
|---|---|---|---|
| Backend automated specs | In PowerShell from `backend`: `$testFiles = Get-ChildItem .\test -File -Include '*.spec.ts','*.spec.js' \| ForEach-Object { $_.FullName }; node --test -r ts-node/register $testFiles` | **PASS: 70 tests, 0 failures** | Unit/service tests use fakes/mocks for many persistence paths; not a production database migration test |
| Backend compilation | `cd backend; npm run build` | **PASS** | Build does not validate deployment secrets, production indexes, or runtime external services |
| Frontend typecheck | `cd frontend; .\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false` | **PASS** | Does not validate runtime API payloads beyond declared types |
| Frontend production build | `cd frontend; npm run build` | **PASS**; all listed App Router pages generated | Build is not browser E2E and does not verify each route’s authenticated state |
| Real local buyer read APIs | Created short-lived test JWT for an existing buyer using local configured DB identity; GET profile, inquiry list, notification list, saved searches | **PASS:** 200; saved-search API returned array shape | Read-only smoke test, no creation/mutation; no secret/token recorded |
| Role isolation | Same local API smoke approach with existing agent identity against buyer profile API | **PASS:** 403 | One endpoint check, not exhaustive authorization matrix |
| MongoDB connectivity | Local connection using configured backend URI | **PASS: reachable** | Not a production/Atlas readiness or failover test |
| Frontend route inventory | Next production build output | **PASS:** buyer/admin/agent/public routes emitted | Route emission does not prove auth/navigation workflow or design acceptance |
| Admin/property/buyer security and logic | Full backend test run | **PASS:** includes JWT DB-role, admin-auth/moderation, property image/privacy, buyer ownership/search/alerts/messaging tests | Coverage is not a substitute for penetration/security review |
| Browser viewports and all interactions | Not run for this audit document | **NOT VERIFIED** | Need automated browser suite plus desktop/tablet/mobile checks |
| Real property-type workflow matrix | Not run against all specified existing examples | **NOT VERIFIED** | Check House Sale, Apartment Rent, Upper Portion Rent, Plot Sale, Commercial |
| Payment/email/scheduled alerts | No integration exists | **NOT IMPLEMENTED** | No claim of delivery or billing functionality |
| Lint | Not run | **NOT VERIFIED** | Frontend script is `next lint`; confirm compatibility with installed Next version before relying on it |

### Test inventory

Backend tests under `backend/test` include:

- `auth-registration.spec.ts`
- `admin-auth.spec.ts`
- `admin-moderation.spec.ts`
- `buyer-service.spec.ts`
- `buyer-search.spec.ts`
- `buyer-alerts.spec.ts`
- `jwt-role.spec.js`
- `property-advertisement-analytics.spec.ts`
- `property-images-and-features.spec.ts`
- `property-location-sharing.spec.ts`
- `property-messaging.spec.ts`

No frontend test script or browser test framework was found in the frontend package manifest during this audit.

## 10. Project Progress History

Historical entries are intentionally not backfilled from assumptions. This audit starts the durable repository history on the date requested; update this section in future audits rather than replacing prior records.

### Audit 2026-11-01

- **Overall progress:** Core product modules have substantial implementation and backend unit coverage. The project is an advanced prototype/MVP, not a verified production launch. No overall percentage is assigned because browser-to-database coverage, production operations and feature completeness differ materially by module.
- **Completed in this audit:** Repository route/schema/API/test inventory; public competitor page and pricing snapshot; buyer API contract spot checks; full backend test run; backend build, frontend typecheck and frontend production build were recorded as passing.
- **Partially completed:** Public marketplace, buyer account, agent CRM, admin moderation, analytics, security/operations.
- **Remaining phases:** Agency teams, monetization, production release and operations, scheduled notifications, broad browser E2E, AI/advanced features.
- **Newly recorded issues:** Demo/mock data remains in Agent CRM state/widgets; daily/weekly saved-search cadence and email preference lack delivery infrastructure; agency directory is derived from users rather than a separate agency entity; route links for blogs/tools/legal content lack matching pages in the route inventory; tests are not full real-database/browser end-to-end coverage.
- **Changes in status:** Buyer saved-search UI/API shape mismatch and duplicate profile index declaration are recorded as fixed; no feature implementation was performed while producing this audit document.

### Master verification audit — 2026-11-01

- **Scope and method:** Re-inspected current routes, controllers, services, schemas, guards, environment-variable names, tests, and existing documentation. Did not inspect secret environment values, install dependencies, run migrations, or intentionally invoke mutation endpoints. Current worktree was already broadly modified/untracked before this audit; no application source was changed.
- **Verified now:** Backend unit suite passed (70/70); frontend TypeScript check passed with emit/incremental output disabled. Current route files exist for the admin activity, advertisements, agencies, and reports pages. Source contains substantial marketplace, buyer, CRM, admin, messaging, analytics and location-sharing implementation.
- **Not reverified:** Backend/frontend production builds recorded in the earlier audit; prior Atlas/browser QA described in `QA_REGISTRATION_REPORT.md`; actual user journeys, responsive behavior, admin mutation persistence, and full property-type scenarios.
- **Database boundary:** Direct MongoDB inspection was not performed. `127.0.0.1:27017` did not accept a connection; the local API answered a property list GET, but this response cannot establish database contents or deployed indexes.
- **Important safety finding:** Three `GET /api/v1/properties?limit=1` requests were made as HTTP smoke checks. Subsequent code inspection established that `PropertiesService.findAll()` calls `ensureLegacyAdvertisements()`, which performs `updateOne(..., { upsert: true })` for legacy property rows. These requests may therefore have changed/created advertisement records. The affected records cannot be determined from available evidence. No explicit API mutation was performed; this audit cannot certify that database records were unchanged. A trusted snapshot/database comparison is required before drawing that conclusion.
- **Current system condition:** Advanced prototype/MVP, not verified production-ready. No overall completion percentage is assigned.
- **Priority findings:** P1 public GET persistence side effect; P1 uncertain property-delete cascade/retention behavior; P1 lack of core browser E2E. P2 CRM demo/local state, process-local rate limits, report deduplication race, client-selected analytics visitor identity, absent first-class agency model, monetization and outbound delivery, and dead public links. No P0 was confirmed; this was not a penetration test.
- **Deliverables:** `ESTATEPRO_VERIFICATION_REPORT.md`, `ESTATEPRO_FEATURE_STATUS_MATRIX.md`, `ESTATEPRO_E2E_TEST_PLAN.md`, and `ESTATEPRO_BLOCKERS_AND_NEXT_STEPS.md`.

---

## Maintenance Checklist

- [ ] Update this document after a meaningful feature, schema, API or deployment change.
- [ ] Record evidence and test scope; distinguish mocked/unit tests from integration and E2E.
- [ ] Move a feature to “implemented, focused-tested” only when corresponding focused tests pass.
- [ ] Mark a workflow end-to-end verified only after the actual user journey is exercised.
- [ ] Preserve prior audit entries; append dated updates rather than rewriting history.
- [ ] Re-fetch competitor package sources before making pricing decisions.
- [ ] Never add tokens, passwords, database connection strings, private documents or encryption keys.
