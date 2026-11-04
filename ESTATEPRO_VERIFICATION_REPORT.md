# EstatePro Master System Verification Report

**Audit date:** 2026-11-01
**Scope:** Read-only source/schema/API/test inspection plus isolated unit tests and frontend type-check. No feature work was performed.
**Repository state:** The worktree was already extensively modified and contained untracked files before this audit. Findings describe the current worktree; those changes are not attributed to this audit.

## Executive Assessment

EstatePro is an advanced prototype with meaningful marketplace, buyer-account, agent CRM, moderation, messaging, and analytics implementation. It is **not verified as production-ready**. Backend tests and frontend type-check pass, but there is no frontend/browser E2E suite, direct database inspection was unavailable, and actual account-to-account workflows were not exercised.

### Critical audit limitation

Three read-only HTTP requests were made to `GET /api/v1/properties?limit=1` (two against the backend and one through the frontend proxy). Subsequent source inspection established that this public GET calls `ensureLegacyAdvertisements()`, which performs an upsert for eligible legacy properties. Therefore, the smoke requests were **not guaranteed read-only**. The requests returned HTTP 200, but direct database access was unavailable and the audit cannot establish whether any document was inserted or changed. No explicit POST/PUT/PATCH/DELETE or admin mutation was issued. Do not treat this audit as proof that the database remained unchanged; a separate authorized before/after database review is required to establish impact.

No source implementation was changed during this audit. Unit tests wrote only to test-created temporary directories and removed those directories through test cleanup.

## Architecture and Route Inventory

- **Frontend:** Next.js App Router 15.1.7, React 19, TypeScript, Tailwind CSS 4. Routes are under `frontend/src/app`.
- **Backend:** NestJS 11 REST API, class-validator/class-transformer, Passport/JWT and Mongoose 8. Backend entry point is `backend/src/main.ts`; global prefix is `/api/v1`.
- **Database:** MongoDB through Mongoose. Current models are defined under `backend/src/modules/**/schemas`.
- **API proxy:** `frontend/next.config.ts` rewrites `/api/v1/*` to the configured API target; the default is local port 5000.
- **Authentication:** Browser token storage and API attachment are implemented in `frontend/src/lib/api-client.ts`; backend JWT validation reloads the account and role.

### App Router routes found

- Public: `/`, `/properties`, `/property/[id]`, `/post-property`, `/shared-location`
- Authentication: `/login`, `/admin-login`, `/register`, `/agent/register`
- Buyer: `/buyer`, `/buyer/inquiries`, `/buyer/notifications`, `/buyer/profile`, `/buyer/saved-properties`, `/buyer/saved-searches`
- Agent: `/agent`, `/agent/add-property`, `/agent/ads`, `/agent/calls`, `/agent/leads`, `/agent/listings`, `/agent/listings/[id]/edit`
- Admin: `/admin`, `/admin/activity`, `/admin/advertisements`, `/admin/agencies`, `/admin/agents`, `/admin/agents/[id]`, `/admin/properties`, `/admin/reports`

The four recently requested admin routes have page files in the current worktree. Source inspection does not prove browser navigation, host middleware, authentication redirects, or refresh behavior. Pages linked by the public UI but not present in the route inventory include `/privacy`, `/terms`, and `/agent/verification`. Blogs, tools, and a public agency directory were not found as pages.

## Module Findings

### Public Marketplace — PARTIALLY COMPLETE

- The home, search, property detail, image/gallery, report form, and shared-location surfaces exist.
- Public property reads use the `/api/v1/properties` controller and `PropertiesService`; public results are projected through `toPublicProperty`.
- Listing and property detail display paths are backed by property/ad records. A static Lahore society list is used for discovery/navigation; `MOCK_PROPERTIES` exists but is not used by the current public listing surfaces found.
- Property/ad publication rules exist in backend filtering and tests. A full real-property-type matrix and browser check were not run.
- **P1 finding:** `PropertiesService.findAll()` calls `ensureLegacyAdvertisements()`, which upserts advertisement documents from property rows during a public GET. The detail flow also calls it through `getPublishedAdvertisement()`. This is a persistence side effect on a read path.
- Footer links to pages absent from the route inventory and fragment links may not resolve from non-home pages. The navbar has no functioning agencies/tools/blogs pages in the route inventory.
- Responsive source classes and labeled controls exist, but no viewport/browser or assistive-technology test was run.

### Buyer Account — PARTIALLY COMPLETE

- Registration/login, buyer profile, saved properties/searches, inquiries, notifications, and recommendations have UI and guarded API surfaces.
- Buyer API routes are in `backend/src/modules/buyer/buyer.controller.ts`; records include `BuyerProfile`, `SavedProperty`, `SavedSearch`, and `BuyerNotification`.
- Buyer data is scoped by authenticated buyer ID in service methods. Conversation access also checks conversation ownership.
- Tests cover DTO validation, saved-search filter handling, saved-property scoping, notifications, and inquiry/messaging service behavior.
- No complete buyer registration-to-inquiry browser flow was run. The local API smoke test did not use an authenticated buyer endpoint.
- Saved-search cadence and email preference values do not demonstrate scheduled or email delivery; no scheduler or outbound mail integration was found.

### Agent CRM — PARTIALLY COMPLETE

- Agent registration/access, inventory, listing images, ads, leads, conversations, analytics, and exact-location sharing have UI and backend implementations.
- Relevant API surfaces include `/api/v1/properties`, `/api/v1/crm/leads`, `/api/v1/crm/activity`, `/api/v1/crm/stats`, `/api/v1/messages/agent/*`, and `/api/v1/properties/agent/analytics`.
- Schemas include `Property`, `PropertyAdvertisement`, `Lead`, `PropertyConversation`, `PropertyMessage`, `PropertyAnalyticsEvent`, and `PropertyLocationShare`.
- Backend tests cover ownership checks, property/ad linking, image validation/storage, message access and location privacy.
- Demo/local data remains connected to rendered CRM surfaces: `frontend/src/lib/agent-store.ts`, `frontend/src/lib/agent-dashboard-mock-data.ts`, `AgentTopBar.tsx`, `AgentDashboardWidgets.tsx`, and `LeadPipeline.tsx`. Ads, calls/contacts, profile/notification elements or metrics using these sources must not be represented as MongoDB-persisted without further verification.
- Full browser CRM persistence, follow-up, and buyer-agent round trips remain unverified.

### Property and Advertisement Lifecycle — PARTIALLY COMPLETE

- `Property` and `PropertyAdvertisement` are separate schemas. The advertisement schema has a unique index on `propertyId`; inventory and ad statuses are represented separately.
- Agent submission links an existing property to an ad and tests verify a pending ad is created without a second property.
- Admin moderation updates linked property/ad states; tests cover pending-state transitions and synchronization.
- Inventory status changes can end active/pending/paused ads, and the available-state path maps the property back to the existing ad state.
- Public visibility and linked lifecycle have focused unit tests, but no end-to-end status matrix against stored records was run.
- Property hard deletion removes the property, its ad, analytics, and eligible managed image files. No cascade for linked leads, conversations/messages, location shares, saved-property links, or notifications was found in the deletion method. Orphan/reference behavior needs an explicit retention/deletion policy.

### Admin Portal — PARTIALLY COMPLETE

- Current routes exist for overview, agents, agent detail, property moderation, agencies, advertisements, reports, and activity.
- `AdminAccessGuard` calls `/api/v1/users/profile`; backend admin routes use JWT and admin-role guards. Admin login is a dedicated configured-credential flow and requires a matching active admin identity.
- Service/controller actions cover agent verification/account status, property moderation, advertisement actions, reports, activity, and statistics.
- Backend tests cover admin login and selected moderation behavior. No admin browser route, permission matrix, mutation persistence, or refresh test was run.
- Agency listing is a grouped view of `User.agencyName`, not a first-class agency system.

### Messaging and CRM Communication — PARTIALLY COMPLETE

- Public visitor-session/conversation routes and authenticated buyer/agent message routes exist.
- Message service uses visitor-session hashing, ownership checks, limits, and idempotency keys; conversation records can link to leads and property/ad records.
- Backend tests verify selected ownership, conversation reuse, and lead linkage.
- No live browser messages were sent during this audit. Read/unread UI behavior, cross-account delivery, and notification receipt remain unverified.
- Visitor-session throttling is in-process; it is not coordinated across multiple service instances.

### Analytics — PARTIALLY COMPLETE

- Event records are defined for property views, call clicks, and WhatsApp clicks. Agent aggregation reads persisted events.
- Focused tests cover event eligibility, deduplication, bot rejection, and aggregation.
- A call-click or WhatsApp-click event measures a click, not a completed call or conversation.
- The client supplies a UUID used to form the visitor hash. A client can rotate that value; unique-reach and event-rate interpretations therefore need stronger identity/rate-limit design and validation.
- `DevelopmentAnalyticsModule` returns synthetic, explicitly labeled samples only when development demo mode is enabled. It is not production analytics.

### Agencies — PARTIALLY COMPLETE / MISSING TEAM SYSTEM

- Admin directory groups agent `User` records by `agencyName`.
- No standalone `Agency` schema, agency registration/profile, membership/roles, shared inventory, agency dashboard, or agency billing model was found.
- The existing directory should not be described as complete agency management.

### Monetization — MISSING

- No plan, subscription, invoice, payment transaction, payment gateway, webhook, renewal, expiry, or revenue model was found in the inspected manifests/source.
- Public competitor package information documented in the prior `WORKFLOW.md` audit is a dated research snapshot, not evidence of EstatePro billing.

### AI and Advanced Features — PARTIALLY COMPLETE / MISSING

- Buyer recommendations are deterministic filtering/ranking over profile/search data, not a machine-learning provider integration.
- CRM matching includes a client-side heuristic; the implementation is not calibrated or evaluated as a probability.
- No generative AI, external model/provider, AI usage record, trained fraud model, or valuation service was found in the inspected source.

## Database and Data Integrity

### Models observed in source

`User`, `Property`, `PropertyAdvertisement`, `Lead`, `PropertyConversation`, `PropertyMessage`, `BuyerProfile`, `SavedProperty`, `SavedSearch`, `BuyerNotification`, `PropertyAnalyticsEvent`, `PropertyLocationShare`, `UserReport`, and `AdminActivity`.

The main relationships are via Mongoose ObjectId references: property→agent; ad→property/agent; lead→agent and optional property/ad/conversation/buyer; conversation→property/ad/agent and optional buyer/lead; buyer-owned entities→user; analytics→property/ad/agent; report/activity→target/admin.

### Verification boundary

- `127.0.0.1:27017` did not accept a TCP connection during this audit.
- Backend API ports 5000 and frontend proxy port 3000 responded to the property-listing GET with HTTP 200 and a success envelope containing a one-item array.
- Because the GET has a legacy-ad upsert side effect, this is only an HTTP/payload smoke result, **not a read-only database verification**.
- No direct database client/read-only query was performed; no credentials or environment secret values were inspected. Therefore actual collections, current record relationships, indexes deployed in a live database, orphaned rows, and database change impact are **BLOCKED**.
- An older `QA_REGISTRATION_REPORT.md` describes a separate previous Atlas QA exercise. Its database/browser claims were not reproduced in this audit and are historical evidence only.

## Security and Production Readiness

### Positive implementation evidence

- Registration restricts public roles to buyer or agent; password hashing and admin-login cases have unit coverage.
- JWT strategy reloads role/account status from the database, and backend controllers apply role guards.
- Global DTO validation strips unknown fields by rejecting them (`whitelist`, `forbidNonWhitelisted`).
- JWT secret validation fails fast for absent, short, or placeholder values.
- Exact location fields are excluded from public projections; private location data has encryption/share tests.
- Image storage validates content signatures, size, generated filenames and path safety; production requires configured storage directory and public URL.

### Risks and unverified controls

- The signed access credential is stored in browser `localStorage`, increasing credential exposure if an XSS issue is introduced. No XSS/security penetration test was run.
- No application-level login throttling was found in the inspected auth controller/module. External gateway/WAF controls were not inspected.
- Admin mutation and visitor-session rate limits are process-local and are not shared across instances.
- Public report throttling is check-then-create; the report schema has no unique constraint that would make concurrent duplicate prevention atomic.
- Mongo configuration enables Mongoose `autoIndex`. Production index migration/preflight and duplicate legacy data handling were not verified.
- The public GET legacy-ad upsert is an unsafe read-path side effect and needs an explicit migration strategy.
- Production secrets, CORS deployment values, encryption key availability, backups, logs/monitoring, durable image volume, HTTPS and failover were not tested.

This is a product/source audit, not a penetration test. No confirmed exploitable vulnerability is claimed.

## SEO, Accessibility, and Responsive UI

- Root metadata includes title, description, and keywords.
- No `robots.txt`, sitemap, structured data, canonical metadata, or page-level metadata generation was found under `frontend/src`.
- Source includes responsive breakpoints, mobile navigation, labels and ARIA attributes in some components.
- No browser viewport, keyboard-only, screen-reader, color-contrast, or overflow checks were performed. Responsive/accessibility conformance is **UNVERIFIED**.

## End-to-End Workflow Status

| Workflow | Status | Evidence now | Still required |
|---|---|---|---|
| Buyer registration → login → search → detail | PARTIALLY COMPLETE | Auth/DTO and public property code/tests; public API HTTP smoke | QA browser run and persistent account flow |
| Save/remove property | PARTIALLY COMPLETE | Buyer schema/service and ownership tests | Browser mutation against isolated QA DB |
| Save/update search | PARTIALLY COMPLETE | DTO/filter/service tests | Browser persistence and actual scheduled alert |
| Submit inquiry → agent reply → buyer receives message | PARTIALLY COMPLETE | Service/controller tests for lead/conversation/ownership | Real two-account E2E, read/unread and notification verification |
| Agent registration → admin verification | PARTIALLY COMPLETE | Auth/admin controller and unit coverage | Browser and state-transition E2E |
| Add inventory and upload image | PARTIALLY COMPLETE | DTO, owner and image storage tests | Isolated DB/storage lifecycle test |
| Submit existing property as ad | PARTIALLY COMPLETE | Linked-record unit test | Persisted single-record/no-duplicate E2E |
| Admin moderates → ad becomes public | PARTIALLY COMPLETE | Moderation/public eligibility tests | Browser/admin role and real isolated DB verification |
| Agent leads and follow-ups | PARTIALLY COMPLETE | Lead API/schema and CRM UI exist | Persistence proof; UI demo sources still present |
| Analytics | PARTIALLY COMPLETE | Event and aggregate unit tests | Real event provenance, range accuracy and anti-abuse validation |
| Buyer receives notifications | PARTIALLY COMPLETE | Notification persistence/service coverage | End-to-end event delivery; outbound email/push absent |
| Private expiring location share | PARTIALLY COMPLETE | Encryption, recipient and expiry unit tests | Full buyer UI/share workflow |

No workflow is marked `COMPLETE` because no full browser-to-database user journey was exercised in this audit.

## Tests and Commands Actually Run

| Check | Command / method | Result | Scope limitation |
|---|---|---|---|
| Backend specs | From `backend`: `$testFiles = Get-ChildItem .\test -File | Where-Object { $_.Name -match '\.spec\.(ts|js)$' } | ForEach-Object { $_.FullName }; node --test -r ts-node/register $testFiles` | **PASS — 70 passed, 0 failed** | Unit/service tests use mocked models for persistence paths; image tests use temporary directories |
| Frontend type-check | From `frontend`: `.\node_modules\.bin\tsc.cmd --noEmit --incremental false --pretty false` | **PASS — exit code 0** | No rendering/API/browser verification; incremental output disabled |
| Public property API transport | `GET http://127.0.0.1:5000/api/v1/properties?limit=1` and frontend proxy equivalent | **HTTP 200**; success envelope, one-item data array | Not a safe read-only DB check because source shows legacy-ad upserts |
| Local TCP ports | `Test-NetConnection 127.0.0.1` for 3000, 5000, 27017 | 3000/5000 reachable; 27017 not reachable | Does not establish remote DB connectivity or data integrity |
| Backend/frontend builds | Not run in this audit | **NOT VERIFIED** | Existing `WORKFLOW.md` contains prior build results; they are not rerun evidence here |
| Browser routes/actions/viewports | Not run | **NOT VERIFIED** | No frontend browser test framework/script found |
| Direct MongoDB read-only inspection | Not run | **BLOCKED** | No direct DB access attempted; local Mongo port closed; no secret values inspected |
| Lint | Not run | **NOT VERIFIED** | Backend lint script uses `--fix`; it was intentionally not run because it would modify source |

An initial test invocation from repository root failed because tests/dependencies are package-local; the corrected run from `backend` passed. No dependencies were installed.

## Priority Summary

- **P0:** None confirmed by the evidence gathered. This does not constitute a security certification.
- **P1:** Public GET invokes advertisement upserts; inspect possible audit-time data impact and move migration out of request paths. Define cascade/retention behavior for property hard delete. Complete core buyer/agent/admin browser E2E before launch.
- **P2:** Replace or clearly label CRM demo state; deploy shared rate limits and login throttling; make report dedupe concurrency-safe; harden analytics visitor identity; implement first-class agency management; add scheduled/email delivery and payment capabilities if they remain product requirements; fix or remove dead public links.
- **P3:** Complete SEO, keyboard/accessibility, visual responsiveness and broad route QA.

## Safe Next Steps

1. Have an authorized database operator compare the relevant ad collection against a trusted pre-audit snapshot to determine whether the three GET smoke requests inserted legacy ads. Do not infer “no writes” from HTTP GET semantics.
2. Refactor/plan the legacy-ad migration as an explicit, reviewed migration with dry-run/backup/rollback, not a public request side effect.
3. Use a dedicated isolated QA database and synthetic identities for browser E2E. Never run mutation tests on production.
4. Verify status lifecycle, cascades/retention, authorization matrix, cross-account messaging, and real property types.
5. Prioritize existing core workflow reliability before adding monetization or AI features.
