# EstatePro Blockers and Next Steps

**Audit date:** 2026-11-01
**No application fixes were made during this audit.**

## Priority Definitions

- **P0:** Critical security, data-integrity, or system-breaking issue.
- **P1:** Core buyer, agent, admin, or property workflow failure.
- **P2:** Important product gap or incomplete functionality.
- **P3:** Improvements, polish, SEO, accessibility, optional enhancements.

## P0 — Critical

No P0 issue was confirmed from the inspected evidence. This does not mean the system passed a penetration test or production readiness review.

## P1 — Resolve Before Core Workflow Sign-Off

### P1.1 Public listing reads perform advertisement upserts

- **Why it matters:** A public GET invokes `ensureLegacyAdvertisements()`, which uses `updateOne(..., { upsert: true })`. Read traffic can create advertisement records and obscures the boundary between read and migration operations.
- **Evidence:** `backend/src/modules/properties/properties.service.ts`, `findAll()` and `ensureLegacyAdvertisements()`; also detail eligibility uses `getPublishedAdvertisement()`.
- **User/data impact:** Persistent changes can occur during normal browsing; current public GET smoke checks may have inserted records.
- **Audit impact:** Three smoke GET requests were made before this side effect was discovered. Direct database inspection was unavailable; whether any data changed is unknown.
- **Dependencies:** Authorized read-only review of the target DB and a trusted snapshot/backup; migration plan.
- **Next action:** First compare affected advertisement records against a trusted pre-audit state. Then make migration explicit, bounded, idempotent and separately reviewed; do not repeat live endpoint checks until authorized.

### P1.2 Property hard delete lacks a visible cross-entity cascade/retention policy

- **Why it matters:** The delete method removes the property, linked advertisement and analytics and cleans managed images, but no cleanup or retention handling is visible there for leads, conversations/messages, location shares, saved-property links or notifications.
- **Evidence:** `backend/src/modules/properties/properties.service.ts` `delete()`; related references in buyer, CRM and property schemas.
- **User/data impact:** Orphan records or broken conversation/history screens may remain after deletion.
- **Dependencies:** Product/legal retention requirements and a QA data inventory.
- **Next action:** Decide soft-delete versus hard-delete and retention behavior; verify relationships in an isolated database before any production change.

### P1.3 Core user journeys lack end-to-end verification

- **Why it matters:** Unit tests cannot establish the interaction between browser, authentication, API, database persistence and role-scoped UI.
- **Evidence:** No frontend/browser test script/framework found; no browser workflows were run in this audit.
- **User impact:** Registration, inquiry/chat, ad moderation and public publication may regress at integration boundaries.
- **Dependencies:** Isolated QA database, synthetic buyer/agent/admin accounts, seeded known fixtures.
- **Next action:** Execute `ESTATEPRO_E2E_TEST_PLAN.md` in an isolated environment after addressing the read-path mutation concern.

## P2 — Important Product, Integrity, and Security Gaps

### P2.1 CRM surfaces still use demo/local state

- **Why:** Parts of ads, calls/contacts, profile/notifications or metrics use Zustand/local storage and mock data rather than established backend persistence.
- **Evidence:** `frontend/src/lib/agent-store.ts`, `agent-dashboard-mock-data.ts`, `AgentTopBar.tsx`, `AgentDashboardWidgets.tsx`, `LeadPipeline.tsx`.
- **Impact:** Agents may see sample or browser-local values as if they were persisted platform records.
- **Next action:** Inventory each rendered widget and identify authoritative APIs; label/remove demo-only content before launch.

### P2.2 Rate limiting is not distributed; login throttling not found

- **Why:** Admin mutations and visitor session creation use process-local in-memory maps; no auth controller/module-level login throttle was found.
- **Evidence:** `backend/src/modules/admin/admin-mutation-rate-limit.guard.ts`; visitor session service; `backend/src/modules/auth/auth.controller.ts`.
- **Impact:** Multi-instance deployments do not share counters; credential stuffing/abuse may depend on external controls.
- **Dependencies:** Deployment topology and a shared rate-limit store/gateway policy.
- **Next action:** Verify edge controls and implement a distributed limiter if required; add login abuse monitoring and lockout/backoff policy.

### P2.3 Public report duplicate throttle can race

- **Why:** Recent-report check and insert are separate operations and `UserReportSchema` has no corresponding unique dedupe constraint.
- **Evidence:** `backend/src/modules/admin/admin.service.ts` report creation path; `backend/src/modules/admin/schemas/user-report.schema.ts`.
- **Impact:** Concurrent submissions may bypass duplicate throttling.
- **Next action:** Define abuse policy and concurrency-safe idempotency/dedupe mechanism; test only in QA.

### P2.4 Analytics unique reach is based on client-selected visitor UUID

- **Why:** Tracking DTO accepts a client-generated UUID and the service hashes it; a client can rotate identities.
- **Evidence:** `backend/src/modules/properties/dto/track-property-event.dto.ts`; `PropertiesService.trackPublicEvent()`.
- **Impact:** Reach/rate metrics can be manipulated and are not equivalent to unique human visitors.
- **Next action:** Document metric semantics and apply a privacy-reviewed server-side or bounded identity strategy; continue labeling calls and WhatsApp as clicks.

### P2.5 Agency management is not a first-class module

- **Why:** Admin grouping is based on `User.agencyName`; no agency entity, member roles, invitations, shared ownership or team APIs were found.
- **Impact:** Agency-level verification, permissions, collaboration and plans cannot be reliably supported.
- **Next action:** Design tenant/membership boundaries before offering agency controls or billing.

### P2.6 Monetization and outbound delivery are absent

- **Why:** No payment/subscription ledger, gateway, webhook, renewal or invoice implementation; no mail/push provider or saved-search scheduler found.
- **Impact:** No verified revenue flow or scheduled alert/email delivery.
- **Next action:** Defer monetization and delivery promises until business policy, provider, idempotency, reconciliation and monitoring are approved.

### P2.7 Signed access credential stored in browser localStorage

- **Why:** Browser JavaScript can access the auth token; an XSS issue could expose it.
- **Evidence:** `frontend/src/lib/api-client.ts`.
- **Impact:** Elevated account takeover risk if script injection is introduced.
- **Next action:** Review the threat model and CSP/XSS controls; consider HttpOnly cookie/session architecture as a separate security decision.

### P2.8 Public navigation includes unavailable routes/targets

- **Evidence:** `frontend/src/components/marketplace/Footer.tsx` links to `/privacy`, `/terms`, `/agent/verification`, and fragment targets; no matching route files for those paths were found.
- **Impact:** Public visitors may encounter 404s or fragment links with no destination.
- **Next action:** Implement approved content pages or update destinations; test links from homepage and detail pages.

## P3 — Release Quality and Improvements

- Add sitemap, robots, canonical/structured metadata and page-level SEO metadata.
- Test accessibility, keyboard navigation, screen-reader labels, color contrast and mobile/tablet overflow.
- Add browser coverage for direct URLs, refresh, route navigation and responsive screens.
- Confirm durable property image storage, backup/restore and orphan-file cleanup.
- Review Mongo `autoIndex` behavior and production index migrations before deployment.
- Establish monitoring, health/readiness checks, structured logs, backup and restoration drills.

## Recommended Order

1. **Contain/assess audit-time data impact:** use an authorized, read-only database operator and trustworthy pre-audit snapshot. No further public listing GET checks until approved.
2. **Remove read-path persistence:** plan and separately review legacy-ad migration behavior.
3. **Define data lifecycle:** inventory/ad states, hard-delete/soft-delete, history retention and orphan cleanup.
4. **Build isolated E2E coverage:** buyer, agent, admin, moderation, messaging, analytics and property-type matrix.
5. **Replace/label CRM demo state and verify every dashboard metric.**
6. **Harden auth/abuse controls and deployment operations.**
7. **Only then expand agency, payments, scheduled alerts, AI and premium functionality.**

## Safe to Build Next

- Test-only tooling and QA automation that uses an isolated database and cannot target production.
- Documentation and static navigation/SEO improvements after route decisions are approved.
- Core workflow fixes that are based on verified QA records and have tests.

Do not begin new monetization/AI work before the core data lifecycle and public GET side effect are resolved.
