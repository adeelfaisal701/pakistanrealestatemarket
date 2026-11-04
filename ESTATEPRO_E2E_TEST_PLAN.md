# EstatePro End-to-End Verification Test Plan

**Created:** 2026-11-01
**Execution status:** Planning document. None of the browser/database mutation scenarios below were executed in this audit.

## Safety and Test Environment

1. Use a dedicated isolated QA MongoDB database and synthetic accounts for every role. Never use production accounts or production records.
2. Before testing, take a QA snapshot and record the selected database name without recording credentials.
3. Confirm test setup/teardown are restricted to QA identities and known test records. Do not use blanket collection resets.
4. Do not begin public listing GET tests until the legacy-ad upsert side effect is removed or reviewed and explicitly authorized for the isolated QA database.
5. Use synthetic image fixtures in an isolated storage directory. Do not contact phone numbers, use WhatsApp, deliver email, or trigger external integrations.
6. Record browser, viewport, request status, response shape, before/after QA records, and cleanup outcome. Preserve failure evidence without storing tokens or passwords.

## User and Role Matrix

| Persona | Required assertions |
|---|---|
| Anonymous visitor | Can browse only eligible public data; cannot read private location or buyer/agent/admin records |
| Buyer | Can read/write only own profile, saved items/searches, inquiries, messages, notifications and eligible recommendations |
| Agent | Can read/write only own inventory, ads, leads, analytics, conversations and location-share controls |
| Unverified/suspended agent | Confirm documented policy for protected actions and test each mutation; inactive account JWT requests must be rejected |
| Administrator | Can access admin routes and permitted actions; all unauthorized roles receive denial from backend, not just UI |

## Test Cases

| ID | Workflow | Steps | Expected evidence |
|---|---|---|---|
| E2E-01 | Buyer registration and login | Register synthetic buyer; sign out; log in; reload; call profile; sign out | One buyer identity in QA DB, password hash only, correct role, token not exposed in logs, buyer access succeeds |
| E2E-02 | Agent registration and verification | Register synthetic agent; verify pending state; log in; admin approves; refresh agent profile | Agent role/status changes persist with admin metadata; protected actions follow documented verification policy |
| E2E-03 | Public property discovery | Seed one approved QA ad for each supported sample class; search by city/type/purpose/price/area; paginate and sort | Results match filters; only eligible ads appear; response fields match client contract; public fields contain no private address/coordinates |
| E2E-04 | Property detail and gallery | Open each seeded property; inspect images, cover/order, type-specific fields, description, agent identity, contacts, similar properties | Detail uses actual QA records and file fixtures; no empty/inapplicable specs; similar results exclude current/non-public records |
| E2E-05 | Save and unsave property | Buyer saves public item, reloads saved list, unsaves; attempt another buyer’s saved identifier | First buyer sees persistence; second buyer cannot read/delete it; duplicate action remains idempotent |
| E2E-06 | Saved search | Buyer saves filter criteria, changes name/frequency/filters, reloads, deletes | All changes persist only to owner; returned match count/shape matches UI; no scheduled delivery is claimed until worker exists |
| E2E-07 | Buyer inquiry and chat | Buyer starts an inquiry for a published QA ad; refresh; agent opens linked inbox; agent replies; buyer reads and replies | One conversation and linked lead; correct ownership/sender identities; messages persist; unread/read and notification state updates |
| E2E-08 | Agent property inventory | Agent creates a private property; updates details/status; attempts another agent’s ID | One owner-linked property; private inventory is not public; other agent operations are denied |
| E2E-09 | Image upload lifecycle | Upload valid fixture; verify read; attempt oversized, MIME-mismatched and non-image fixtures; reorder/remove; delete QA property | Valid file and metadata persist; invalid upload denied; cleanup does not delete shared files; no files outside QA storage touched |
| E2E-10 | Existing property to advertisement | Submit the already-created property as an ad; repeat request; inspect My Listings/My Ads | Exactly one property and one linked ad; submission is pending review; repeated submit does not duplicate property/ad |
| E2E-11 | Admin moderation/publication | Admin reviews pending ad; approve; query marketplace; reject/pause/restore another QA ad; test non-admin | State/audit metadata persists; only approved published eligible ad appears; unauthorized actions denied |
| E2E-12 | Inventory versus advertisement state | Exercise available, reserved, sold, rented and unavailable; test pending/published/paused/ended ads | Inventory and ad statuses remain coherent; sold/rented/unavailable do not appear as available; restoring inventory follows policy without accidental republishing |
| E2E-13 | Reports and complaints | Submit valid QA report; admin lists, reviews, resolves/dismisses with notes; concurrent duplicate test in QA only | Reporter privacy preserved; status, reviewer and notes persist; throttling/deduplication behavior is concurrency-safe |
| E2E-14 | Admin activity | Perform one authorized admin test action; search/paginate activity; attempt as non-admin | One accurately attributed audit record; no secret/credential values in detail; unauthorized read blocked |
| E2E-15 | Analytics | Generate bounded QA property view/call-click/WhatsApp-click test events using controlled visitor identity; query date ranges and another agent’s report | Only event counts are claimed; dedupe, visitor policy, owner scope and date boundaries hold; no external call/chat is made |
| E2E-16 | Private location share | Agent sets private QA coordinates; shares to registered QA buyer; buyer opens expiring link; wrong buyer and expired/revoked links attempt | Coordinates absent from public API; only intended buyer receives location; expiry/revocation enforced |
| E2E-17 | Admin direct routing | With and without admin auth, open each admin URL directly, refresh, navigate between sections, test admin subdomain middleware | Admin sees shared layout; anonymous is redirected to login; non-admin is denied; no cross-portal redirect or 404 |
| E2E-18 | Mobile, tablet, desktop | Repeat public, buyer, agent and admin critical screens at agreed viewport widths; keyboard-only pass | No horizontal overflow, clipped controls, unreadable content, trapped focus, or inaccessible essential actions |
| E2E-19 | SEO/link integrity | Crawl all internal links and inspect page metadata, robots/sitemap and canonical behavior | No dead links/404s; page metadata and crawler directives are correct |

## Property Fixture Matrix

Use actual saved QA records and do not invent assertions from labels alone:

| Fixture | Required dynamic checks |
|---|---|
| House for Sale | Bedrooms/bathrooms/rooms, sale price, house-specific features |
| Apartment for Rent | Rent price/period if supported, apartment fields and rent purpose |
| Upper Portion for Rent | Portion-specific details, rent purpose, no irrelevant plot fields |
| Residential Plot for Sale | Area/unit and location; no bedroom/bathroom values presented as applicable |
| Commercial Property | Commercial specs/utilities; no fabricated residential features |

If a category has no saved QA record, mark it **NOT VERIFIED** and request/prepare data only in the isolated QA database.

## Exit Criteria

- Every P1 workflow passes with persistence and ownership assertions.
- All admin/backend authorization checks pass independently of UI guards.
- No real contact, messaging, payment, notification delivery, or analytics event is triggered.
- QA database/storage changes are enumerated and cleaned up using exact test identifiers.
- Screenshots, logs and API captures contain no credentials, tokens, private coordinates or unnecessary personal data.
