# Registration and MongoDB Atlas QA Report

**Audit date:** 2026-10-28  
**Scope:** Registration/login, Atlas configuration and connection, frontend dashboard exports, and the `/agent/register` and `/post-property` routes.  
**Evidence:** PASS/FAIL results below are from commands or requests actually executed in this workspace. Secrets, tokens, and full test-account identifiers are intentionally omitted.

## 1. Project Architecture Discovered

| Layer | Technology / entry |
|---|---|
| Frontend | Next.js 15 App Router, React 19, TypeScript; `frontend/src/app` |
| Backend | NestJS 11, Express, TypeScript; `backend/src/main.ts` |
| Database | MongoDB Atlas through Mongoose 8 |
| Authentication | bcrypt password hashes; JWT bearer tokens; buyer/agent/admin roles |
| Validation | `class-validator`/`class-transformer`, global Nest `ValidationPipe` |
| API prefix | `/api/v1` |
| API base URL | `NEXT_PUBLIC_API_BASE_URL`; defaults to `http://127.0.0.1:5000/api/v1` |
| Package managers/scripts | npm; build scripts in each package; backend includes `test:registration` |

The normal backend loads `ConfigModule` before `MongooseModule.forRootAsync` and includes auth, users, properties, CRM, and admin modules. The documented analytics demo mode is an in-memory mode without auth/database and was not used for registration tests.

## 2. Root Cause of Confirmed Issues

1. **Registration in the committed baseline:** the form submit handlers did not call the auth API, so submitting the UI could not create or authenticate a real account. The current worktree contains frontend API integration; browser tests now confirm it works.
2. **Atlas database selection:** the local ignored `backend/.env` had a valid Atlas SRV host and configured user but no database path. It now selects the documented `pak_real_estate` database.
3. **Environment-file discovery:** default `.env` lookup depended on the process working directory. `backend/src/app.module.ts` now resolves `backend/.env` from the module path for both source and compiled runs.
4. **Dashboard build exports:** the agent dashboard imports `RecentActivity` and `AGENT_PROFILE`. The current definitions/imports were inspected: `RecentActivity` reads the agent store’s notifications and renders recent entries/empty state; `AGENT_PROFILE` supplies the profile values used by the dashboard page and top bar. Both exports are present, and the final frontend build passes. No further changes to those definitions were needed in this continuation.
5. **Confirmed 404 routes:** `/agent/register` and `/post-property` had no matching App Router pages. The marketing CTAs already linked to both paths, while the existing implementations were `/register` and `/agent/add-property`.
6. **Listing status display:** the API persisted new listings as `pending_approval`, but the submit preview mapped every non-published status to `Draft`. The form and CRM API mapping now display `Pending Review` for that server status.

## 3. Files Changed / Configuration

The worktree was already dirty before this continuation. The following fixes are present in the current worktree and were validated; this audit did not overwrite unrelated changes:

- `backend/.env` — ignored local-only file; URI selects `pak_real_estate`. Existing credentials were preserved. The file is not tracked by Git.
- `backend/src/app.module.ts` — resolves backend `.env` independently of launch directory.
- `frontend/src/lib/agent-dashboard-mock-data.ts` — exports the dashboard’s `AGENT_PROFILE`.
- `frontend/src/components/crm/AgentDashboardWidgets.tsx` — exports store-backed `RecentActivity` with recent-notification and empty states.
- `backend/test/auth-registration.spec.ts` and `backend/package.json` — eight DTO regression tests and their npm script.
- `LOCAL_DEVELOPMENT.md` — documents Atlas database selection and URI-encoding guidance.
- `frontend/src/app/(auth)/agent/register/page.tsx` — adds `/agent/register` as a thin wrapper over the existing registration form with the agent role fixed.
- `frontend/src/app/(auth)/register/page.tsx` — adds the optional fixed-role mode; the existing `/register` role selector remains unchanged.
- `frontend/src/app/(auth)/login/page.tsx` — honors a same-origin `returnTo` path after login, with the normal role dashboard as fallback.
- `frontend/src/app/(public)/post-property/page.tsx` — adds `/post-property`, redirects unauthenticated visitors to login with a return path, and limits the form UI to agent/admin roles.
- `frontend/src/components/crm/AddPropertyForm.tsx` — reuses the real property API flow and accurately describes admin review; maps `pending_approval` to “Pending Review”.
- `frontend/src/components/crm/LeadPipeline.tsx` and `frontend/src/types/crm.ts` — keep CRM property status labels aligned with backend states.

`git check-ignore -v backend/.env` confirmed the file is ignored. The URI was parsed without displaying credentials: expected Atlas host and username matched, a database was selected, and credential decoding succeeded. Reserved URI characters must be percent-encoded if present in username/password.

## 4. MongoDB Atlas Connection Status

**PASS — verified with Mongoose against the configured application database.** The configured SRV hostname matched `cluster0.gqtqopt.mongodb.net`, Mongoose selected `pak_real_estate`, and an `admin().ping()` returned `ok: 1`. No database credentials were output.

Registration and property test writes were directed to the separate `pak_real_estate_qa` database on the same configured Atlas cluster. No account or listing data was added to `pak_real_estate`, and no existing data or collection was deleted or modified. The synthetic QA agent and test listings were retained in the QA database; they were not deleted.

## 5. Registration and Login Results

| Scenario | Expected | Actual | Status |
|---|---|---|---|
| Valid buyer registration through browser | Create account, return token, route to buyer dashboard | HTTP 201; successful route to `/buyer` | PASS |
| Invalid email in browser | Block form submission | Browser email validity blocked submission | PASS |
| Valid registration API response | Success envelope, user ID, token; omit hash | HTTP 201; expected envelope/user/token; no password hash returned | PASS |
| Invalid email API request | Reject request | HTTP 400 | PASS |
| Weak password API request | Reject request | HTTP 400 | PASS |
| Missing fields / invalid phone / admin role / mass-assignment fields | Reject DTO | Rejected by validation regression tests | PASS |
| Duplicate email | Conflict without duplicate account | HTTP 409 | PASS |
| Concurrent duplicate email requests | At most one created account | One HTTP 201 and one HTTP 409 | PASS |
| Valid login through browser | Return token and route to buyer dashboard | HTTP 200; successful route to `/buyer` | PASS |
| Incorrect login password | Reject credentials | HTTP 401 | PASS |
| Authenticated profile request | Return the registered user’s profile | HTTP 200 with bearer token | PASS |
| Persisted test user | User record exists, with hash and no plaintext password | Record found in `pak_real_estate_qa`; bcrypt-format hash present; plaintext password field absent | PASS |

The test account was clearly marked with the display name **Registration E2E QA** and a generated `qa-*` address under `example.test`. A separate generated account was used for browser registration/login. Account identifiers, passwords, and tokens are omitted.

## 6. Tests Executed

- `backend: npm run start:dev` — started successfully on isolated port 5101 using the Atlas QA database.
- `frontend: npm run dev -- --port 3101` — started successfully and served `/register`.
- `backend: npm run test:registration` — **PASS**, 8 passed, 0 failed.
- `backend: npm run build` — **PASS**.
- `frontend: npm run build` — **PASS** in an isolated temporary frontend copy, including production compile, lint/type validation, and generation of all 19 static pages.
- API registration/login/persistence/duplicate/profile checks — **PASS**, as listed above.
- Atlas application database connectivity and ping — **PASS**.
- CORS preflight — configured QA origin allowed; unrelated origin not allowed.
- `git diff --check` — **PASS** (only existing Git line-ending warnings were emitted).

The QA backend and isolated production frontend were stopped after testing. The pre-existing frontend dev server belonged to the current user and this project; after the build-cache collision it was restarted on port 3000 and left running. The pre-existing backend listener on port 5000 was not modified.

## 7. Failed Checks and Remaining Blockers

- The first in-place frontend production build compiled and passed type/lint validation, then failed while collecting page data with `PageNotFoundError: Cannot find module for page: /_document`. A pre-existing Next dev server on port 3000 was using the same `.next` directory. The production build was rerun successfully in an isolated copy of the frontend, using the same source changes.
- The build collision temporarily left missing `/_next` chunks on the existing dev server. That exact project process was restarted; subsequent checks of both exact `localhost:3000` URLs returned HTTP 200, rendered the expected UI, and loaded without failed Next assets.
- The isolated frontend production build, backend build, registration tests, Atlas QA registration/property requests, persistence read-back, and `git diff --check` passed.
- Lint was not separately invoked: the backend lint script uses `--fix` and the worktree contains unrelated uncommitted changes. The frontend build’s lint/type validation completed successfully.
- The entire marketplace, CRM, and admin application was not exercised end to end. Responsive-device coverage, accessibility, JWT expiry/tampering, and the full role/ACL matrix remain unverified.

## 8. Security and Configuration Notes

- `.env` is ignored and server-only. Do not copy its URI into frontend configuration or commit it.
- Keep the Atlas database user least-privileged and Atlas Network Access restricted to the required host/IP range.
- Keep `JWT_SECRET` random and at least 32 characters; its value was never printed or included here.
- Auth tokens/user details are stored in browser `localStorage`; an XSS issue could expose them.
- Logout/revocation, password reset, and email/phone verification are not implemented.
- Browser password confirmation is not implemented; there is no confirmation field to validate.

## 9. Manual Steps Required

No manual action is required to make the tested Atlas connection or registration flow work in this environment. For deployment, confirm that the Atlas IP access list and database user permissions include the deployment environment, and configure server-side `MONGODB_URI` and `JWT_SECRET` securely.

Use a separate QA database for future synthetic registrations; do not create test accounts in a production application database.

## 10. Missing Route and Property Posting QA

The route omission was confirmed by inspecting `frontend/src/app`, route groups, `next.config.ts`, and the links in `DualCTA.tsx`. Route groups do not add URL prefixes, and there were no rewrites or middleware routes that could serve these paths. The actual implementations are reused rather than duplicated: registration submits to `/auth/register`, and property submission uses the existing `/properties` API backed by `CreatePropertyDto` and the agent/admin JWT guard.

| Test ID | Scenario and steps | Expected result | Actual result | Status |
|---|---|---|---|---|
| ROUTE-01 | Open `http://localhost:3000/agent/register` after restarting the project dev server | Agent registration form, not the 404 page | HTTP 200; existing form rendered with five required fields, required agency field, and no buyer-role toggle | PASS |
| ROUTE-02 | Submit the agent form with an invalid email | Browser validation blocks request | Email input invalid; no `/auth/register` request was sent | PASS |
| ROUTE-03 | Register a synthetic agent against the isolated QA API/database | Agent is created and role is agent | HTTP 201; response role `agent`; frontend routed to `/agent` | PASS |
| ROUTE-04 | Register again using that synthetic agent’s email | Duplicate is rejected with a clear message | HTTP 409; form displayed “A user with this email address already exists” | PASS |
| ROUTE-05 | Open `http://localhost:3000/post-property` without a session | Redirect to login and preserve posting destination | Redirected to `/login?returnTo=%2Fpost-property`; login form rendered | PASS |
| ROUTE-06 | Log in as the synthetic agent from that login page | Return to the requested posting form | Login HTTP 200; returned to `/post-property`; form rendered | PASS |
| ROUTE-07 | Visit posting route with a buyer role in browser storage | Do not show agent submission form | “Agent account required” state with links to switch account/register as agent | PASS |
| ROUTE-08 | Submit a zero-price listing | Show validation error and do not call API | “Enter a valid price greater than zero”; zero property API requests | PASS |
| ROUTE-09 | Submit a valid synthetic listing through `/post-property` | Save through the existing API and show success only after response | `POST /api/v1/properties` returned HTTP 201; success state appeared | PASS |
| ROUTE-10 | Read the created listing back with the authenticated manage endpoint | Same persisted record is returned | `GET /properties/manage/{id}` returned HTTP 200 with matching ID and status `pending_approval` | PASS |
| ROUTE-11 | Check the submitted listing status in the success preview | Show the server’s review state | After status-mapping fix, preview displayed “Pending Review” for `pending_approval` | PASS |

The database submission checks used only the configured Atlas cluster’s `pak_real_estate_qa` database, with a generated `example.test` account and synthetic Lahore listing details. The application database was not written. One synthetic QA agent and two synthetic listings remain in the QA database; no user or listing data was deleted. The existing form accepts an HTTPS image URL; a binary file-upload pipeline is not implemented and was not claimed as tested.

The current frontend dev server is running on port 3000. Because `next dev` and `next build` share `.next` by default, stop the dev server before running an in-place production build; the verified production build used an isolated copy to avoid changing that cache.

## 11. Final QA Status

**PASS for the exercised registration, login-return, and property-posting workflows.** The missing routes now render their intended forms at the exact requested URLs; synthetic agent registration, duplicate handling, login return, buyer-role gating, invalid-price validation, listing creation, and persistence read-back were verified. New listings correctly remain pending admin approval. The configured application database previously passed a MongoDB ping and received no test writes. Backend build, frontend isolated production build/type validation, registration DTO suite, and final `git diff --check` passed. The existing local dev server has been restored on port 3000. Broader non-auth feature and security regression coverage remains incomplete as noted above.

## 12. Secure Exact-Location Sharing QA (2026-10-29)

### Implementation and security boundaries

- Public property list/detail responses are serialized through an allowlist containing only approximate city and area. Legacy exact address/coordinate schema paths and encrypted private location data are excluded from default Mongoose selection.
- Private coordinates and optional entrance instructions are encrypted with AES-256-GCM before persistence. Saving an encrypted location also unsets legacy address/coordinate fields.
- New share links are cryptographically random, contain the token only in the URL fragment, and persist only a SHA-256 token hash. Each share is bound to the invited existing buyer account, expires, and can be revoked. Access requires login and a matching buyer ID; forwarded, expired, revoked, invalid, or legacy-plaintext-only links are rejected.
- Owner/admin-only management routes check ownership on every request. Public property creation rejects exact coordinates.
- The agent listings UI provides map/coordinate selection, buyer email binding, copy and WhatsApp draft actions, and revocation. The WhatsApp action opens a draft for human review; it does not send automatically.
- Authorized recipients see the precise location only after the backend validates their share. Directions open Google Maps or OpenStreetMap; routing uses those providers' current data and does not guarantee road access or closure detection.

### Exact-location tests and results

| Test ID | Scenario / steps | Expected result | Actual result | Status |
|---|---|---|---|---|
| LOC-01 | Serialize a public property containing legacy and private exact fields | Only approximate location is returned | City/area remained; coordinates, exact address, encrypted/private fields, and moderation notes were absent | PASS |
| LOC-02 | Exercise public listing service projection | Every public result is sanitized | Returned record omitted exact coordinates | PASS |
| LOC-03 | Save a private entrance as an authorized owner | Persist ciphertext and clear legacy exact fields | Unit test decrypted the stored ciphertext with a test-only key and verified the update unsets all three legacy fields; plaintext address was absent from the update | PASS |
| LOC-04 | Encrypt, decrypt, and tamper with private location data | Correct key returns the location; tampering is rejected | Authenticated AES-GCM round-trip succeeded; altered ciphertext was rejected | PASS |
| LOC-05 | Create a buyer-directed share | Store only a token hash and return a private link | Test verified 43-character token, hash-only persistence, buyer binding, expiry, and fragment-based URL | PASS |
| LOC-06 | Attempt share creation as an unrelated agent or for a non-buyer | Deny without creating a share | Ownership failure and non-buyer recipient rejected; no share persisted | PASS |
| LOC-07 | Try legacy plaintext coordinates for a new share/access | Do not issue or honor an unencrypted share | Both legacy-only creation and access were rejected | PASS |
| LOC-08 | Access a valid link as its invited buyer | Return exact location and limited property/agent summary | Expected location and agent summary returned in unit test | PASS |
| LOC-09 | Access invalid, expired, revoked, and forwarded links | Reject each without revealing location | All four cases returned the same not-found response in unit tests | PASS |
| LOC-10 | Submit out-of-range exact coordinates and exact fields on public create | Reject invalid or public exact-location input | DTO validation rejected both cases | PASS |
| LOC-11 | Open `/shared-location` in production browser without a token | Render safe unavailable state without location details | Browser rendered “Private location unavailable”; no exact coordinates were shown | PASS |
| LOC-12 | Save/share a location using the real configured database | Persist only encrypted location/share metadata | Not attempted: `PROPERTY_LOCATION_ENCRYPTION_KEY` is absent from the local backend environment. No feature test records were written. | BLOCKED |
| LOC-13 | Authenticated agent/buyer browser workflow, WhatsApp draft, and provider directions | Verify real authenticated interactions | Not executed; no configured encryption key/test recipient session was available. Unit tests/build do not prove these live interactions. | BLOCKED |

### Commands and environment status

- `backend: npm run test:location-sharing` — **PASS**, 19 tests, 0 failures.
- `backend: npm run test:registration` — **PASS**, 8 tests, 0 failures.
- `backend: npm run build` — **PASS**.
- `frontend: npm run build` — **PASS**, production compile, lint/type validation, and generation of 20 static pages.
- Production frontend route smoke check on port 3100 — HTTP 200; browser showed the expected no-token unavailable state. The temporary server was stopped after the check.
- `git diff --check` — **PASS**; Git emitted existing line-ending warnings.
- The frontend manifest now declares Leaflet and its TypeScript types so a clean install in `frontend` can resolve the map implementation. The install output reported five dependency advisories (four high, one critical); they were not individually audited or upgraded as part of this feature.
- A sanitized check found the active non-empty `MONGODB_URI` assignment points to the expected Atlas host and application database; `backend/.env` remains Git-ignored. This feature pass did not re-ping Atlas. The preceding report recorded a successful Atlas ping, but that is not evidence that private-location endpoints work with the current configuration.

### Feature files changed

| File(s) | Reason |
|---|---|
| `backend/src/modules/properties/properties.service.ts`, `properties.controller.ts`, `properties.module.ts` | Add sanitized public reads, owner/admin management, encrypted saves, recipient-bound create/access/revoke endpoints, and route wiring |
| `backend/src/modules/properties/property-location-sharing.utils.ts`, `schemas/property.schema.ts`, `schemas/property-location-share.schema.ts` | Encrypt exact coordinates, allowlist public fields, hide private data by default, and persist hashed expiring/revocable share metadata |
| `backend/src/modules/properties/dto/manage-property-location.dto.ts`, `dto/create-property.dto.ts`, `backend/src/modules/users/users.service.ts` | Validate private-location input, reject exact coordinates on public creation, and resolve only eligible registered buyer recipients |
| `backend/src/config/configuration.ts`, `backend/.env.example` | Validate optional encryption key and document the required server-side setting |
| `backend/test/property-location-sharing.spec.ts`, `backend/package.json` | Add focused regression coverage and a location-sharing test script |
| `frontend/src/components/crm/ExactLocationMap.tsx`, `ShareExactLocationControl.tsx` | Add exact entrance selection, sharing, copy/WhatsApp draft, and revocation UI |
| `frontend/src/app/(dashboard)/agent/listings/page.tsx`, `frontend/src/app/(public)/shared-location/page.tsx`, `shared-location-client.tsx`, `frontend/src/app/layout.tsx` | Wire agent management and authorized recipient experience; load map styles |
| `frontend/src/app/(public)/property/[id]/page.tsx` | Keep public property detail display approximate |
| `frontend/package.json`, `frontend/package-lock.json` | Declare Leaflet and its TypeScript types in the frontend package |
| `LOCAL_DEVELOPMENT.md`, `QA_REGISTRATION_REPORT.md` | Document key generation/provider limitations and record QA evidence |

### Remaining setup and limitations

1. Configure `PROPERTY_LOCATION_ENCRYPTION_KEY` in the backend secret environment before using private-location management. It must be a stable, base64-encoded random 32-byte key; the generation command is documented in `backend/.env.example` and `LOCAL_DEVELOPMENT.md`. Back it up securely and do not rotate without migrating ciphertext. The local key is currently absent, so the API intentionally returns HTTP 503 for new saves/shares.
2. Provide an isolated QA buyer account and use a QA database before running live API tests. Do not test by creating records in the application database.
3. OpenStreetMap tiles and Google Maps directions depend on external provider availability and their own road data. No provider API key is required by the current URL-based directions implementation; private roads and closures cannot be guaranteed.
4. The feature suite is unit-level plus a route smoke check. It does not claim live database persistence, authenticated browser workflow, WhatsApp delivery, routing correctness, or external map availability.

## 13. Public Property Listing and Details QA (2026-10-29)

### Root cause and changes

- The home page's `PropertyGrid` rendered a different legacy card component that had no detail link at all. The `/properties` results page rendered three hard-coded catalog records with IDs that were not database IDs, and `/property/[id]` displayed a fixed sample property instead of requesting the selected ID. Thus card interactions were absent on the home page and the existing detail route could not show listing-specific data.
- The home featured grid and results page now load published listings through the existing `GET /api/v1/properties` endpoint. Results use the API `_id` as the route ID and display actual images and listing fields; controls and errors reflect the returned data instead of sample stock listings.
- Listing cards expose a full-card detail link, including the image and title, while keeping WhatsApp and Details controls as separate actions.
- The existing backend `GET /api/v1/properties/:id` detail endpoint already returned an allowlisted public property with its full image array and populated public agent fields; no duplicate endpoint was added. The dynamic `/property/[id]` page now fetches that endpoint and renders the real title, description, pricing/purpose/type, area, available features, all images, public agent contacts, date/views, and approximate city/area. The page handles loading, missing IDs, API errors, unavailable images, an empty gallery, thumbnails, previous/next navigation, and lightbox display. Exact coordinates and private address fields are not displayed or requested.

### Tests executed and actual results

| Test ID | Scenario / steps | Expected result | Actual result | Status |
|---|---|---|---|---|
| PROP-01 | Inspect home-grid card implementation and routes | Every actual listing has an ID-based detail destination | Root cause confirmed: home used the unlinked legacy card; `/properties` used mock IDs and detail page placeholders. Fixed both surfaces to use API IDs. | PASS |
| PROP-02 | `GET /api/v1/properties?limit=1` against configured application API | Return published real listings, with no private fields | HTTP 200; zero published listings in that database at test time. No records were written. | PASS |
| PROP-03 | `GET /api/v1/properties?limit=1` against temporary API configured for `pak_real_estate_qa` | Safely verify read-only API shape | HTTP 200, success envelope valid, zero QA published listings. No test records were written. | PASS |
| PROP-04 | Open `/properties` in production browser against the isolated QA API | Render API-backed results or a clear empty state | API request succeeded; page displayed “0 published properties” and the empty state, with no stock/mock cards. | PASS |
| PROP-05 | Request a valid-format but absent ObjectId from QA detail endpoint | Return a genuine not-found response | `GET /api/v1/properties/0123456789abcdef01234567` returned HTTP 404. | PASS |
| PROP-06 | Open `/property/not-a-database-id` in browser | Avoid a crash; show an understandable unavailable state | Backend validation returned HTTP 400; page displayed “Property unavailable” with a browse link. | PASS |
| PROP-07 | Browser test with Playwright-intercepted, non-persisted QA fixture; click the card image and title | Both navigate to `/property/<actual-id>` | Both click paths navigated to `/property/qa-detail`; this verifies UI wiring only, not a real database listing. | PASS |
| PROP-08 | In the same explicitly intercepted UI fixture, inspect detail gallery and click thumbnail 2 | Display all listing image URLs and switch the primary image | Three fixture images appeared as thumbnails; primary alt changed from photo 1 to photo 2. Lightbox opened successfully. No fixture was sent to or stored in MongoDB. | PASS |
| PROP-09 | Check details in intercepted fixture | Render available details/contacts and only approximate location | Title, description, sale price, area, bedroom/bathroom/parking counts, agent contacts, date, and area/city rendered. No exact-coordinate text rendered. | PASS |
| PROP-10 | Set production browser viewport to 390 px while displaying property details | Avoid horizontal overflow | Document width equaled viewport width; horizontal overflow was false. | PASS |
| PROP-11 | Use real database listings to test a real card click and its own stored photos | Navigate to that real record and display its own full gallery | Blocked: both checked databases returned zero published listings. No real listing was available to click without creating new data. | BLOCKED |
| PROP-12 | Use Playwright-intercepted no-image and broken-image listing fixtures | Show photo-empty/broken-image fallbacks without breaking page layout | The empty gallery message rendered for a listing with no images; an intercepted 404 image rendered the unavailable-image fallback. These were UI fixtures, not database records. | PASS |
| PROP-13 | Intercept a detail API request with HTTP 503 | Show a visible failure state instead of failing silently | Detail page displayed the API error in its unavailable state. | PASS |

The browser UI click test used Playwright network interception with a clearly named synthetic QA listing; this exercised the real card and detail components without making database writes. It is not claimed as a live property-record end-to-end test.

### Build, regressions, and environment

- `frontend: npm run build` — **PASS**, Next production compilation, lint/type checks, and 20 generated pages. A JSX syntax error introduced while wiring full-card navigation was caught on the first attempt, corrected, and followed by a successful isolated production build.
- Because a pre-existing frontend dev server was already running and Next shares `.next` between dev/build, in-place builds corrupted chunks served by that process. Final browser checks used a temporary isolated frontend copy and a temporary backend on port 5102 pointed at the existing QA database. The QA API received read-only requests only. No application or QA property records were created/modified. Temporary servers were stopped after verification.
- `backend: npm run test:location-sharing` — **PASS**, 20 tests including public detail image/agent fields and coordinate privacy.
- `backend: npm run test:registration` — **PASS**, 8 tests.
- `backend: npm run build` — **PASS**.
- `git diff --check` — **PASS**; existing Git line-ending warnings remain.

### Files changed for this task

| File(s) | Reason |
|---|---|
| `frontend/src/types/marketplace.ts`, `frontend/src/lib/public-properties.ts` | Define public API listing shapes and normalize real `_id`/agent/image data for marketplace use |
| `frontend/src/components/marketplace/PropertyGrid.tsx` | Replace mock Zustand home feed with real public listings, loading/error/empty states, and existing purpose/type filters |
| `frontend/src/components/marketplace/property-card.tsx` | Make the complete card, image, and title navigate by real ID without intercepting WhatsApp actions |
| `frontend/src/app/(public)/properties/page.tsx` | Replace hard-coded search results with API-backed results and backend-supported filters |
| `frontend/src/app/(public)/property/[id]/page.tsx`, `property-details-client.tsx` | Fetch selected listing and render responsive real details/gallery/contact/location states |
| `backend/test/property-location-sharing.spec.ts` | Assert public property serialization preserves all images and permitted agent details while omitting email/exact coordinates |
| `QA_REGISTRATION_REPORT.md` | Record confirmed root cause, files, browser/API/build evidence, and no-listing blocker |

### Remaining verification

No published records were available in either the configured app database or isolated QA database during these checks. To verify the fully live image/gallery flow with stored production-shaped data, use an existing published QA listing (no production writes), then click its card and inspect the detail gallery. The page uses the existing API and does not fabricate fallback property photos.

## 14. Development Demo Listings and Next.js Build Cache (2026-10-29)

The user-reported screenshot showed the homepage stuck on “Loading published properties…” and the attached development log showed `Cannot find module './297.js'`/other missing webpack chunks after an earlier JSX parse failure. The JSX issue in the card component was corrected and the frontend production build passed. The missing chunk error was separately traced to the pre-existing frontend dev process and production build sharing the same `.next` output directory.

### Changes

- Added three clearly fictional development-only listings with local generated SVG placeholder images; demo cards and detail pages are visibly labeled “DEMO”/“not real”. The fixtures contain no real agent contact details and do not call/store data in MongoDB.
- Demo listings are available immediately while the API request runs, and remain visible when the API returns no records or fails. The UI also reports the API error, so sample data cannot be mistaken for a successful live API response.
- Clicking a demo card opens its complete matching detail page using local fixture data; it does not call the backend for a fabricated database ID.
- Production builds do not enable demo data unless `NEXT_PUBLIC_ENABLE_DEMO_PROPERTIES=true` is explicitly set. Development is enabled by default; `NEXT_PUBLIC_ENABLE_DEMO_PROPERTIES=false` disables it locally.
- Configured Next.js `distDir` as `.next-dev` in development and `.next` in production. This avoids the unsupported `next dev --dist-dir` flag (Next.js 15.1.7 does not accept that CLI option) and separates dev/build caches to prevent the missing webpack chunk collision shown in the screenshot. Restart an already-running old dev server once so it adopts the new directory.

### Test results

| Test ID | Scenario / steps | Expected result | Actual result | Status |
|---|---|---|---|---|
| DEMO-01 | Open development homepage while API response is delayed 3 seconds, then return an empty list | Immediately show usable, explicitly identified dummy cards without a loading stall | Three demo badges were visible after the page shell rendered and before the delayed API replied; the page did not show “Loading published properties…”. After the response, three cards remained. | PASS |
| DEMO-02 | Open homepage with API returning HTTP 503 | Keep demos visible and disclose API issue without replacing cards with a full-page error | Three cards remained visible, one API-unavailable alert rendered, and no fatal red error panel appeared. This caught and fixed the conditional that had hidden demo cards after API errors. | PASS |
| DEMO-03 | Open `/properties` with API returning HTTP 503 | Show demos and a visible API warning | Three demo cards and warning rendered in the browser. | PASS |
| DEMO-04 | Click the demo property card and view the detail page | Open the matching local fixture without requesting a fabricated backend ID | Clicking the first card navigated to `/property/demo-lahore-house`; matching details, fictional notice, and gallery rendered. | PASS |
| DEMO-05 | Change detail gallery thumbnail and inspect mobile width/privacy | Switch image; avoid horizontal overflow and public exact coordinates | Second thumbnail changed the primary image; at 390px viewport browser content width matched viewport (384 CSS px after scrollbar); no coordinates/exact entrance appeared. | PASS |
| DEMO-06 | Run production build, then open production homepage with demo toggle unset | Build successfully and never expose demo listings in production | Final isolated `npm run build` succeeded; production browser showed no demo badges/notices. Backend API was unavailable in the isolated test server, so live listings could not load there. | PASS |
| DEMO-07 | Run `git diff --check` on changed files | No whitespace errors | Completed with exit code 0. | PASS |
| DEMO-08 | Run `npm run dev -- --port 3103` and inspect generated output directories | Start successfully with distinct development cache | Next.js 15.1.7 started with the supported config; both `.next-dev` and `.next` existed separately. The already-running user server on port 3000 was not touched and must be restarted to load this source/config change. | PASS |

No sample records were created in either Atlas database. The live property API previously returned zero published listings; that is why the dev UI displays explicitly labeled demo data. For production, create/publish real listings through the existing agent/admin flow rather than enabling demos.

The separate isolated production browser test could not reach a backend at the default `http://127.0.0.1:5000/api/v1` URL (browser reported a CORS/no-response failure). This was not a demo-data test failure: production correctly showed the API error and did not reveal demos. The controlled 503/empty-list browser checks exercised fallback behavior without touching any database.

## 15. Agent Listing Access and Buyer-Role Error (2026-10-29)

The reported `POST /properties` response was `User role 'buyer' is not authorized to access this resource. Required: [agent, admin]`. This is the intended backend authorization policy, not a database or listing-payload failure. The UI showed the agent CRM and listing form because the `/agent/*` layout did not verify the authenticated account role before rendering. The client-side account data and the server-authorized role can also be stale or disagree.

### Changes

- Added `frontend/src/components/crm/AgentAccessGuard.tsx` and wired it into the `/agent/*` layout. It queries the authenticated `/users/profile` endpoint and only renders the CRM/form for database-confirmed `agent` or `admin` accounts. A buyer sees an explanation and choices to sign in as an agent, or sign out and register an agent account. No client-side role value grants API access.
- Updated `backend/src/modules/auth/strategies/jwt.strategy.ts` to return the current role and email from the database user, rather than potentially stale JWT claims. This keeps role authorization consistent with the current account record. It does not promote or alter users.
- Added `backend/test/jwt-role.spec.js` and `npm run test:jwt-role` to assert that a stale buyer token claim cannot override a current database agent role and that deleted users remain unauthorized.

### Test results

| Test ID | Scenario / steps | Expected result | Actual result | Status |
|---|---|---|---|---|
| ROLE-01 | Browser-load `/agent/add-property` with profile API fixture role `buyer` and intentionally mismatched local `auth_user` role `agent` | Deny before showing form or CRM shell; offer agent-account next steps | API-confirmed `buyer` displayed; form and dashboard shell were absent; sign-in/register choices were present. | PASS |
| ROLE-02 | Browser-load `/agent/add-property` with profile API fixture role `agent` | Render existing agent form and CRM | Existing listing form and agent shell rendered. No listing POST was submitted. | PASS |
| ROLE-03 | `backend: npm run test:jwt-role` | Use database role over stale token role; reject missing database user | 2 tests passed, 0 failed. | PASS |
| ROLE-04 | `backend: npm run build` | Compile NestJS after JWT role source change | Build completed successfully. | PASS |
| ROLE-05 | `frontend: npm run build` in isolated copy | Compile/validate guarded agent routes without colliding with existing dev server cache | Build and type validation completed successfully; 20 routes generated. | PASS |
| ROLE-06 | Verify a real buyer account against the live Atlas profile endpoint and submit a listing as a real agent | Confirm this specific account's stored role and a permitted real listing submission | Not run in this continuation: browser tests used explicit profile API fixtures; no real user role was changed and no property was submitted. | BLOCKED |
| ROLE-07 | `backend: npm run test:registration` and `npm run test:location-sharing` | Check authentication and existing property authorization/privacy regressions | 8 registration tests and 20 location-sharing tests passed. | PASS |
| ROLE-08 | `git diff --check` | Ensure edited files have no whitespace errors | Completed with exit code 0; Git emitted only existing line-ending warnings. | PASS |

No account roles, listings, or database records were modified. To post with the current buyer account, sign in with an existing agent account, register a separate agent account, or ask an administrator to review/update the account's role. Buyer accounts remain unable to create property listings.

## 16. Backend Startup and Registration API Unavailable (2026-10-29)

The registration page showed `Unable to reach the API at http://127.0.0.1:5000/api/v1`, and the backend log ended with Node's `MODULE_NOT_FOUND` for `backend/dist/main`. Nest's TypeScript watch compilation reporting zero errors is not the same as starting the compiled production entry point; the production script attempted to launch a missing/unbuilt output file. The actual Nest build emits `backend/dist/main.js`.

### Changes

- Added the npm `prestart:prod` lifecycle script to run `npm run build` automatically before production startup. Updated the entry path to explicit `node dist/main.js`.
- Documented that `npm run start:dev` is the development path and `npm run start:prod` builds and launches the production entry file in `LOCAL_DEVELOPMENT.md`.

### Test results

| Test ID | Scenario / steps | Expected result | Actual result | Status |
|---|---|---|---|---|
| START-01 | Run `backend: npm run start:prod` when the compiled output could otherwise be stale/missing | Build first, then launch Nest without `MODULE_NOT_FOUND` | `prestart:prod` ran `nest build`; `node dist/main.js` launched and Nest reported application startup on port 5000. | PASS |
| START-02 | Request `GET http://127.0.0.1:5000/api/v1/properties` | Confirm the backend API is reachable | HTTP 200. Listing response content was not printed. | PASS |
| START-03 | Submit registration form with a synthetic QA name/email, valid-format test password, and intentionally invalid phone | Reach server-side registration validation, show a clear validation message, and do not create an account | HTTP 400 from the live API; form displayed “phone must be 10-15 digits, optionally starting with +”. No account was created. | PASS |
| START-04 | Check `GET /api/v1/health` on full backend | Confirm any documented health route | HTTP 404. The full backend does not currently register this route; the separate analytics-only demo mode documents its own health endpoint. Use `/api/v1/properties` or an actual registered API route to check connectivity. | NOT IMPLEMENTED |

The backend production-mode process started for verification is still running on port 5000 in this session, and the existing frontend remains on port 3000. No valid registration was performed against the configured application database because that would create a real persistent user. The browser test proves the API URL and server-side validation are reachable, but a successful account creation should be tested with a dedicated QA database/account rather than production data.

## 17. Admin Mock Data and Agent-to-Admin Moderation Audit

### Executive summary and confirmed root cause

The Admin Property Moderation page was not reading the property collection at all. It rendered `INITIAL_MODERATION_PROPERTIES` from `admin-mock-data.ts` through a Zustand property store, and its approve/reject buttons only changed client-side state. The Unsplash listings and inconsistent totals were therefore static examples, not evidence of persisted customer listings. The Overview page and Agent Approvals table also used hardcoded metrics/sample agents, and the sidebar displayed static badges. Those Admin views now use the protected Admin API; API errors are shown with Retry, and an empty response renders a genuine empty state rather than fixtures.

The supplied title, `5 marla house for rnt`, was searched in the configured application database using a read-only query and no matching property was found. No property ID was supplied. Thus the original listing's persistence in that database, exact status, and original purpose cannot be established from the available evidence. The screenshot's agent card alone does not prove a MongoDB write. A complete, disposable lifecycle was separately verified in the isolated `pak_real_estate_qa` database; it confirms that the current APIs persist and moderate submissions consistently, but does not retroactively prove the original listing was saved.

### Architecture, data flow, and status mapping

The frontend uses the existing API client and `/api/v1` backend. Agent submission calls `POST /properties`; the NestJS properties service writes a `Property` document to the configured Mongoose collection with the canonical `purpose` (`Sale` or `Rent`) and initial `pending_approval` status. Agent listing reads use `GET /properties/agent/my-listings`. The Admin pages now use JWT/admin-role protected `GET /admin/properties`, `GET /admin/stats`, and `GET /admin/agents`; property decisions use `PATCH /admin/properties/:id/moderate`. Agent verification remains a separate user-account operation at `PATCH /admin/agents/:id/verify`, not a property-status transition.

Admin property status totals are aggregated from the complete property collection, not the current page. Known statuses are zero-filled, unknown/legacy statuses remain represented in the total and `otherProperties`, and the Overview separates pending, published, rejected, draft, sold, and other records. A property decision is an atomic update limited to records still in `pending_approval`; only `published` and `rejected` are accepted, and rejection requires a reason. Public property queries continue to filter to `published`. The Admin response includes the actual image array and canonical purpose, while its location projection contains only city and area.

### Fixes and files changed

- `backend/src/modules/admin/admin.controller.ts`, `admin.service.ts`, and `dto/admin-properties-query.dto.ts` — protected list, agent, and aggregate endpoints; paginated real property reads; safe property projection; global status aggregates; pending-only moderation updates.
- `frontend/src/components/admin/PropertyModerationGrid.tsx` — replaced local mock state with API-backed records, aggregate counts, pagination, actual approve/reject calls, and error/retry/empty states.
- `frontend/src/components/admin/AdminOverviewDashboard.tsx` — replaced static KPI values with database aggregates; unsupported lead/revenue metrics are no longer presented as live.
- `frontend/src/components/admin/AgentApprovalTable.tsx` — replaced sample accounts and local-only verification with protected account reads and persisted verification.
- `frontend/src/components/admin/AdminAccessGuard.tsx`, `frontend/src/app/(dashboard)/admin/layout.tsx` — verify the current account role before rendering Admin screens; backend authorization remains authoritative.
- `frontend/src/components/admin/AdminSidebar.tsx` and Admin page components — removed static badges and mock-data imports.
- `frontend/src/components/crm/AddPropertyForm.tsx` — submit preview respects canonical purpose/type returned by the server.
- `backend/test/admin-moderation.spec.ts`, `backend/package.json` — regression tests and the focused Admin moderation test script.
- Deleted obsolete `frontend/src/lib/admin-mock-data.ts`, `frontend/src/lib/property-store.ts`, and `frontend/src/types/admin.ts`; no Admin source consumers remain.
- `QA_REGISTRATION_REPORT.md` — added this audit and actual test evidence.

### Test cases and actual results

| Test ID | Feature or scenario | Steps performed | Expected result | Actual result / evidence | Status |
|---|---|---|---|---|---|
| ADM-01 | Supplied agent listing trace | Read-only exact-title lookup in the configured application MongoDB | Identify the persisted property ID and status without changing data | No matching record was returned; no ID was supplied, so its original persistence remains unverified. | BLOCKED |
| ADM-02 | Remove Admin fixtures | Search Admin source/pages for the removed fixture arrays, static totals, and mock store imports | No production Admin page renders fallback examples or fake counts | `rg` returned no matches for fixture arrays, removed store imports, Unsplash, or reported static totals in Admin source/pages/libs. `git diff --check` completed cleanly. | PASS |
| ADM-03 | Agent-to-Admin persistence | In `pak_real_estate_qa`, register a synthetic agent, submit two unique properties, then read the agent list and Admin pending list | Same persisted IDs, pending status, canonical Rent purpose, and images appear to both authorized views | Both records were present in the owner list and Admin queue with `pending_approval`; purpose and actual image arrays matched. | PASS |
| ADM-04 | Authorization and moderation | Request Admin properties as a buyer; approve one QA property and reject the other through authenticated Admin APIs | Buyer denied; only Admin changes pending records; changes persist | Buyer received HTTP 403. The two QA records became `published` and `rejected`; owner reads reflected both transitions. | PASS |
| ADM-05 | Global counter reconciliation | Compare Admin statistics before submission, after two submissions, and after one approval/one rejection | Total and per-status counts include each record exactly once and reconcile | Total/pending rose by two; after review, pending returned to baseline, published/rejected rose by one each, and total remained baseline +2. | PASS |
| ADM-06 | Public visibility and location privacy | Request pending detail/list, then published detail/list after adding synthetic private address/coordinates to the QA property; inspect rejected listing | Pending/rejected hidden; published visible without private coordinates/address | Pending detail returned 404; only published item appeared in public list; public detail omitted address, latitude, longitude, and private location. | PASS |
| ADM-07 | Focused Admin unit tests | Run `npm run test:admin-moderation` | Validate canonical purpose/status, image list, private-location exclusion, counts, atomic update, conflict/not-found behavior | 3 passed, 0 failed. | PASS |
| ADM-08 | Auth and role regression tests | Run `npm run test:jwt-role` and `npm run test:registration` | Preserve current-DB role checks and registration behavior | JWT role tests: 2 passed. Registration tests: 8 passed. | PASS |
| ADM-09 | Location/privacy regression tests | Run `npm run test:location-sharing` | Preserve existing location privacy and sharing behavior | 20 passed, 0 failed (prior verified run in this work session). | PASS |
| ADM-10 | Backend build | Run `backend: npm run build` after Admin API/statistics changes | NestJS compiles | Build completed successfully. | PASS |
| ADM-11 | Frontend production build | Run `frontend: npm run build` in the isolated frontend copy | Admin dashboard compiles and types validate without colliding with the active Next cache | Production build, type validation, and generation of 20 routes completed successfully. | PASS |
| ADM-12 | Admin browser empty/error state | Attempt an Admin browser check with controlled empty and HTTP 503 API responses | Empty state shows no fixtures; API failure shows Retry | Not verified: the local dev server stopped accepting connections during browser setup, and the simulated API response was not served. The UI has explicit empty/error branches, but this browser behavior is not claimed as passed. | BLOCKED |
| ADM-13 | QA data cleanup | After the isolated lifecycle, remove only the property/user ObjectIds created by that run | Preserve all pre-existing QA and application records | Exact synthetic records were removed in the script's `finally` block. No application-database records were written or modified. | PASS |

### Configuration, limitations, and final status

The lifecycle test explicitly overrode the backend MongoDB URI to `pak_real_estate_qa`; it did not write to the configured application database. Synthetic QA users and listings were removed by their exact generated IDs after verification. No existing records were deleted, reset, or altered. The sample private coordinates used for the public-response privacy test existed only on a temporary QA record and were removed with it.

The root cause of the four Unsplash cards and inconsistent visible moderation totals is confirmed as production-page mock state. The original `5 marla house for rnt` record remains unresolved because it was absent from the queried configured database and its ID/environment was not provided. Admin browser rendering under an authenticated real Admin session, including UI-level empty/error states, remains unverified; use a QA Admin account and a running frontend/API for that manual check. The backend lifecycle, authorization, status persistence, global counts, and public visibility were verified against the isolated QA database.

**Final QA status:** Admin mock-data source removed and API-backed moderation lifecycle passed automated tests and an isolated end-to-end API test. Original reported record persistence is **BLOCKED / unverified**; no claim is made that it was saved.

## 18. Admin Subdomain Routing (2026-10-29)

The Admin dashboard is now routed through `http://admin.localhost:3000` in
development and a configurable production hostname. Host-based Next middleware
rewrites `/`, `/agents`, and `/properties` on the Admin host to the existing
`/admin` App Router pages. Legacy `/admin/...` paths on the main host redirect
to the equivalent pathless URL on the Admin host. Main-site links in the Admin
sidebar remain pointed at the main-site origin.

Admin authorization was not relaxed. The existing Admin guard still requires
an authenticated account and checks `/users/profile`; the backend Admin
controller continues to require JWT and the `admin` role. The login form now
supports selecting Administrator and defaults to that option on the configured
Admin host. The server continues to read the current database role on protected
requests. Public registration still does not allow creating admin accounts.

Authentication currently stores its bearer token in origin-scoped
`localStorage`, not an HTTP cookie. As a result, an administrator must sign in
on the Admin subdomain; the main-site origin's local storage is intentionally
not shared. API requests continue using the same bearer token and configured
`NEXT_PUBLIC_API_BASE_URL`.

### Configuration and manual deployment steps

- Local `backend/.env` was updated only for `CORS_ORIGIN`, allowing both
  `http://localhost:3000` and `http://admin.localhost:3000`. Restart the
  backend process to load it.
- Local frontend hostname defaults to `admin.localhost`; the documented
  variables are in `frontend/.env.example`. `NEXT_PUBLIC_SITE_URL` should
  remain the main-site origin locally.
- If `admin.localhost` does not resolve on the developer's Windows machine,
  add `127.0.0.1 admin.localhost` to the Windows hosts file with administrator
  privileges.
- The production domain and hosting provider were not supplied. Replace the
  example with the actual domain and configure frontend
  `NEXT_PUBLIC_ADMIN_HOSTNAME=admin.<actual-domain>` and
  `NEXT_PUBLIC_SITE_URL=https://<actual-domain>`.
- Configure DNS to point the admin hostname at the same Next.js deployment,
  attach both hostnames to the hosting project, and provision TLS covering
  both domains. Set backend CORS to both HTTPS origins. DNS and certificates
  are external deployment tasks and were not applied here.

### Validation

| Test ID | Scenario / steps | Expected result | Actual result / evidence | Status |
|---|---|---|---|---|
| HOST-01 | Request `/` on `admin.localhost:3107` against an isolated Next dev server | Render existing Admin Overview at a pathless subdomain root | HTTP 200 with `x-middleware-rewrite: /admin`; document title `Admin Overview \| EstatePro Lahore`. | PASS |
| HOST-02 | Request `/agents` and `/properties` on the Admin host | Render existing Admin pages through host rewrites | HTTP 200 rewrites to `/admin/agents` and `/admin/properties`. | PASS |
| HOST-03 | Request `/admin/agents` on the Admin host | Canonicalize by removing the `/admin` prefix | HTTP 307 redirect to `/agents`. | PASS |
| HOST-04 | Request main-site `/` and `/admin` with their respective Host headers | Preserve marketplace routes and redirect legacy Admin paths | Main root retained marketplace title; main `/admin` redirected to `http://admin.localhost:3107/`. | PASS |
| HOST-05 | Open Admin root without an authenticated token | Do not render dashboard content to an unauthenticated visitor | Browser showed the guard's verifying state and navigated to `/login?returnTo=%2F` on the Admin host. | PASS |
| HOST-06 | `frontend: npm run build` in isolated copy | Validate middleware, routes, and login changes | Production build and type validation passed; middleware was included in output. | PASS |
| HOST-07 | `backend: npm run build`, `npm run test:admin-moderation`, and `npm run test:jwt-role` | Preserve backend CORS compile and authorization behavior | Build passed; moderation tests 3/3 and JWT role tests 2/2 passed. | PASS |
| HOST-08 | Backend CORS preflight against local port 5000 | Confirm the running API allows the Admin origin | No backend listener was available on port 5000 at validation time; updated local CORS setting is in `.env`, but a live preflight could not be verified. Restart backend before browser/API use. | BLOCKED |
| HOST-09 | Verify actual production DNS, HTTPS, and hosting | Confirm real production subdomain serves this deployment securely | Actual domain/provider were not provided; DNS/TLS/deployment must be configured manually as listed above. | BLOCKED |

`git diff --check` completed cleanly. The Admin host rewrite does not fabricate
or change property data; its dashboard continues to use the MongoDB-backed
Admin API. Production use requires setting the real Admin hostname before
building/deploying Next.js.

## 19. Dedicated Admin Login and Credential Provisioning (2026-10-29)

The regular `/login` page now exposes only Estate Agent / Agency and Buyer /
Investor. Public registration continues to permit only buyer and agent roles.
The Admin host's `/login` is rewritten to a dedicated email/password page with
no role selector or registration link. Subdomain routing remains host-based and
the dashboard still uses the existing real MongoDB-backed APIs.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are loaded only by the NestJS backend from
`backend/.env`; they are not `NEXT_PUBLIC_*` values and are not included in
frontend bundles or API responses. The backend compares credentials using
constant-time digest comparison, then requires a database user with that
configured email and current `admin` role before issuing a JWT for its database
ID. The JWT strategy still reloads the account role from MongoDB on every
protected request. Admin accounts are denied by the ordinary `/auth/login`
endpoint, and admin APIs continue to require their existing JWT and role
guards.

The configured MongoDB instance was reachable, but a read-only lookup initially
found no user matching the configured admin email. The provisioning command
was then run against the configured application database as part of this
explicit Admin setup request. It inserted the configured admin account with a
bcrypt hash. A backend started against that database subsequently accepted the
configured credentials, authorized `/admin/stats`, and rejected an incorrect
password. Credential values were not printed. `backend/scripts/provision-admin.js`
is idempotent, creates only when the configured email is absent, and refuses
to promote an existing buyer/agent. The same safeguards were independently
tested in the isolated QA database.

### Test cases and actual results

| Test ID | Feature or scenario | Steps performed | Expected result | Actual result / evidence | Status |
|---|---|---|---|---|---|
| AUTH-ADMIN-01 | Normal buyer login | Register and log in a disposable buyer through backend API against QA DB | Existing buyer authentication succeeds | HTTP 201 registration and HTTP 200 login; buyer token issued. | PASS |
| AUTH-ADMIN-02 | Normal agent login | Register and log in a disposable agent through backend API against QA DB | Existing agent authentication succeeds | HTTP 201 registration and HTTP 200 login; agent token issued. | PASS |
| AUTH-ADMIN-03 | Public role selectors | Inspect normal login and registration pages in browser; search frontend source for admin-selectable options | Only buyer/agent options; no public admin registration | Browser showed two choices on login and registration. Source scan found admin role only in guard/auth-specific code, not public role selector. Backend registration as admin returned HTTP 400. | PASS |
| AUTH-ADMIN-04 | Dedicated admin login page | Open `http://admin.localhost:3110/login` in browser | Email, password, Login only; no role tabs or public registration link | Browser rendered dedicated Administrator Sign In with the required fields and button only. | PASS |
| AUTH-ADMIN-05 | Login using configured `.env` values | Provision matching user in isolated QA database from the existing env values; submit those values to `/auth/admin-login` | Backend authenticates without returning or logging environment credentials | HTTP 200, admin identity/token returned. Credential values were not printed. | PASS |
| AUTH-ADMIN-06 | Invalid admin credentials | Submit the configured email with a wrong password | Reject without issuing a token or disclosing secrets | HTTP 401; no token issued. | PASS |
| AUTH-ADMIN-07 | Buyer/agent denied as admin | Use newly issued buyer and agent JWTs against Admin endpoints | Both roles denied | Buyer `GET /admin/stats` and agent `GET /admin/properties` returned HTTP 403. | PASS |
| AUTH-ADMIN-08 | Admin API identity and role | Use admin-login token against `/admin/stats` and moderation workflow | JWT resolves to database admin and guarded endpoints work | HTTP 200 for stats and property moderation; rejected/published states persisted in isolated QA DB. | PASS |
| AUTH-ADMIN-09 | Normal login cannot authenticate Admin | Submit configured admin credentials to ordinary `/auth/login` | Admin must use dedicated login | HTTP 401. | PASS |
| AUTH-ADMIN-10 | Missing admin environment | Unit-test admin login with missing ADMIN_EMAIL/ADMIN_PASSWORD | Safe, clear configuration failure | `ServiceUnavailableException` explains which variable names to configure, without values. | PASS |
| AUTH-ADMIN-11 | Main website routing | Request main root and Admin host root on isolated Next server | Main host stays marketplace; Admin host maps to dashboard/guard | Main root served marketplace title; Admin root rewrote to `/admin` and showed auth guard when no token. | PASS |
| AUTH-ADMIN-12 | Admin host auth entry point | Open admin host `/login` and main host `/login` in browser | Admin gets dedicated form; main gets normal login | Admin host showed dedicated form. Main host retained buyer/agent tabs and registration link. | PASS |
| AUTH-ADMIN-13 | Property moderation real DB behavior | Submit temporary agent listing, view in Admin, publish, and inspect public listing | Existing Mongo-backed moderation works and public list reflects published state | Verified end-to-end in `pak_real_estate_qa`; exact test property and accounts were removed afterward. | PASS |
| AUTH-ADMIN-14 | Provisioning safeguards | Provision QA admin; verify bcrypt hash and behavior for existing non-admin code path | Hash only, no silent role promotion | QA account was stored with bcrypt hash; provision script explicitly refuses non-admin identity. Existing non-admin database identity was not modified. | PASS |
| AUTH-ADMIN-15 | Frontend/backend builds | Run isolated `npm run build` in frontend and backend | Middleware, pages, service code compile | Frontend Next.js build passed (21 static routes plus middleware); Nest build passed. | PASS |
| AUTH-ADMIN-16 | Regression suites | Run `test:admin-auth`, `test:registration`, `test:admin-moderation`, `test:jwt-role`, `test:location-sharing` | Auth, registration restrictions, moderation, roles, privacy remain correct | 5 admin-auth, 8 registration, 3 moderation, 2 JWT-role, and 20 location-sharing tests passed. | PASS |
| AUTH-ADMIN-17 | Configured application DB admin identity | Read-only lookup, run `npm run admin:provision`, then use configured credentials against an isolated backend process connected to the configured MongoDB | Confirm the intended admin exists, can log in, and reaches guarded APIs | The account was provisioned with a bcrypt hash; admin login returned HTTP 200, `/admin/stats` returned HTTP 200, and an incorrect password returned HTTP 401. Values were not printed. | PASS |
| AUTH-ADMIN-18 | Production DNS/TLS | Check production admin domain and certificate | Confirm deployment accepts HTTPS Admin host | Actual domain/hosting provider not supplied; set production hostname, DNS, domain attachment, and TLS manually. | BLOCKED |

### Files changed

- `backend/src/config/configuration.ts` — load backend-only admin settings.
- `backend/src/modules/auth/auth.service.ts` and `auth.controller.ts` — add dedicated credential authentication, existing database-role verification, and deny Admin login through the ordinary login endpoint.
- `backend/src/modules/users/schemas/user.schema.ts` — allow the provisioned platform admin account to omit a public phone number; registration still validates phone input.
- `backend/scripts/provision-admin.js` and `backend/package.json` — explicit bcrypt-backed admin account provisioning command that refuses to elevate an existing non-admin.
- `backend/test/admin-auth.spec.ts` — admin credential, missing-config, database-role, and standard-login regression tests.
- `backend/.env.example` — placeholder `ADMIN_EMAIL` and `ADMIN_PASSWORD` settings only.
- `frontend/src/app/(auth)/login/page.tsx` and `register/page.tsx` — remove the Admin choice and keep public auth role types buyer/agent.
- `frontend/src/app/(auth)/admin-login/page.tsx` — dedicated Admin login UI without public registration.
- `frontend/src/middleware.ts` — route Admin-host login and dashboard paths; keep the dedicated login off the main host.
- `LOCAL_DEVELOPMENT.md` — setup, provisioning, origin-scoped storage, production DNS/TLS, and CORS instructions.
- `QA_REGISTRATION_REPORT.md` — this test evidence and configuration limitation.

`backend/.env` is ignored by Git. The admin settings were confirmed present by
checking variable names only; their values were never printed. The one account
inserted into the configured MongoDB database was the requested
`ADMIN_EMAIL` identity, with only a bcrypt password hash stored. No credential
was added to source code, frontend environment, or this report.

## 20. Admin Login API Connectivity (2026-10-29)

The reported `Unable to reach the API at http://127.0.0.1:5000/api/v1` error
was caused by the NestJS backend not running. At the start of this check, only
the frontend was listening (port 3000); port 5000 had no listener. The frontend
API client's fallback URL was already correct for this backend: Nest config
defaults to port 5000 and `main.ts` sets the `/api/v1` prefix. No frontend
`.env`, `.env.local`, `.env.development`, or `.env.development.local` override
was present. The admin login calls `POST /auth/admin-login`, which is
registered as `POST /api/v1/auth/admin-login`.

The backend was started with `npm run start:dev`; Nest connected to the
configured MongoDB, registered the admin login route, and listened on port
5000. To make the local configuration explicit and ensure the subdomain
settings are present, an ignored `frontend/.env.local` was created with the
correct API URL, `admin.localhost` hostname, and main-site URL. The existing
frontend process was restarted with `npm run dev -- --port 3000` so it loaded
the new file. Both development servers were left running.

The API has no `/api/v1/health` route (it returns 404); the existing public
`GET /api/v1/properties` endpoint was used as the backend reachability check.
No health endpoint was added as part of this connectivity fix.

| Test ID | Feature or scenario | Steps performed | Expected result | Actual result / evidence | Status |
|---|---|---|---|---|---|
| API-CONN-01 | Port verification before start | Inspect active listeners and request port 5000 | Determine actual backend state rather than assume | Frontend was listening on 3000; no backend listener/response on 5000 at the start. | PASS |
| API-CONN-02 | Backend startup | Run `backend: npm run start:dev` | Nest starts, connects to configured MongoDB, and binds configured port | Startup logs showed successful Mongoose initialization, route registration, and API on port 5000. | PASS |
| API-CONN-03 | Backend reachability / prefix | GET `/api/v1/properties` | Return a valid API response | HTTP 200. | PASS |
| API-CONN-04 | Health endpoint | GET `/api/v1/health` | Check whether a health route exists | HTTP 404; this route is not implemented. Property endpoint remains the working connectivity check. | NOT IMPLEMENTED |
| API-CONN-05 | Admin login endpoint and payload | POST JSON `{ email, password }` to `/api/v1/auth/admin-login` using values loaded in the test process from backend `.env` | Authenticate configured admin and return its existing JWT response | HTTP 200; response role was `admin` and token was present. Values and token were not printed. | PASS |
| API-CONN-06 | Protected Admin API | Use returned bearer token for `GET /api/v1/admin/stats` | Existing admin guard authorizes this database-backed request | HTTP 200. | PASS |
| API-CONN-07 | Invalid admin credentials | Submit wrong password to the same API | Return unauthorized, not a connection failure | HTTP 401. | PASS |
| API-CONN-08 | Admin-origin CORS | OPTIONS preflight from `http://admin.localhost:3000` for POST | Allow the Admin host to call the backend | HTTP 204 and `Access-Control-Allow-Origin: http://admin.localhost:3000`. | PASS |
| API-CONN-09 | Frontend API environment | Inspect frontend dotenv files, set explicit URL, restart Next dev | API client and running frontend use the correct base URL | No prior override existed; `.env.local` now sets `http://127.0.0.1:5000/api/v1`. Next startup confirmed loading `.env.local`. | PASS |
| API-CONN-10 | Admin login UI and main website | Open Admin login and main root in browser | Dedicated Admin form loads and main site remains available | Admin host showed the Email/Password/Login form; main `http://localhost:3000/` returned the marketplace page. | PASS |
| API-CONN-11 | Builds and regressions | Run backend/frontend builds and Admin auth/registration/moderation/JWT/location tests | Preserve current API/auth implementation | Backend and isolated frontend builds passed; Admin auth 5/5, registration 8/8, moderation 3/3, JWT 2/2, location sharing 20/20 passed. | PASS |
| API-CONN-12 | End-to-end submission through browser form | Enter the configured admin credentials into the browser UI | Confirm the UI submits and redirects in a real browser | Not performed to avoid moving the configured password through browser automation. The same browser page rendered correctly, and the actual credentials were verified against the endpoint from a local server-side test that did not print them. | BLOCKED |

### Startup commands and changed files

From separate terminals:

```powershell
cd C:\Projects\pakistanrealestatemarket\backend
npm run start:dev
```

```powershell
cd C:\Projects\pakistanrealestatemarket\frontend
npm run dev -- --port 3000
```

Files changed for this connectivity task:

- `frontend/.env.local` (ignored, local-only) — explicitly sets
  `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000/api/v1`,
  `NEXT_PUBLIC_ADMIN_HOSTNAME=admin.localhost`, and
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- `QA_REGISTRATION_REPORT.md` — records the observed initial outage and
  executed verification results.

`backend/.env` remained unchanged; its existing secrets were not printed.
`frontend/.env.local` is ignored by Git. Restart Next.js after changing
`NEXT_PUBLIC_*` values. At verification completion, the backend was listening
on port 5000 and the frontend on port 3000.
