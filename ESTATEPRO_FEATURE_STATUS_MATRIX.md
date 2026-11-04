# EstatePro Feature Status Matrix

**Audit date:** 2026-11-01
**Status definitions:** `COMPLETE`, `PARTIALLY COMPLETE`, `UI ONLY`, `BACKEND ONLY`, `BROKEN`, `MISSING`, `UNVERIFIED`, `BLOCKED`. `COMPLETE` requires a full workflow test; no end-to-end feature earned that status in this audit.

| Module / feature | Status | Evidence (frontend; backend/API; database/tests) | What was verified | Remaining work |
|---|---|---|---|---|
| Public home/discovery | PARTIALLY COMPLETE | `frontend/src/app/(public)/page.tsx`; `PropertyGrid.tsx`; `public-properties.ts`; `/api/v1/properties`; `Property` and `PropertyAdvertisement` | Source uses actual API for listings; one public listing GET returned 200, but it may upsert | Browser rendering, accurate live widgets and safe GET behavior |
| Search, filters, sorting, pagination | PARTIALLY COMPLETE | `frontend/src/app/(public)/properties/page.tsx`; `QueryPropertyDto`; `PropertiesService.findAll`; `Property` | DTO/query and service code; backend suite passes | Exhaustive query cases, query-string UX, empty/error states, persisted data |
| Property detail and gallery | PARTIALLY COMPLETE | `frontend/src/app/(public)/property/[id]/page.tsx`; `property-details-client.tsx`; `GET /api/v1/properties/:id`; `property.schema.ts` | Public projection/privacy and image tests | Browser test across actual property types, agent/contact actions, gallery |
| Similar properties | PARTIALLY COMPLETE | Property detail client and public property query | Source has related-listing surface | Verify ranking, actual records, exclusion/current status in browser |
| Public report submission | PARTIALLY COMPLETE | `PropertyReportForm.tsx`; `POST /api/v1/reports`; `UserReport`; admin report tests | API/schema/action code exists | No submission/resolve E2E; rate-limit check-then-create race |
| Buyer registration/login | PARTIALLY COMPLETE | `frontend/src/app/(auth)/register/page.tsx`, `login/page.tsx`; auth routes; `User`; `auth-registration.spec.ts`, `admin-auth.spec.ts` | Registration/login and role DTO unit tests | Current browser/account persistence run |
| Buyer profile/preferences | PARTIALLY COMPLETE | `BuyerProfileSettings.tsx`; `/api/v1/buyer/profile`, `/buyer/preferences/notifications`; `BuyerProfile`; buyer service tests | DTO/service behavior covered | Full UI patch/refresh and email delivery proof |
| Saved properties | PARTIALLY COMPLETE | Buyer saved-property components; `/api/v1/buyer/saved-properties`; `SavedProperty`; buyer service tests | Buyer scoping and saved-ID service tests | Browser add/remove and real persistence |
| Saved searches | PARTIALLY COMPLETE | `BuyerSavedSearches.tsx`; `/api/v1/buyer/saved-searches`; `SavedSearch`; buyer search/alerts tests | Filters and service behavior | UI persistence, scheduler and notification delivery |
| Buyer inquiries/conversations | PARTIALLY COMPLETE | `BuyerInquiries.tsx`; `/api/v1/buyer/inquiries`, `/buyer/conversations/:id/messages`; `PropertyConversation`, `PropertyMessage`, `Lead`; messaging/buyer tests | Ownership, lead linkage and DTO code tests | Buyer↔agent browser round trip and read/unread |
| Buyer notifications | PARTIALLY COMPLETE | `BuyerNotifications.tsx`; `/api/v1/buyer/notifications`; `BuyerNotification`; buyer tests | Persistence/service code covered | End-to-end event delivery, email/push missing |
| Agent registration/access | PARTIALLY COMPLETE | `frontend/src/app/(auth)/agent/register/page.tsx`; agent guard; `/api/v1/auth/register`; `User`; auth tests | Role registration and backend account checks | Browser session and verification flow |
| Agent property inventory | PARTIALLY COMPLETE | `AddPropertyForm.tsx`, listing pages; `/api/v1/properties`; `Property`; property tests | DTO, owner checks and status service tests | Complete browser edit/status flow |
| Property photo upload | PARTIALLY COMPLETE | `PropertyMediaPicker.tsx`; `/api/v1/properties/:id/images`; image metadata/filesystem; image tests | Signature/size/path checks and temp-directory persistence test | Production durable storage/CDN/backup, browser upload/cleanup |
| Advertisement lifecycle | PARTIALLY COMPLETE | Agent My Ads; `/api/v1/properties/:id/advertisement`; admin ad endpoints; `PropertyAdvertisement`; ad tests | Existing property is linked to one pending ad in unit tests | Persisted UI E2E and investigate public-GET upserts |
| Agent leads/follow-ups | PARTIALLY COMPLETE | `LeadPipeline.tsx`; `/api/v1/crm/leads`, `/crm/activity`, `/crm/stats`; `Lead` | API/service surfaces exist | Demo/local state remains; persistent follow-up E2E |
| Agent conversations | PARTIALLY COMPLETE | `PropertyConversationsInbox.tsx`; `/api/v1/messages/agent/*`; `PropertyConversation`/`PropertyMessage`; messaging tests | Agent ownership and service tests | Actual message delivery/read state browser test |
| Agent analytics | PARTIALLY COMPLETE | Analytics widgets; `/api/v1/properties/agent/analytics`; `PropertyAnalyticsEvent`; analytics tests | Event validation/dedupe/aggregate unit tests | Visitor identity abuse resistance and real data/UI validation |
| Private location sharing | PARTIALLY COMPLETE | `ShareExactLocationControl.tsx`; private-location/share routes; `PropertyLocationShare`; privacy tests | Encryption, recipient and expiry logic tests | Complete two-account UI workflow and production key readiness |
| Admin login and access | PARTIALLY COMPLETE | `AdminAccessGuard.tsx`; `/api/v1/auth/admin-login`, `/users/profile`; `User`; `admin-auth.spec.ts` | Configured-admin logic and role checks in unit tests | Browser/direct-route/refresh/denial matrix |
| Admin overview/statistics | PARTIALLY COMPLETE | Admin overview components; `/api/v1/admin/stats` | Source/API exists | Verify all displayed counts against authorized live records |
| Agent approval/account actions | PARTIALLY COMPLETE | Agent approval components; `/api/v1/admin/agents*`; `User`; admin tests | Backend action and auth code | UI mutation persistence and full authorization matrix |
| Property moderation | PARTIALLY COMPLETE | Admin moderation grid; `/api/v1/admin/properties*`; `Property`; moderation tests | State transition and ad synchronization tests | Real admin browser workflow and all status combinations |
| Advertisements administration | PARTIALLY COMPLETE | Admin advertisements page/manager; `/api/v1/admin/advertisements*`; `PropertyAdvertisement` | Controller/service route and actions found | Browser filters, action reasons, persistence |
| Agency directory | PARTIALLY COMPLETE | `AdminAgencyDirectory.tsx`; `/api/v1/admin/agencies`; grouped `User.agencyName` | Source grouping implementation | First-class agency records, independent verification/contact/logo |
| Agency teams/roles/shared inventory | MISSING | No team/membership UI, API or agency schema found | Absence in inspected route/module/schema inventories | Define tenant model and authorization before implementation |
| Reports and complaints admin | PARTIALLY COMPLETE | `AdminReportsManager.tsx`; `/api/v1/admin/reports`; `UserReport` | Read/update surfaces and schema found | Resolve/dismiss browser E2E, reporter privacy and race-safe throttling |
| Admin activity log | PARTIALLY COMPLETE | `AdminActivityLog.tsx`; `/api/v1/admin/activity`; `AdminActivity` | Route/schema/query code found | Verify actual audit rows, pagination and long-term retention |
| Role/ownership enforcement | PARTIALLY COMPLETE | JWT/roles guards and owner-scoped services; role/owner tests | Selected service/guard checks pass | Full endpoint-by-role matrix and deployed config |
| Payment/subscriptions/invoices | MISSING | No UI/API/provider/ledger schema found | Source/manifests inspected | Commercial policy, payment integration and reconciliation |
| Scheduled saved-search alerts/email/push | MISSING | Saved-search frequency/preferences exist; no worker/provider found | Persistence settings only | Scheduler, idempotency, delivery service and monitoring |
| Buyer recommendations | PARTIALLY COMPLETE | Buyer recommendations UI; `/api/v1/buyer/recommendations`; buyer/property models | Deterministic service code | Relevance evaluation and explainability; do not label AI |
| CRM matching / AI | UI ONLY | CRM matching heuristic and local state; no ranking API/provider found | Source inspection | Replace misleading score semantics or implement evaluated backend |
| Generative AI/fraud/valuation | MISSING | No provider/client/model/data pipeline found in inspected source | Source/manifests inspected | Product and data policy, provider, evaluation, human review |
| SEO metadata | PARTIALLY COMPLETE | `frontend/src/app/layout.tsx` | Root metadata exists | Sitemap, robots, canonical/structured data, per-route metadata |
| Responsive/accessibility conformance | UNVERIFIED | Responsive classes and some labels/ARIA exist | Static source only | Browser viewport, keyboard, screen reader and contrast tests |
| Direct MongoDB records/index verification | BLOCKED | No direct client/query; local 27017 closed | Backend HTTP response only, whose GET may write | Safe authorized DB inspection and snapshot comparison |
| Full end-to-end system | UNVERIFIED | No frontend browser test suite found | No full browser-to-database journey run | Isolated QA E2E suite for all core workflows |

## Test Record

- Backend: 70 tests passed, 0 failed using the package-local Node test runner and `ts-node/register`.
- Frontend: `tsc --noEmit --incremental false --pretty false` passed.
- Backend/frontend builds, lint, browser tests, and direct database inspection were not run in this audit.
- The public API GET smoke test returned HTTP 200 but is not counted as database read-only verification because it invokes an upsert migration helper.
