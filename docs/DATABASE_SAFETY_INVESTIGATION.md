# EstatePro Database Safety Investigation

**Investigation date:** 2026-11-01
**Project:** Pakistan Real Estate Marketplace / EstatePro
**Mode:** Investigation only. No application source, schemas, indexes, or database records were intentionally modified during this phase.

## 1. Executive Summary

The suspected public GET side effect is **confirmed in source**. `GET /api/v1/properties` reaches `PropertiesService.findAll()`, which calls `ensureLegacyAdvertisements()` whenever the advertisement model is available. That helper scans legacy properties in `published`, `pending_approval`, and `rejected` states and performs `PropertyAdvertisement.updateOne(..., { upsert: true })` for each one, keyed by `propertyId`.

The helper inserts missing ad documents. It uses `$setOnInsert`, so the listed business fields are not replaced on an existing ad; however, the installed Mongoose version applies schema timestamps to `updateOne`, so an existing ad's `updatedAt` can be touched by a GET. The effect is independent of the public query filters, sort, and pagination because the helper runs before the listing query.

Three smoke GET requests were made during the prior audit before the side effect was identified. **Their database impact is unknown.** They could have inserted missing legacy ads and could have changed `updatedAt` on existing matching ads. No evidence available in this repository identifies the target database, affected property IDs, inserted documents, or timestamp changes. There is no basis to say that changes definitely occurred or that no changes occurred.

The local MongoDB TCP port `127.0.0.1:27017` refused a connection during this phase. No direct database access, application logs, database logs, backup, or snapshot was available for comparison. No endpoint or database operation was run in this phase.

Property deletion behavior is asymmetric:

- The agent/admin property endpoint physically deletes the canonical property, its linked advertisement and analytics, and attempts to remove unreferenced managed image files. It does not check for leads, conversations, active ads, saved-property references, or location shares, and does not cascade those records.
- Admin's separate hard-delete endpoint requires explicit confirmation, blocks deletion when leads/conversations exist, revokes active location shares, physically deletes the ad and property, and intentionally retains analytics and image files.
- Admin "remove" is a soft visibility action: it flags the property removed and ends its ad. Admin rejection/moderation changes state rather than deleting the canonical property.

At the original investigation conclusion, the implementation only partially followed the desired canonical-property and advertisement separation. A unique `propertyId` index is declared on the ad schema, but deployment of that index could not be verified. A later, separately authorized source-only remediation is recorded in section 14; it does not resolve the historical database-impact question.

## 2. Investigation Scope

Inspected source and schemas:

- `backend/src/modules/properties/properties.controller.ts`
- `backend/src/modules/properties/properties.service.ts`
- `backend/src/modules/properties/schemas/property.schema.ts`
- `backend/src/modules/properties/schemas/property-advertisement.schema.ts`
- `backend/src/modules/properties/schemas/property-analytics-event.schema.ts`
- `backend/src/modules/properties/schemas/property-location-share.schema.ts`
- `backend/src/modules/buyer/schemas/saved-property.schema.ts`
- `backend/src/modules/crm/schemas/lead.schema.ts`
- `backend/src/modules/crm/schemas/property-conversation.schema.ts`
- `backend/src/modules/crm/schemas/property-message.schema.ts`
- `backend/src/modules/admin/admin.controller.ts`
- `backend/src/modules/admin/admin.service.ts`
- `backend/src/modules/admin/dto/admin-delete.dto.ts`
- Installed Mongoose timestamp helper at `backend/node_modules/mongoose/lib/helpers/update/applyTimestampsToUpdate.js`

Also checked whether `127.0.0.1:27017` accepted a TCP connection and searched the project for `.log` files. No property API endpoint, database shell, migration, seed, test, build, or write-capable operation was executed during this phase.

Not inspected: external MongoDB console, Atlas/other provider audit logs, database server logs, production/QA backups, filesystem or cloud snapshots outside the repository, and the actual database records. Secret environment-file values were not inspected.

## 3. GET Request Execution Flow

### Listing GET path

1. `PropertiesController.findAll()` handles `GET /api/v1/properties` and forwards the validated query DTO to `PropertiesService.findAll()`.
2. `findAll()` constructs the public property filter from status, hidden/removed flags, and request filters.
3. If `advertisementModel` is present, it calls `ensureLegacyAdvertisements()` **before** querying the published advertisement IDs and before fetching/counting the requested page.
4. It then finds published ads, restricts returned property IDs to those ads, loads the requested property page, and returns a response.

### Detail GET path

`PropertiesController.findOne()` calls `PropertiesService.findById()`. For a property the public detail lookup accepts, that service calls `ensureLegacyAdvertisements([property])` before checking its advertisement state. The helper itself skips a property unless its `status` is `published`, `pending_approval`, or `rejected`.

### Other discovered call paths

The helper is also called by service methods used for agent listings, agent advertisements, agent recent activity, advertisement submission, and other property/ad synchronization paths. Those call sites mean the behavior is not exclusive to the public listing endpoint.

## 4. `ensureLegacyAdvertisements()` Analysis

### Trigger conditions and scope

- The helper returns immediately if `advertisementModel` is unavailable.
- With no explicit property list, it queries properties whose `status` is one of `published`, `pending_approval`, or `rejected`.
- `findAll()` invokes this full scan whenever `advertisementModel` is present. Request filters, page number, page size, and sorting do not narrow the scan.
- With an explicit property list, it evaluates each supplied property and only processes the same three eligible states.
- It loops records and awaits one `updateOne` per eligible property.

### Collection and operation

The affected collection is the Mongoose model collection for `PropertyAdvertisement`, declared by `PropertyAdvertisementSchema`. The filter is `{ propertyId: property._id }`, and the operation uses `{ upsert: true, runValidators: true }`.

### Values inserted for a missing ad

The `$setOnInsert` object supplies:

- `propertyId`
- `agentId` derived from the property's agent reference
- `status`: `published` for a published legacy property, `rejected` for a rejected property, otherwise `pending_review`
- `submittedAt`
- `approvedAt` for a published property, when a moderation/update date is available
- `moderatedBy`
- `moderationNotes`

The list query used by `findAll()` explicitly selects `_id`, `agentId`, `status`, `moderatedAt`, `moderatedBy`, and `moderationNotes`, but not property `createdAt` or `updatedAt`. As a result, for ads synthesized by the **listing GET path**, `submittedAt` falls back to the current time; `approvedAt` uses `moderatedAt` when present and otherwise has no property `updatedAt` value to fall back to. The detail path loads a different projection and may have the property's timestamps.

Fields whose values are `undefined` may be omitted by Mongoose. With schema timestamps enabled, Mongoose additionally supplies `createdAt` on insert and `updatedAt` on updates.

### Existing ads and timestamps

The business fields above are inside `$setOnInsert`; MongoDB does not apply them to an already-matched ad. The `PropertyAdvertisement` schema enables `{ timestamps: true }`. The installed Mongoose update-timestamp helper adds `updatedAt` to `$set` for `updateOne` unless timestamps are disabled. The helper does not disable timestamps. Therefore, a matching existing ad can have its `updatedAt` changed by the request even though the application's explicit update is insert-only. `status`, `agentId`, `submittedAt`, `approvedAt`, moderation metadata, and the property relationship are not explicitly changed for an existing match by this helper.

### Duplicate prevention

The schema declares a unique index on `propertyId`, which is intended to prevent duplicate ads for one canonical property. The actual index state in the database is unknown. Without that index, concurrent upserts for the same missing `propertyId` may race and potentially create duplicates. Sequential helper iterations alone do not prove duplicates were created.

## 5. Possible Impact of the Three Audit Requests

The prior audit recorded three `GET /api/v1/properties?limit=1` smoke requests. Source inspection confirms each request can invoke the full helper scan when the ad model is available.

| Potential effect | Assessment |
|---|---|
| Inserted advertisement documents | **Possible, not established.** A document could be inserted for every eligible legacy property with no existing ad, subject to runtime model availability and actual database contents. |
| Existing advertisement documents updated | **Possible, not established.** Mongoose timestamps can update `updatedAt` on a matched ad. |
| Status or moderation fields changed on existing ads | **Not explicitly changed by this helper.** Those fields are only in `$setOnInsert`; an existing matching ad does not receive those values from this operation. |
| Property records modified | **No property write is present in this helper.** The helper reads properties and upserts ads; this does not establish that no other component or request activity changed properties. |
| Duplicate ads created | **Unknown/conditional.** A unique `propertyId` index is declared in source, but the deployed index is unverified. A race is possible if the index is absent; there is no evidence that a duplicate was created. |
| Property-to-ad references changed | **No direct ad reference field exists on `Property` in the inspected schema.** The ad's `propertyId` association is used; helper does not update a property's relationship field. |

No relevant application/database log or snapshot was available in the repository. The audit cannot identify the database that answered the requests, the number of eligible legacy properties, or the exact inserted/updated documents. The impact **cannot be determined from current evidence**.

## 6. Database Inspection Status

- TCP connectivity check: `127.0.0.1:27017` — **not reachable** at the time checked.
- Direct MongoDB inspection: **not performed**. No direct database query or shell command was attempted.
- Application and database logs: **unavailable**; no project `.log` files were found. External service logs were not accessible.
- Backups/snapshots: **not available for inspection** in the project workspace; external backup systems were not accessed.
- Database target: **unknown** from this investigation. No environment secret values were read.
- Data-change conclusion: **cannot rule out changes and cannot claim changes definitely occurred**.

Further investigation requires an authorized operator to provide read-only access to the exact database that served the prior requests, plus a trusted timestamped pre-audit snapshot or backup. Compare advertisement documents and `updatedAt` values against that baseline, particularly records with legacy property statuses and missing/mismatched ad records. If no baseline or point-in-time audit trail exists, exact attribution may remain impossible.

## 7. Property Deletion and Retention Analysis

### Agent/admin `DELETE /api/v1/properties/:id`

Controller: `PropertiesController.delete()`; guard allows `agent` or `admin`. Service: `PropertiesService.delete()`.

The method first resolves the property through `findByIdForManager()`, which enforces that a non-admin requester owns it. It then:

1. Physically deletes the canonical `Property` document.
2. Deletes the `PropertyAdvertisement` whose `propertyId` matches.
3. Deletes all `PropertyAnalyticsEvent` documents for the property.
4. Attempts to remove each managed image referenced in `imageMetadata` if no other property references it.
5. Returns deletion and deferred-image-cleanup information.

There is no check for active/published ads, leads, conversations, messages, buyer saved properties, or location shares. No transaction wraps the sequence. A later failure can occur after the canonical document was already deleted. The method does not delete related leads/conversations/messages, saved-property documents, notifications, or location-share documents; those records can retain dangling property/ad references. It does not log an admin audit action.

**Result:** An agent can invoke this route for an owned property with an active published ad or linked lead/conversation history. The backend has no delete confirmation/reason DTO or linked-record conflict check on this route. Whether the UI adds a confirmation was not tested.

### Admin `DELETE /api/v1/admin/properties/:id`

Controller: `AdminController.deleteProperty()`; admin-role guarded and mutation-rate-limited. Service: `AdminService.deleteProperty()`.

This distinct endpoint requires the explicit delete confirmation/reason DTO. It checks for leads associated with the property or its ad and conversations associated with the property; if either count is nonzero, it returns a conflict directing the operator to use Remove. If allowed, it revokes active location shares, deletes the ad, deletes the property, and writes an admin activity record. It does **not** delete analytics events and records `analyticsRetained: true` in its audit metadata. Image files are retained; metadata records the count of property images. Saved-property references are not checked or removed.

The admin path is also physically destructive for canonical property/ad documents, but includes more retention safeguards than the generic property endpoint. No database transaction is visible around the sequence.

### Advertisement actions versus property deletion

- Admin `PATCH /api/v1/admin/advertisements/:id/action` changes an ad's status. `remove` marks the ad `removed`; it does not delete the canonical property. Approve/reject/publish/pause/end also operate on the ad and synchronize selected property moderation status for approve/reject.
- Admin property action `remove` sets `Property.adminRemoved`, records a reason, and ends the linked ad. It is a soft visibility/removal action, not canonical document deletion.
- Admin property action `unpublish` pauses a published ad.
- `moderateProperty()` only accepts a pending property, writes publish/reject status and moderation metadata, synchronizes the linked ad through `syncAdvertisementModeration()`, and logs the admin action.
- There is no standalone admin advertisement DELETE route in the inspected controller. The ad document is physically deleted as part of property hard-delete workflows or potentially as a side effect of the generic property delete.

### Related records summary

| Record | Agent/admin generic property DELETE | Admin hard-delete property endpoint |
|---|---|---|
| Canonical property | Physically deleted | Physically deleted if no lead/conversation history blocks it |
| Linked ad | Physically deleted | Physically deleted |
| Analytics events | Physically deleted | Retained |
| Leads | Not removed or checked | Retained; their presence blocks deletion |
| Conversations/messages | Not removed or checked | Conversation presence blocks deletion; messages are retained with their conversation |
| Buyer saved-property links | Not removed or checked | Not removed or checked |
| Location shares | Not revoked or deleted by this method | Active shares revoked |
| Image files | Managed files removed when unreferenced | Retained |
| Admin activity record | No admin audit record in this service method | Admin deletion action logged |

The `PropertyMessage` schema references its conversation rather than the property directly. `PropertyConversation` references property, ad, lead and agent. Leads reference property and optionally ad/conversation. `SavedProperty` and `PropertyLocationShare` directly reference the property.

## 8. Property vs Advertisement Lifecycle Assessment

### Existing implementation

- A canonical `Property` document is owned by an agent and is distinct from a `PropertyAdvertisement`.
- `PropertyAdvertisement` references `propertyId` and `agentId`; a unique `propertyId` index is declared.
- Submitting an existing property uses `submitForAdvertising()` and `findOneAndUpdate()` keyed by the existing property, rather than creating a second canonical property. Focused tests in `backend/test/property-advertisement-analytics.spec.ts` cover this behavior.
- Public listing results require published property and advertisement eligibility; service tests cover publication filtering.
- Advertisement status has draft, pending review, published, rejected, paused, ended, and removed values.
- Inventory has available, sold, rented, reserved, and unavailable values.

### Coupling and gaps

- `Property` also has a `status` field that contains both moderation states (`pending_approval`, `published`, `rejected`) and inventory-like states (`sold`, `rented`, `reserved`, `unavailable`). A separate `inventoryStatus` exists, but it does not make lifecycle fully independent because service transitions also mutate `Property.status`.
- `updateInventoryStatus()` maps availability to `Property.status`, and when a non-available state is selected it ends ads in pending-review, published, or paused states. Thus inventory changes drive ad lifecycle. In particular, `reserved` is allowed for advertising at submission but currently enters the non-`available` transition path and ends an existing active ad.
- Admin remove/hide and ad pause/end are separate actions and preserve canonical property data; that is closer to the desired architecture.
- The generic property DELETE bypasses retention checks and permanently removes both property and ad.
- The unique index is a source-level intention only until the live database index is verified.

### Assessment against intended rules

| Intended rule | Current assessment |
|---|---|
| One canonical property record per real property | Supported in submission path; generic deletion and E2E behavior still need safeguards/verification |
| Submitting existing inventory creates/links an ad, not another property | Supported by service and focused test |
| Only approved and published ads appear publicly | Implemented through public query eligibility and focused tests |
| Prevent multiple ads for one property | Schema declares unique index; deployed index unknown |
| Keep availability separate from ad lifecycle | Partially implemented; separate fields exist but `Property.status` and ad status are coupled by transitions |
| Historical leads, messages, and analytics survive ad ending | Ending/pause actions retain associated records; generic hard delete removes analytics and leaves other references; admin hard delete blocks leads/conversations and retains analytics |

## 9. Confirmed Issues

1. **Public GET performs write-capable upserts.** Confirmed in code; actual records affected by the earlier requests unknown.
2. **Mongoose timestamp writes may occur on existing ads.** Confirmed by the installed timestamp helper and timestamped ad schema; actual timestamp changes unknown.
3. **Generic property DELETE has no linked-history/active-ad safeguards.** Confirmed in `PropertiesService.delete()`.
4. **Generic property DELETE can leave dangling related records.** Confirmed by its cleanup list and direct references in buyer/CRM/location schemas.
5. **Lifecycle state is coupled.** `Property.status` mixes publication and inventory concepts, and inventory transitions change ad state.
6. **Admin and generic property deletion have different retention policies.** Confirmed by their distinct service implementations.

## 10. Unverified Risks

- Whether any of the three earlier GET requests inserted ad documents or changed `updatedAt`.
- Whether concurrent GET requests could create duplicate ads in the live database; unique index deployment and concurrency are unverified.
- Which MongoDB target served the requests and whether database audit/change streams/backups are available.
- Whether frontend UI prompts before agent property deletion.
- Whether a production deployment has external logging, backups, rate limits, or other controls not present in the inspected repository.
- Actual current record count, orphaned references, index definitions, or property/ad state consistency.

## 11. Recommended Remediation Plan (Not Implemented)

### Priority 0 — Establish data impact

- Request explicit authorization for a read-only database review.
- Compare the correct database against a trusted pre-audit backup/snapshot, focusing on ad rows created around the requests and `updatedAt` values for legacy-status properties.
- Do not infer either data modification or no modification without comparison evidence. If point-in-time evidence is absent, document that exact attribution cannot be established.

### Priority 1 — Make reads strictly read-only

- Remove migration/upsert calls from public and ordinary read paths.
- Use a read-only query that joins or filters eligible ads without creating data.
- Evaluate legacy synchronization separately using an explicit maintenance/migration operation with a dry-run, bounded batches, idempotency, backup/rollback plan, unique-index preflight, duplicate review, and auditable counts.
- Do not select migration semantics or execute a migration until data implications and rollout are approved.

### Priority 1 — Protect historical records from canonical deletion

- Prefer soft deletion/archive for routine agent property removal; preserve canonical IDs and relationships for leads, conversations, messages, saved links, analytics, location shares and audit history.
- Block deletion where active ads or historical records exist unless a deliberately approved retention workflow handles each relation.
- Align the generic agent endpoint with the stricter admin safeguard; require explicit confirmation/reason for any separately authorized purge.
- Make admin removal remain the default reversible visibility operation; ensure active shares are revoked on removal where appropriate.
- If hard deletion remains necessary, define per-entity retention/anonymization, image cleanup, transaction/compensation, audit, and legal requirements before implementation.

### Priority 2 — Clarify lifecycle ownership

- Define a canonical state model where inventory availability and ad moderation/publication are independent fields with explicit transition rules.
- Decide reserved-state behavior and whether an unavailable/sold/rented inventory should end, pause, or retain an ad record.
- Plan a compatibility/data migration only after sampling real states and duplicates under approved read-only access.

### Tests required before release

- Unit tests: helper no longer called by read paths; existing/missing ad read behavior; timestamp behavior; idempotent and concurrent migration cases.
- API integration tests: GET requests cause zero writes; public results still require approved/published ads; pagination/filter semantics remain unchanged.
- Deletion tests: owner and admin authorization; active ad/history/saved-reference restrictions; retention of leads/messages/analytics; share revocation; image reference handling; audit events; partial-failure/transaction behavior.
- Lifecycle tests: full cross product of available/reserved/sold/rented/unavailable with draft/pending/published/rejected/paused/ended/removed.
- QA database test: pre/post record and index checks in an isolated database only; never use production data for mutation scenarios.

## 12. Required Approval Before Implementation

Approval is required before any of the following:

1. Direct access to a remote database, Atlas/provider console, production/QA backup, or audit/change-stream logs.
2. Any source-code change, including removing the GET upsert or changing deletion policies.
3. Any migration, data repair, index creation/change, cleanup, restoration, or database write.
4. Any property hard-delete/soft-delete behavior change or retention/cascade policy.
5. Any test that creates or mutates database records, including QA records, unless separately authorized with the target QA database identified.

At the original report completion, implementation required explicit approval. Subsequent user instructions authorized limited source and regression-test changes while continuing to prohibit production database access, database writes, migrations, data cleanup, dependency changes, and unrelated work. The approved follow-up is recorded in section 14.

## 13. Evidence and File References

- GET route: `backend/src/modules/properties/properties.controller.ts`, `PropertiesController.findAll()` and `findOne()`.
- GET business logic and helper: `backend/src/modules/properties/properties.service.ts`, `findAll()`, `findById()`, `getAgentRecentActivity()`, `findAdvertisementsByAgent()`, `submitForAdvertising()`, `ensureLegacyAdvertisements()`, `getPublishedAdvertisement()`, `findByAgent()`.
- Property/ad structure: `backend/src/modules/properties/schemas/property.schema.ts`; `backend/src/modules/properties/schemas/property-advertisement.schema.ts`.
- Agent/admin property removal: `backend/src/modules/properties/properties.controller.ts`, `PropertiesController.archive()` and `restore()`; `backend/src/modules/properties/properties.service.ts`, `PropertiesService.archive()`, `restore()`, and `findByIdForManager()`.
- Admin deletion/moderation: `backend/src/modules/admin/admin.controller.ts`, `AdminController.deleteProperty()` and `adminAdvertisementAction()`; `backend/src/modules/admin/admin.service.ts`, `deleteProperty()`, `adminPropertyAction()`, `adminAdvertisementAction()`, `moderateProperty()`.
- Related records: `backend/src/modules/buyer/schemas/saved-property.schema.ts`; `backend/src/modules/crm/schemas/lead.schema.ts`; `backend/src/modules/crm/schemas/property-conversation.schema.ts`; `backend/src/modules/crm/schemas/property-message.schema.ts`; `backend/src/modules/properties/schemas/property-analytics-event.schema.ts`; `backend/src/modules/properties/schemas/property-location-share.schema.ts`.
- Delete request confirmation DTO: `backend/src/modules/admin/dto/admin-delete.dto.ts`.
- Mongoose timestamp behavior inspected from installed source: `backend/node_modules/mongoose/lib/helpers/update/applyTimestampsToUpdate.js`; ad schema enables timestamps.
- Focused lifecycle tests are in `backend/test/property-advertisement-analytics.spec.ts`.
- Database availability evidence: TCP probe to `127.0.0.1:27017` failed. No DB query or endpoint request was made for this phase.

## 14. Authorized Source-Only Implementation Follow-up

The following changes were made under subsequent user authorization. No database connection, property endpoint, migration, seed, cleanup, index operation, or database write was used.

### Read paths

- Removed `ensureLegacyAdvertisements()` and all of its call sites. It no longer creates advertisements from public listing/detail reads, agent listings/ads/activity reads, or analytics lookup.
- Explicit advertisement submission remains a write operation: `submitForAdvertising()` uses its existing `POST` flow to create or update the linked advertisement. It does not backfill unrelated legacy properties.
- Public listing results continue to require a published advertisement when the advertisement model is available. Legacy published property records that lack an advertisement will no longer be surfaced by a GET as a side effect; any desired backfill requires a separately approved, reviewed maintenance plan.
- This source change prevents future request-driven upserts after deployment. It does not determine whether the three earlier audit requests changed any database records.

### Agent property removal and retention

- `DELETE /api/v1/properties/:id` now requires the explicit `ARCHIVE PROPERTY` confirmation body and sets the reversible `agentArchived` state rather than deleting the canonical property.
- `PATCH /api/v1/properties/:id/archive` restores the property with the `RESTORE PROPERTY` confirmation. Restoration does not republish an advertisement.
- Archiving ends active/pending/paused advertisements and revokes unexpired location shares. It preserves the property ID, advertisement record, analytics, photos, saved-property references, leads, conversations, and messages.
- Archived properties are excluded from public property queries, buyer search/recommendations, and new visitor/buyer conversations. Existing agent ownership checks remain in place.
- The agent listings UI now labels the action Archive/Restore and explains that related business history is retained.
- The new schema fields (`agentArchived`, `agentArchivedAt`, `agentArchivedBy`) have defaults/optional values; no database index was added or changed.

### Remaining retention limitation

The separate Admin hard-delete workflow was not changed. Its existing lead/conversation guards remain, but it can still physically delete a property and its advertisement while retaining analytics and may leave other references (for example saved-property records) pointing to a deleted property ID. Review and approval of a platform-wide admin purge/retention policy is still required; routine agent removal no longer uses this hard-delete path.

### Verification and limitations

- Backend property advertisement/lifecycle regression tests: **9 passed**. Tests use mocks and do not connect to MongoDB.
- Backend Nest build: **passed**.
- Frontend TypeScript check (`tsc --noEmit`): **passed**.
- No browser E2E, live API, database inspection, historical record comparison, or production/QA test was performed.
- The database remains uninspected and the effect of the prior three GET requests remains unknown.

## 15. Advertisement Lifecycle and Analytics Deduplication Follow-up

Follow-up review date: 2026-11-01. Source changes and mocked tests only; no database connection, index operation, migration, or live API request was performed.

### Publication lifecycle

- Moderation rejection now clears `approvedAt` and `publishedAt`; publishing requires an approved resumable status and an existing, available, visible property owned by the advertisement agent.
- Reserved inventory can be submitted into review, but both property moderation and advertisement approval reject it. Reserved inventory is not publicly published. Returning inventory to available does not automatically republish ended or rejected ads; the existing approval remains usable for an explicit resume after an inventory-driven end.
- No replica-set guarantee, transaction/session pattern, or transaction configuration exists in the inspected application source. The default MongoDB URI is standalone; the configured `MONGODB_URI` deployment target was not inspected. Accordingly, `updateAdvertisementStatus()` saves the advertisement before conditionally publishing the property and restores the former ad state if the property update fails. This compensation is not atomic; ambiguous network failures or a failed compensation can still require operational reconciliation.

### Analytics deduplication index requirements

The previous `exists()` query and time-bucket `dedupeKey` alone did not serialize concurrent requests crossing a bucket boundary. The source now uses an atomic reservation document in `property_analytics_deduplication`, with indexes declared by `PropertyAnalyticsDeduplicationSchema`:

- Unique reservation identity: `{ key: 1 }`, `{ unique: true }`.
- Expiration cleanup: `{ expiresAt: 1 }`, `{ expireAfterSeconds: 0 }`.
- Existing analytics-event safeguard: `{ dedupeKey: 1 }`, `{ unique: true, sparse: true }`, declared by `PropertyAnalyticsEventSchema`.

The reservation is claimed with an upsert conditioned on `expiresAt <= now`; duplicate-key errors mean another request owns an unexpired reservation. The reservation lifetime matches the event-specific rolling window. Non-duplicate event insertion failures release the reservation; duplicate event insertion keeps it until expiry.

**Deployment requirement:** The source declarations do not prove that these indexes exist in any deployed database. Before enabling this code in a target environment, an authorized operator must inspect the target collection and index state, then safely provision/verify the exact unique and TTL indexes above (and the existing analytics-event unique sparse index) using the approved deployment process. At the time this section was written, `getDatabaseConfig()` enabled `autoIndex`; the production configuration is now operator-controlled and disables automatic index creation. No index was created, modified, or verified during this follow-up.

### Verification

- Advertisement lifecycle / analytics tests: **21 passed**.
- Admin moderation tests: **7 passed**.
- Backend build: **passed**.
- Frontend TypeScript check: **passed**.
- `git diff --check`: **passed**.
- Tests use mocks; no browser E2E, database, production, or deployment-index verification was performed.

## 16. Location-share lifecycle security follow-up

- Location-share creation now requires an available, published, non-archived, non-hidden, non-removed property and a currently published advertisement owned by the same agent.
- New share records bind to the advertisement's current `publishedAt`. Access rechecks property visibility, inventory availability, advertisement status/ownership, and the publication timestamp. A link from an earlier publication cannot become valid again after the advertisement is republished.
- Existing share records do not have the new publication binding and therefore fail closed. Buyers need a newly issued link; no data backfill or database operation was performed.
- Active shares are revoked when inventory becomes unavailable and on admin hide/remove/unpublish, advertisement rejection/pause/end, and property moderation rejection. Existing archive revocation remains in place.
- The multi-document updates are not transactional. Access-time checks remain the enforcement boundary if a revocation write fails or state changes race.
- Focused mocked regressions cover blocked share creation for archived/hidden/removed/reserved properties, denied access while hidden, stale-link denial after republishing, and admin hide/rejection revocation.
- No production database, live API, migration, seed, cleanup, or index operation was used.

## 17. Admin hard-delete and production index policy

- Admin hard-delete is restricted by the admin controller's JWT/role guards and mutation rate limit. It now also requires a reason and a property already archived or admin-removed; ordinary removal remains reversible through Archive/Hide.
- The delete workflow requires a MongoDB transaction. It fails closed if no connection is available or the target topology does not support transactions; no non-transactional fallback runs.
- Within the transaction, lead and conversation history block deletion (messages are retained through their conversation); duplicate advertisements block deletion; saved-property rows are removed; notifications are retained with their `propertyId` cleared; active location shares are revoked; the linked advertisement and property are removed; and an audit record is written.
- Analytics events and user reports are intentionally retained. Admin activity is written in the same transaction. Uploaded image files are intentionally retained rather than deleted by hard-delete, avoiding deletion of any file still referenced by another property. This can leave unreferenced assets and requires a separately designed, reference-safe garbage-collection process.
- Transaction-backed cleanup is atomic only on a MongoDB replica set or sharded deployment that supports transactions. Standalone MongoDB does not support the workflow and the hard-delete request must fail without falling back to sequential writes.
- Production Mongoose `autoIndex` is now disabled; development/test remain automatic. Operators must follow [ANALYTICS_INDEX_OPERATIONS.md](./ANALYTICS_INDEX_OPERATIONS.md) to preflight and verify exact deduplication unique and TTL indexes before relying on analytics concurrency guarantees.
- Mocked tests cover archive-only eligibility, admin endpoint guards, references, duplicate advertisements, transaction cleanup/audit failure, and partial deletion. They do not prove transaction behavior or index presence in a real deployment.
- No production database, migration, index operation, or data cleanup was performed.
