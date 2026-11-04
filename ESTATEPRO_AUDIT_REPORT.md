# EstatePro Existing-Project Audit

**Audit date:** 2026-11-02  
**Scope:** Read-only inspection of `WORKFLOW.md`, the current frontend and backend source, Mongoose schemas, API controllers/services, route guards, manifests, and available test files.  
**Requested product direction:** A unified platform with Property Listings, Client Requirements, and Maintenance & Home Services, initially limited to Bahria Town Lahore, with all three modules free at launch.

## Executive summary

EstatePro is an existing property marketplace with a meaningful amount of connected implementation: public listing search/detail, buyer accounts, agent inventory and advertisements, CRM leads, buyer-agent conversations, admin moderation, reports, analytics, and private-location sharing. The backend has corresponding MongoDB models and role/ownership checks for many of those operations.

This is a **source-code audit, not an end-to-end or production-readiness certification**. No application, test, build, migration, or database command was run; no live API was called; the tagged `backend/.env` was not read. Accordingly, source presence is reported separately from runtime behavior. Previous audit notes and test outcomes in the repository were treated as historical context, not re-executed evidence.

The two proposed modules are not implemented. Client requirement functionality has partial conceptual overlap with saved searches, buyer preferences, and agent CRM leads, but none is a public, buyer-owned requirement workflow. Maintenance & Home Services has no provider, service, request, or booking domain; `maintenanceStaff` is only a property-community feature.

The current product is not restricted to Bahria Town Lahore. Current location values are free text, UI location options include multiple Lahore areas, and search APIs accept general city/area values. A Bahria-only launch needs a deliberate, data-backed location policy rather than an assumption based on the existing copy or demo data.

## Status definitions and audit limits

- **Verified in source code** — the referenced implementation is present in the inspected source. This does not claim that it passed a live user journey.
- **Partially implemented** — a related screen, API, model, or workflow exists, but an important layer, state, or behavior is missing or inconsistent.
- **Not implemented** — no corresponding feature/model/API was found in the inspected source and route/schema inventory.
- **Unable to verify** — source inspection alone cannot establish the runtime, data, deployment, or end-to-end outcome.

Where a feature is source-implemented but has not been exercised end to end, that limitation is stated explicitly. “Verified in source code” must not be read as “production verified.”

## 1. Existing features that are implemented

The following are source-complete or substantially wired features: the frontend has a relevant surface, the backend has a corresponding API, and a persisted model exists where persistence is needed. Their full runtime workflow remains **Unable to verify** in this audit.

| Feature | Status | Source evidence and limits |
|---|---|---|
| Public property discovery | **Verified in source code** | Public home and catalog use API-backed property reads. Catalog controls pass city/area, purpose, type, price, feature, and pagination/sort parameters to the properties API. Evidence: `frontend/src/app/(public)/properties/page.tsx`, `frontend/src/lib/public-properties.ts`, `backend/src/modules/properties/properties.controller.ts`, `backend/src/modules/properties/properties.service.ts`. Runtime results and actual inventory were not checked. |
| Property detail, public projection, and image display | **Verified in source code** | Detail route loads a property through the public API; public projection is shared through `toPublicProperty`. Image upload/storage/ordering/removal APIs and a filesystem storage service exist. Exact location is excluded from ordinary public projection. Evidence: `frontend/src/app/(public)/property/[id]/`, `backend/src/modules/properties/property-location-sharing.utils.ts`, `property-image-storage.service.ts`, and `properties.controller.ts`. Deployed storage durability and all image flows are **Unable to verify**. |
| Property inventory and advertisement lifecycle | **Verified in source code** | Agent-owned property inventory is separate from `PropertyAdvertisement`; agents can create/manage inventory, submit ads, update inventory state, and view their ads. Public listing queries require published properties and published ads. Evidence: `Property` and `PropertyAdvertisement` schemas, `PropertiesController`, and `PropertiesService`. The full state matrix was not executed. |
| Buyer registration and account surfaces | **Verified in source code** | Buyer registration/login, role-guarded buyer pages, profile/preferences, saved properties, saved searches, recommendations, inquiries, and in-app notification pages have API-backed code and persisted models. Evidence: `backend/src/modules/buyer/`, `frontend/src/components/buyer/`, and buyer dashboard routes. User journey and persistence are **Unable to verify**. |
| Agent accounts and CRM | **Verified in source code, with partial UI/data-source coverage** | Agents can manage inventory and advertisements, view backend-backed leads, change lead status, access a conversation inbox, and query persisted property analytics. CRM lead and messaging APIs are persisted. Some dashboard widgets, contacts, and agent notifications remain browser-local/demo-backed; see §2. |
| Admin control plane | **Verified in source code** | Admin login, protected admin routes, user/agent administration, property and ad moderation, reports, statistics, and activity-log screens/services exist. Evidence: `backend/src/modules/admin/`, `frontend/src/app/(dashboard)/admin/`, and `frontend/src/components/admin/`. Admin browser routing, account provisioning, and persisted actions were not exercised. |
| Listing/agent reports | **Verified in source code** | Public `POST /api/v1/reports` and admin list/update routes use `UserReport`; admin review actions can be audited. Abuse behavior and a public-to-admin resolution journey are **Unable to verify**. |
| Property contact and analytics | **Verified in source code** | Public phone/WhatsApp links and event endpoints record property view, call-click, and WhatsApp-click events. Agent analytics aggregates stored events. Clicks do not prove a call, chat, or completed transaction. |
| Exact-location sharing | **Verified in source code** | Private location save/access/share routes, encrypted location data, hashed scoped share tokens, expiry/revocation fields, and recipient checks exist. A real two-account share journey and deployment key configuration are **Unable to verify**. |
| Backend request validation | **Verified in source code** | `main.ts` enables validation with whitelist, transformation, and rejection of unknown DTO fields. Authentication strategy reloads the account and role from the database, and inactive accounts are rejected. This is not a security review or an exhaustive authorization test. |

**End-to-end conclusion — Unable to verify:** This audit did not execute browser journeys or tests. No feature is certified here as fully working across a deployed frontend, API, and database.

### Test evidence observed in the repository

- **Verified in source:** Backend test files cover selected auth/role, admin moderation, buyer search/alerts/service, property messaging, advertisement analytics, image/features, and private-location behavior.
- **Verified in source:** The frontend package manifest has no test script or browser-test framework dependency.
- **Unable to verify:** No test suite was run for this audit. Earlier documents record prior passing runs, but those results were not repeated and do not establish the current worktree's behavior.

## 2. Partially implemented, broken, or inconsistent features

| Finding | Status | Evidence / impact |
|---|---|---|
| Homepage search does not execute the selected search | **Partially implemented** | `frontend/src/components/marketplace/HeroSearch.tsx` collects purpose, society, type, budget, verification, and freshness selections, but its submit handler only scrolls to the `properties` section. It does not navigate with these selections, call the catalog API, or filter the grid. The separate `/properties` catalog has functioning API query code; the homepage form is therefore not equivalent to that search. |
| Verification/freshness claims are not backed by a listing-confirmation workflow | **Partially implemented** | The hero displays “100% Active Availability • 14-Day Confirmed” and offers “Verified Listings Only” / “Freshly Confirmed (14 Days)” controls, but the controls are not passed to results. The `Property` schema has no last-confirmed timestamp or 14-day freshness state. Agent verification exists, but it does not establish a property-availability confirmation. Do not treat the copy as verified inventory evidence. |
| Popular-location statistics are static | **Partially implemented** | `frontend/src/components/marketplace/PopularLocations.tsx` hardcodes listing counts, average prices, and location descriptions. Its location links lead to the generic properties anchor rather than a location-specific result. The figures are not demonstrated to represent current database inventory. |
| Agent CRM mixes persistent and demo/local state | **Partially implemented** | `AgentDashboardDataLoader.tsx` fetches CRM leads, and ads/analytics/inbox have backend calls. However `agent-store.ts` is persisted in browser `localStorage` and seeds ads, contacts, leads, and notifications; `AgentTopBar.tsx` uses mock profile/notifications; calls and contact logs are local; dashboard stat cards explicitly say analytics are not connected. Agents can see sample or per-browser values alongside live records. |
| CRM lead fields are not faithfully persisted/mapped | **Partially implemented** | `LeadPipeline.tsx` offers Buy/Rent, property type, min/max budget, society, and notes, but quick-add sends only a composed `propertyTitle`, `interestedCity`, and notes; it does not send the displayed budget range or a structured purpose/type. Existing leads are mapped to `requirement: "Buy"` and one stored `budget` is used as both minimum and maximum. `lost` is displayed as `Closed`, and selecting “Closed” writes `closed_won`; there is no distinct Lost stage in that UI. This can misrepresent requirements and lead outcomes. |
| Agent-specific notification/contact features are not all server-backed | **Partially implemented** | Agent conversation messages use the backend inbox, but agent top-bar notifications and the Calls & Messages activity list use the browser-persisted store. Public call/WhatsApp event analytics only record clicks, not inbound call/message content. |
| Saved-search frequency and email preference do not deliver alerts | **Partially implemented** | Saved searches support instant/daily/weekly/off values and buyer preferences include email. No scheduler, worker, queue, email, SMS, or push integration was found in backend source or backend dependencies. In-app notification records exist, but cadence/delivery is not implemented. |
| Agent verification does not appear to gate property-management access | **Partially implemented / policy unclear** | Registration defaults agent verification to pending. `JwtStrategy` rejects inactive accounts, while property/CRM endpoints authorize by role; the inspected guards do not require `verificationStatus === verified`. Active but unverified agents therefore appear eligible to use agent endpoints. Whether that is intended is **Unable to verify**; the product must decide whether verification affects posting, publication, or only a badge. |
| Admin “pending agents” count is broader than pending verification | **Partially implemented** | `AdminService.getAdminStats()` computes `pendingAgents` as total agents minus verified agents. This includes any non-verified status, not only `pending_verification`; the admin agent list separately models pending, unverified, and rejected states. The overview label can misstate the review queue. |
| Application identity and copy are inconsistent | **Partially implemented** | Source includes EstatePro, PRM, and legacy “ZameenConnect” copy, plus Lahore-wide and Pakistan-wide language. This is not a backend data defect, but creates confusing launch branding and geographic expectations. |
| Legal and other navigation targets require confirmation | **Partially implemented** | Footer links include `/privacy`, `/terms`, and `/agent/verification`, which are not present in the inspected App Router route inventory. The audit did not click these links; their runtime destination is **Unable to verify**. |
| App-level responsiveness and accessibility are not certified | **Unable to verify** | Responsive classes and accessible labels exist in source, but no browser, keyboard, screen-reader, or viewport checks were run. |

### Current-source check against older workflow notes

- **Status: Verified in current source; historical behavior Unable to verify.** `WORKFLOW.md` and `ESTATEPRO_VERIFICATION_REPORT.md` describe a public `findAll()` path that called `ensureLegacyAdvertisements()` and performed upserts. The current inspected `PropertiesService.findAll()` builds a filter, reads active ads/properties, and counts results; no `ensureLegacyAdvertisements` implementation or call was found in the inspected properties module. This audit did not call the endpoint or inspect the database. The old note may describe an earlier source state; it does not establish current behavior or historical database impact.
- **Status: Verified in current source; runtime outcome Unable to verify.** Older notes describe property hard-delete cleanup as incomplete. The current `AdminService.deleteProperty()` uses a transaction, refuses deletion when linked leads/conversations exist, removes saved-property links and shares, unlinks notifications, removes the ad/property, retains analytics/reports, and logs the action. The delete path does not show filesystem-image cleanup, so managed image files may be orphaned after hard deletion. Replica-set transaction behavior and actual data cleanup were not exercised.

## 3. Existing user roles and permissions

The persisted `UserRole` enum contains **buyer**, **agent**, and **admin** only. Agency, service-provider, and maintenance-technician roles do not exist.

| Role | Source-backed capabilities | Boundaries and caveats |
|---|---|---|
| Buyer | Public browsing; authenticated buyer profile/preferences, saved properties/searches, recommendations, inquiries, buyer-owned conversation/messages, and notifications. Buyer routes use `JwtAuthGuard`, `RolesGuard`, and `@Roles(buyer)`. | Buyer operations are intended to scope records by authenticated user ID. No buyer-authored public Client Requirement entity or service-booking capability exists. |
| Agent | Create/manage own property inventory and images; submit/manage ads; view/manage agent leads; use agent conversations; view property analytics/activity; manage private location and recipient shares. | Backend roles are authoritative. Ownership checks exist in property and CRM paths. Some agent UI state is local/demo. Verification status is persisted, but the inspected access guards primarily require an active account and agent role; verification gating policy is unclear. |
| Admin | Dedicated configured-credential login; admin APIs for agent verification/account status, property/ad moderation, reports, statistics, audit log, and controlled delete actions. | Public self-registration disallows admin role; admin login also expects a matching admin user in the database. Admin mutation throttling is in-process; production scaling behavior is **Unable to verify**. |
| Agency/team | No distinct role or team permission model. | `agencyName` is a string on `User`; it is not an agency account or membership grant. |

`AgentAccessGuard` allows both agent and admin for agent pages, and several backend property/CRM routes allow both roles. Backend authorization remains the actual security boundary; UI guards alone are not permissions.

## 4. Existing database models and reusable APIs

### Persisted models found

| Model/schema | Current responsibility | Reuse potential / limitation |
|---|---|---|
| `User` | Identity, role, phone, optional agency name/city, agent verification and account status. | Reuse authentication and account identity; it is not a first-class agency or service-provider profile. |
| `Property` | Owner, type, purpose, price, area, free-text city/area, features, images, inventory/moderation/archive state, and private location. | Keep property inventory semantics specific to real estate; do not turn it into a maintenance service/request record. |
| `PropertyAdvertisement` | One ad per property, with review/publication/pause/end state and moderation metadata. | Reuse the listing publication concept only for property ads; it is not an ad/booking model for the other modules. |
| `BuyerProfile` | Buyer preferences: city/locations, budget min/max, property types/purposes, and in-app/email preference booleans. | Relevant to requirement defaults/matching; preferences are not a posted or agent-visible requirement. |
| `SavedProperty` | Buyer-to-property link, unique by buyer and property. | Existing buyer dashboard primitive. |
| `SavedSearch` | Buyer, filter object, frequency, enabled state, and last-alert timestamp. | Closest existing search/matching primitive; no delivery worker and not a public request. |
| `BuyerNotification` | Buyer-scoped in-app notification with type, property/search/conversation reference, dedupe key, and read time. | Can inform new module notifications, but current references and event types are property/buyer focused. |
| `Lead` | Agent-owned contact and CRM pipeline record, optionally linked to property/ad/conversation and buyer identity. Includes a single budget and interested city. | Reuse for follow-up after a buyer responds, not as the authoritative buyer-owned requirement or provider service request. |
| `PropertyConversation` / `PropertyMessage` | Property/ad-bound conversation with visitor or buyer identity, agent ownership, messages, unread counts, and idempotency key. | Existing messaging UX/service may inform new communication. Its schema and access logic are specifically property/agent oriented. |
| `PropertyAnalyticsEvent` / `PropertyAnalyticsDeduplication` | Property view, call-click, WhatsApp-click counts and deduplication. | Real-estate analytics only; not service bookings or completed-contact evidence. |
| `PropertyLocationShare` | Property/agent/recipient-scoped share token hash, expiry, revocation. | Not a general provider/location or appointment model. |
| `UserReport` | Public reports against property, ad, or agent, plus admin status/internal notes. | Moderation primitives can be extended by explicit target types/policies; currently no requirement/provider/service categories. |
| `AdminActivity` | Admin action audit fields: actor, entity/action, status, reason, metadata, timestamp. | Reusable administrative audit concept, but actions on new entities must be explicitly wired. |

No separate Client Requirement, service provider, service catalog, maintenance request, booking, appointment, quote, review, payment, subscription, or agency collection/schema was found.

### Reusable API surface

- **Authentication and identity:** `POST /api/v1/auth/register`, `/login`, `/admin-login`; authenticated `GET /api/v1/users/profile`.
- **Marketplace:** `GET /api/v1/properties`, `GET /api/v1/properties/:id`; public view/call/WhatsApp event posts; public `POST /api/v1/reports`.
- **Agent property management:** property create/update/archive/restore, inventory status, image upload/order/removal, own listings/ads/activity/analytics, ad submission/status, private-location management and scoped location-share APIs.
- **Buyer account:** `/api/v1/buyer/overview`, profile/preferences, saved properties, saved-search CRUD, recommendations, inquiries, buyer conversation/messages, notifications/read/read-all.
- **Agent CRM:** `/api/v1/crm/leads`, lead status, activity, and stats.
- **Messaging:** visitor session/conversation/message endpoints and agent conversation/unread/message endpoints under `/api/v1/messages`.
- **Admin:** `/api/v1/admin/stats`, agents and agent actions, agencies (derived view), properties/moderation, advertisements/actions, reports, and activity.

These are useful building blocks for authentication, profile defaults, location/type vocabulary, buyer notifications, admin audit, and conversation presentation. They are not already complete APIs for either proposed module.

## 5. Existing buyer, agent, agency, and admin workflows

### Buyer workflow

1. Register as buyer or sign in; frontend stores the access token in browser `localStorage`.
2. Browse public listings; save/unsave properties and search filters.
3. Manage buyer preferences and in-app notification settings.
4. Start a buyer inquiry for a property; backend creates/links a conversation and CRM lead; buyer reads/replies in the buyer dashboard.
5. View recommendations based on persisted property/preferences/search data.

**Status:** Source-connected buyer workflow. Browser-to-database registration, saved-search changes, and buyer-agent chat are **Unable to verify** here. Requirements are not part of this flow.

### Agent workflow

1. Register as an agent; new agents are assigned pending verification by default.
2. Create private inventory or submit a property/ad for review; upload and manage listing images.
3. View own listings and ads; update inventory availability; communicate with buyers in the conversation inbox.
4. View/manage leads and pipeline status; view analytics/activity; optionally share exact property location with a specified buyer.

**Status:** Inventory, ads, CRM, and messaging have backend paths. Some dashboard metrics, contacts, and notifications use demo/local state. Actual agent verification gating is **Unable to verify** as a business policy and is not apparent as a requirement in the inspected role guards.

### Agency workflow

**Status: Partially implemented.** Agents can enter an agency-name string; admin can group agents by that string in a directory. No agency owner, tenant, invitation, membership, shared listing ownership, agency verification, or agency permissions exist. The directory is a grouped user view, not agency management.

### Admin workflow

1. Authenticate through the dedicated admin login using configured credentials and a database user with admin role.
2. Review agent records and verification/account state.
3. Review properties and ads; take moderation actions with reason/confirmation controls where required.
4. Review public reports, platform counts, and administrative activity.
5. Use protected deletion only under implemented preconditions; admin hard deletion of properties requires prior archive/removal and retention checks.

**Status:** APIs, database records, and pages are present. Full direct-route, authorization, action-persistence, and production credential behavior are **Unable to verify**.

## 6. Listing approval and verification processes

- **Property state:** `Property.status` includes draft, pending approval, published, rejected, and inventory-related legacy values; separate `inventoryStatus` covers available/sold/rented/reserved/unavailable.
- **Advertisement state:** `PropertyAdvertisement.status` includes draft, pending review, published, rejected, paused, ended, and removed. The ad has a unique property reference.
- **Submission:** Agent creates a property; ordinary submission creates a pending property/ad relationship, while inventory-only submission creates private inventory. Agents can submit an existing property as an ad.
- **Approval:** Admin has property-moderation and advertisement-action workflows. Property moderation syncs the linked ad; ad publication validates that the property exists, is available, active, and belongs to the ad's agent.
- **Public eligibility:** Property listing results require published property state and a published linked ad. Detail also supports an ended ad for a previously published but unavailable property.
- **Agent verification:** `User` stores verification status, reviewer, timestamps, and notes; admin can verify, unverify, or reject verification. No document upload/evidence-review model was found. Inspected listing/CRM guards do not require verified status.

**Status:** Core states and moderation paths are **Verified in source code**; state transitions across real data and all UI surfaces are **Unable to verify**. The dual property/ad approval state requires careful regression testing because both are displayed and counted.

## 7. Messaging, notifications, and contact functionality

- **Property chat:** Anonymous users can request a visitor session and start a conversation for an eligible published property; authenticated buyers use buyer inquiry/conversation APIs; agents access their conversation inbox and reply. Conversation/message/lead records are persisted.
- **Message safeguards:** Visitor hashes, conversation ownership, bounded message size, and message idempotency are represented in code. The exact deployed rate-limiting behavior is **Unable to verify**.
- **Notifications:** Buyer notifications persist in `BuyerNotification`, including read state. Some message/property events connect to the notification service. Email preference is stored but no email delivery service was found. No push or SMS delivery was found.
- **Saved-search alerts:** Frequency settings exist, but no scheduler/queue/worker was found; cadence-based delivery is not implemented.
- **Calls and WhatsApp:** Public property surfaces initiate external phone/WhatsApp actions and track click events. This is not phone-call recording or WhatsApp inbox integration. Agent contact logs/notifications on the Calls & Messages page are local/demo state, while the property conversation inbox is backend-backed.
- **Service communications:** No service-provider inquiry, quotation, or booking conversation exists.

**Status:** Property messaging and buyer notifications are **Verified in source code**; full message round-trip/read-state behavior is **Unable to verify**. Outbound email/SMS/push and service messaging are **Not implemented**.

## 8. UI navigation and dashboard structure

- **Public:** Home, property catalog/detail, post-property, and shared-location routes. Marketplace navigation includes listing discovery, society/location anchors, and CTAs.
- **Buyer dashboard:** Overview, saved properties, saved searches, inquiries, notifications, profile/preferences. A buyer-role guard wraps the dashboard.
- **Agent dashboard:** Overview, My Ads, Leads, Calls & Messages, Listings, add-property and listing edit routes. An agent-role guard wraps the dashboard. The Calls & Messages screen combines a backend chat inbox with local contact history.
- **Admin dashboard:** Overview, agent approvals/profile, property moderation, agency directory, advertisements, reports, and activity log. Admin layout/guard is separate; middleware routes admin host/path traffic.
- **Not present as top-level navigation:** Client Requirements and Maintenance & Home Services; no service-provider or requirement dashboard exists.

**Status:** Existing routes and navigation are **Verified in source code**. Route behavior on deployed hosts, browser refresh, mobile navigation, and every destination are **Unable to verify**.

## 9. Potential integration points for Client Requirements

### Existing reusable pieces

- **Buyer identity and guarded buyer dashboard:** Reuse `User` authentication and buyer access controls.
- **BuyerProfile:** Can prefill city/locations, budget range, property types, and purposes.
- **SavedSearch:** Can inform matching/filter behavior, but it is a private saved filter, not an explicit public requirement.
- **Property search vocabulary:** Existing property type, sale/rent purpose, area/price, city, and area filters provide a starting point for matching.
- **BuyerNotification:** Could surface responses/matches after explicitly adding requirement-related event types and links.
- **Conversation UI:** Existing property conversation experience may inform a reply UX, but its model is bound to property/ad/agent and needs explicit support for requirement context.
- **Lead:** Suitable for an agent follow-up created after a buyer responds; it should not be used as the canonical public requirement record.
- **Admin reports/activity:** Existing moderation concepts may be extended to requirement review and audit.

### Missing requirement-specific capability

**Status: Not implemented.** There is no buyer-authored requirement create/edit/list/close flow, requirement schema, public/agent discovery API, response/offer model, multiple desired criteria, expiry/visibility/moderation state, or requirement dashboard/navigation. Existing `Lead` has a single optional budget and interested city, and current CRM UI does not faithfully persist its own richer form fields.

### Recommended domain boundary

Create a separate requirement entity and API workflow, owned by a buyer and linked to buyer identity. Define structured purpose/type/location/price range/area/feature fields, visibility and contact-consent rules, lifecycle (for example draft/active/paused/fulfilled/expired/removed), matching and agent response semantics before using the existing inbox. Keep any CRM follow-up linked to the requirement rather than substituting a lead for the buyer's request.

## 10. Potential integration points for Maintenance & Home Services

### Existing reusable pieces

- **User authentication and admin roles/guards** can support secure onboarding and access.
- **User phone/city and agency grouping** provide limited profile precedent, but no provider-quality data.
- **Admin report/activity patterns** can inform provider/service moderation and auditing.
- **Buyer dashboard, in-app notifications, and conversation UI** can inform service request updates after adding service-specific references and access rules.
- **Property location vocabulary** may be useful for selecting a service area, but it is currently free-text and should not be used as a provider's service-coverage model.

### Missing service capability

**Status: Not implemented.** No service-provider profile/role, trade/category catalog, service-area/availability model, maintenance request, booking/appointment, quote, assignment, cancellation/completion lifecycle, service review, or admin provider-verification workflow was found.

`maintenanceStaff` appears as one selectable `Property.features.community` amenity. It describes a property/community feature; it is not a maintenance offering, provider, or bookable service.

### Recommended domain boundary

Treat service providers, services, and bookings as a separate domain. Decide whether providers are a new account role or a profile/capability attached to an existing account; define verification, service categories, coverage in Bahria Town, availability, free service request semantics, customer/provider contact privacy, cancellation/dispute/report handling, and service status transitions before implementing the UI.

## 11. Missing functionality for the Bahria Town Lahore launch

| Gap | Status | Why launch needs it |
|---|---|---|
| Enforced Bahria Town Lahore launch boundary | **Not implemented** | Property city/area and public search are general/free-text. Agent forms and location lists include multiple Lahore societies; the homepage promotes Lahore broadly. Existing demo references to Bahria do not constrain actual listings. |
| Canonical Bahria locality hierarchy | **Not implemented** | No authoritative structured society/sector/block location model or allowlist was found. Free-text variants can fragment search, matching, moderation, and service coverage. |
| Client Requirements module | **Not implemented** | No schema, API, dashboard/navigation, matching response lifecycle, or requirement moderation exists. |
| Maintenance & Home Services module | **Not implemented** | No service-provider/service/booking models, APIs, dashboards, verification, or fulfillment workflow exists. |
| Admin review policies for requirements/providers/services | **Not implemented** | Current admin screens/actions concern agents, real-estate properties/ads, reports, and audits only. |
| Explicit “free at launch” entitlement/communication policy | **Partially implemented** | No billing/subscription/payment implementation was found, which is consistent with a free launch. However, the product has not been shown to expose a unified three-module free policy, quotas, paid upsells, or clear user-facing terms. Billing is not required if the approved launch is genuinely free. |
| Cross-module moderation, reporting, and privacy rules | **Partially implemented** | Existing report/admin primitives cover property/ad/agent only. Requirements and services need target-specific abuse handling, contact visibility, retention, and audit decisions. |
| Consistent dashboard/navigation for all three modules | **Not implemented** | Current buyer, agent, and admin navigation has no requirements or services area. A provider role/workspace is also absent. |
| Real launch data and end-to-end acceptance | **Unable to verify** | No live records, browser flows, deployment, or database were inspected. Bahria listing density, provider availability, local user onboarding, and all three free workflows are unverified. |
| Trust and freshness claims | **Partially implemented** | Agent verification exists, but no verification-document workflow was found; 14-day property freshness controls/copy are not backed by confirmation fields or behavior. |
| Agent demo-state cleanup/labeling | **Partially implemented** | Browser-local CRM and notification/contact data can be confused with real launch activity. |

## 12. Risks to existing Property Listings functionality

| Risk | Status | Risk control / roadmap implication |
|---|---|---|
| Reusing `Property` for non-property services | **Verified in source code; risk assessment** | `Property` is referenced by public search, buyer saved data/recommendations, property conversations, analytics, location sharing, ad moderation, and admin actions. Do not overload this schema for services or requirements. |
| Changing property status semantics | **Verified in source code; risk assessment** | Property state, inventory status, and ad state interact. A change to publication, availability, or verification can affect public visibility, buyer saves/recommendations, notifications, and admin queues. Add explicit state-transition regression coverage. |
| Global Bahria-only filtering could unexpectedly break existing inventory | **Verified in source code; risk assessment** | Current APIs and UI support non-Bahria locations. If the Bahria-only rule is a launch configuration, scope it deliberately (for example by enabled launch area) instead of silently redefining all existing records or search behavior. |
| Using `Lead` as a buyer requirement would blur ownership and workflow | **Verified in source code; risk assessment** | Leads are agent-owned and have CRM pipeline semantics. Reusing them as a public buyer request would compromise user ownership, lifecycle, moderation, and data meaning. |
| Reusing property chat without extending authorization may expose or misroute conversations | **Verified in source code; risk assessment** | Existing conversation permissions are tied to property, agent, buyer/visitor. Requirement and service threads need explicit entity context and ownership checks. |
| Existing CRM demo state may pollute launch metrics and user trust | **Verified in source code; risk assessment** | The local store seeds persisted browser state and several widgets render demo values. Ensure new module totals and existing agent metrics distinguish authoritative backend records from sample/local data. |
| Legacy free-text locations create inconsistent search/matching | **Verified in source code; risk assessment** | Current location fields are strings and queries are regex-based. Bahria blocks/sectors should be normalized through a deliberate taxonomy while preserving and mapping old location values safely. |
| Hard deletion can leave filesystem images behind | **Partially implemented** | Current admin hard-delete transaction removes database references and records an image-retention count, but no storage cleanup call is visible in that path. Define whether files are retained or cleaned before changing deletion/retention behavior. |
| Current audit evidence does not establish data/deployment health | **Unable to verify** | No database, environment values, runtime behavior, index state, browser session, or production hosting was accessed. Do not treat this report as evidence of live data integrity or production security. |

## Recommended implementation roadmap

The sequence below is a recommendation, not an implementation performed by this audit.

### Phase 0 — Product and launch decisions

**Dependencies:** None.

- Define the canonical Bahria Town Lahore area hierarchy and what qualifies as an in-scope property/provider.
- Decide whether the Bahria boundary applies to only new modules or to the existing marketplace at launch; preserve an explicit rollout boundary.
- Define free-at-launch behavior, quotas (if any), and the promise that there is no charge for each module.
- Decide who may post/answer requirements and whether agent verification gates posting, answering, or publication.
- Define provider account eligibility, verification evidence, service booking expectations, contact/privacy consent, report handling, and record-retention rules.

**Exit criteria:** Approved module workflows, roles, location taxonomy, moderation rules, and free-launch terms.

### Phase 1 — Protect and baseline current property behavior

**Dependencies:** Phase 0 location and rollout decisions.

- Record current listing/search/moderation behavior with synthetic data in an isolated QA environment.
- Resolve or explicitly accept the homepage search no-op, misleading freshness/verification copy, and static location metrics.
- Separate/label/remove demo CRM values from production-facing agent metrics, contacts, and notifications.
- Confirm lead field semantics (purpose/type/budget range/lost state) before expanding CRM use.
- Establish regression cases for property/ad/inventory transitions, public visibility, buyer saves/searches, agent ownership, admin moderation, and archived/removed data.

**Exit criteria:** An agreed property-regression baseline; no unreviewed assumption that a new module may change property lifecycle or shared dashboards.

### Phase 2 — Shared domain, authorization, and data foundation

**Dependencies:** Phase 0 decisions; Phase 1 baseline.

- Design distinct persisted entities and API ownership boundaries for buyer requirements, service providers/services, and service bookings.
- Extend role/capability checks and admin moderation intentionally; do not grant access based on UI-only navigation.
- Define canonical Bahria locality references and safe handling/mapping for existing free-text property locations.
- Define event/notification/report/audit links for each new entity and retention rules before creating indexes or changing shared models.
- Specify how any requirement/service conversation will be authorized without breaking existing property conversations.

**Exit criteria:** Reviewed schema/API/auth design, lifecycle diagrams, index and migration plan, privacy policy, and tests for role/ownership boundaries.

### Phase 3 — Client Requirements

**Dependencies:** Phase 2 identity, locality, permissions, and domain foundation.

- Implement buyer-owned create/edit/pause/fulfill/expire behavior and public/agent visibility according to approved policy.
- Implement structured criteria and matching against eligible, in-scope published inventory.
- Define how agents respond, how buyers consent to contact, and how replies link to CRM follow-up and existing conversations.
- Add buyer dashboard/navigation, notifications, and admin report/moderation controls.

**Exit criteria:** Buyer-to-agent requirement response journey persists correctly, respects ownership/visibility, and does not alter property publication behavior.

### Phase 4 — Maintenance & Home Services

**Dependencies:** Phase 2 identity, locality, permissions, and domain foundation. Can proceed independently of Phase 3 once shared contracts are stable.

- Implement provider onboarding/verification, service catalog, service-area coverage and availability.
- Implement customer service request/booking lifecycle, provider response/quote, scheduling, cancellation/completion, and report/dispute policies.
- Add a dedicated customer/provider dashboard and admin moderation tools.
- Use in-app notifications and messaging only after service-specific access and entity links are defined. No payment integration is needed for an approved free launch.

**Exit criteria:** A synthetic customer can submit an in-scope service request and an authorized provider can accept/respond/complete it with auditable state and privacy controls.

### Phase 5 — Unified navigation, dashboard, and launch presentation

**Dependencies:** Phases 3 and 4 APIs/UI contracts; Phase 0 brand/location/free-launch decisions.

- Add consistent entry points for Listings, Requirements, and Services while preserving existing buyer, agent, and admin navigation.
- Make role-appropriate module access explicit; add provider-specific pages or capability controls.
- Present only live, sourced counts and clearly distinguish demo/sample values from real activity.
- Replace broad location/copy claims with verified Bahria-specific launch content and accurate freshness/verification language.

**Exit criteria:** Every visible module entry reaches a real implemented workflow; navigation, labels, counts, and location scope match backend behavior.

### Phase 6 — QA and controlled rollout

**Dependencies:** Phases 0–5; isolated QA environment and synthetic users/providers/records.

- Execute browser-based end-to-end tests for anonymous, buyer, agent, provider, and admin personas.
- Test unauthorized cross-user access, location boundaries, duplicate/retried submissions, moderation, lifecycle edges, and notification behavior.
- Run property regression cases against existing listing/search/saved-property/chat/admin behavior before enabling new modules.
- Validate mobile/desktop accessibility, dead links, support/legal content, production configuration, backups, logs, and incident handling.
- Release behind a controlled launch gate, observe metrics and support issues, and widen availability only after acceptance criteria pass.

**Exit criteria:** Recorded end-to-end evidence for all three free modules and proof that existing property workflows continue to meet the agreed baseline.

## Audit actions and non-actions

- **Performed:** Read source and documentation, inspected actual frontend routes/components, backend controllers/services/guards, schema definitions, package manifests, and existing backend test files.
- **Not performed:** No code or project-structure edits, no test execution, no npm/build/migration/database commands, no database access, no live API calls, and no secret environment-file inspection.
- **Repository state:** The worktree already contained staged/modified project files before this requested report was created. This audit does not attribute those changes to the report.
