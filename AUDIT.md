# EstatePro / Pakistan Real Estate Marketplace — Full Audit

**Audit date:** 2026-11-03
**Prepared for:** Ali
**Auditor:** Claude (static source audit + public-advisory verification)
**Scope:** Whole repository at `C:\Projects\pakistanrealestatemarket` (backend, frontend, scripts, docs, repo hygiene)
**Code changes made by this audit:** **None.** The only file created is this `AUDIT.md`.

---

## 0. Khulasa (Roman Urdu summary)

- **Sab se bara khatra:** frontend mein `next` ka version **15.1.7** pin hai. Is version mein do mashhoor security bugs hain: ek **remote code execution** (CVE-2025-66478, CVSS 10) aur ek **middleware auth bypass** (CVE-2025-29927). Production se pehle upgrade lazmi hai.
- **Chat spam ka darwaza khula hai:** visitor chat ka "session token" server issue hi nahi karta, sirf format check hota hai (64 hex characters). Koi bhi naya token bana kar unlimited conversations aur CRM leads bana sakta hai, aur rate limit bypass ho jati hai.
- **Login par throttling nahi:** `login`, `register`, `admin-login` par koi attempt-limit nahi, aur admin password `.env` mein plain text se compare hota hai.
- **Photos mein GPS (EXIF) bachi rehti hai:** upload ki hui photo ko jaisa hai waisa save kiya jata hai. Phone ki photo mein asli location hoti hai, jo "private exact location" feature ko tor deti hai.
- **Agent browser mein purana data reh jata hai:** sign-out par sirf token hatta hai. Leads, contacts aur notifications `localStorage` mein rehti hain, aur demo (nakli) data asli agents ko dikhta hai. Top bar mein har agent ko "Adeel Malik" nazar aata hai.
- **Achi khabar:** pehle ke critical bugs (admin banna, JWT fallback secret, public listing leak, profile leak) source mein **theek ho chuke hain**, aur image upload, ID validation, aur regex escaping ka kaam achha hai.
- **Is audit mein kuch chalaya nahi gaya.** Sab kuch code parh kar aur public advisories se verify kiya gaya (details section 2 mein).

---

## 1. Executive summary

EstatePro is a NestJS 11 + MongoDB backend and a Next.js 15 (App Router) frontend with three roles (buyer, agent, admin), property inventory and advertisement moderation, buyer saved-searches/inquiries, an agent CRM and chat inbox, requirements, analytics and private-location sharing. The codebase is considerably more complete than a prototype, and several earlier critical defects have been fixed in source.

However, the project is **not production-ready**. The most important blockers are:

1. An **outdated Next.js version with critical public CVEs** (AUD-01).
2. **Unauthenticated abuse paths**: the visitor-chat rate limits can be bypassed (AUD-02) and auth endpoints are not throttled (AUD-03).
3. **Privacy gaps**: EXIF GPS data in published photos (AUD-04) and agent PII persisted in the browser across accounts (AUD-05).
4. **Operational gaps**: production index creation is disabled with no migration path for core indexes (AUD-06), no CI/CD, health check or monitoring (AUD-20).

### Scorecard

| Area | Rating | Note |
|---|---|---|
| Authentication & authorization (backend) | **Good, with gaps** | Role from DB on every request, inactive accounts blocked, admin cannot use normal login. No throttling. |
| Input validation | **Good** | Global whitelist + forbidNonWhitelisted, ObjectId pipe, regex escaping. A few unvalidated nested fields remain. |
| File upload safety | **Good, one privacy gap** | Magic-byte check, size cap, random filenames, strict filename regex. EXIF not stripped. |
| Dependency security | **Poor** | Next.js 15.1.7 is critically vulnerable. No `npm audit` was possible here. |
| Frontend security | **Fair** | JWT in `localStorage`, no CSP/headers, client-only route guards (API is the real boundary). |
| Data privacy | **Fair** | Good private-location design; EXIF and browser persistence undermine it. |
| Testing | **Fair (backend), Poor (frontend)** | ~18 backend spec files; no frontend or browser tests; no `npm test`. |
| Operations / deployability | **Poor** | No CI, Docker, health endpoint, monitoring; local-disk image storage. |
| Maintainability | **Fair** | Very large service files (up to 2,045 lines), duplicate/legacy components. |

### Findings count

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 5 |
| Medium | 16 |
| Low | 5 |
| **Total** | **27** |

---

## 2. Method, evidence key and limitations

### How this audit was done

- Read the repository tree and the security-relevant source: `main.ts`, `app.module.ts`, configuration, auth (controller/service/strategy/DTO), users, roles/JWT guards, properties controller, image storage service, messaging controller, public reports controller, admin rate-limit guard, `provision-admin.js`, DTOs, frontend `middleware.ts`, `api-client.ts`, `next.config.ts`, `package.json` files, access guards, agent dashboard files.
- Copied five large backend services (`properties`, `admin`, `property-messaging`, `buyer`, `requirements`) into a sandbox and ran **pattern scans** (regex construction, `any` usage, `console.*`, TODO markers, in-memory state) and read specific sections (public lookup gating, event tracking, visitor-session handling).
- Read the three existing audit documents (`ESTATEPRO_AUDIT_REPORT.md`, `ESTATEPRO_FEATURE_STATUS_MATRIX.md`, `ESTATEPRO_BLOCKERS_AND_NEXT_STEPS.md`) and treated them as historical context.
- Verified the Next.js advisories against public advisory sources (web search, 2026-11-03).

### Evidence tags

| Tag | Meaning |
|---|---|
| **[S]** | Confirmed by reading current source on disk during this audit |
| **[W]** | Confirmed against public advisory/web sources |
| **[U]** | Taken from logs/output you pasted into the chat (not re-run by me) |
| **[P]** | Taken from an existing project report; not re-verified |

### What was NOT done (important)

- **No build, type-check, lint, test run, or `npm audit`** was executed by this audit. The project is large and the file-copy tool handles one file at a time, so a sandbox build was impractical.
- **No running application, database, or browser** was available. All runtime behavior (UI flows, responsiveness, accessibility, persistence) is unverified.
- **Deliberately not opened:** `backend/.env`, `frontend/.env.local` (they may contain secrets).
- **Only pattern-scanned, not fully read:** `buyer.service.ts`, `requirements.service.ts`, most of `admin.service.ts`, all Mongoose schemas other than `User`, all `test/` specs, `docs/*`, and the majority of frontend pages/components.
- **Not reviewed:** `LoggingInterceptor` / `TransformInterceptor` bodies, `WORKFLOW.md`, `LOCAL_DEVELOPMENT.md`, `QA_REGISTRATION_REPORT.md`, and the frontend for `dangerouslySetInnerHTML` / other XSS sinks (not scanned project-wide).

A finding marked **[S]** is a statement about the source, not a proof of exploitability in a deployed environment.

---

## 3. Project inventory

| Item | Detail |
|---|---|
| Backend | NestJS 11, Mongoose 8, Passport-JWT, bcrypt, multer (via platform-express) |
| Frontend | Next.js **15.1.7** (pinned), React 19, Tailwind 4, Zustand 5, axios, Leaflet, React Query |
| Database | MongoDB (replica set needed for hard-delete transactions [P]) |
| Backend modules | `auth`, `users`, `properties`, `crm` (leads + property messaging), `buyer`, `requirements`, `admin`, plus a dev-only analytics module |
| Roles | `buyer`, `agent`, `admin` |
| Backend tests | 18 spec files in `backend/test/` (+2 helper files); run individually via `node --test -r ts-node/register` |
| Largest files | `properties.service.ts` 2,045 lines; `admin.service.ts` 1,580; `property-messaging.service.ts` 1,061; `requirements.service.ts` 867; `buyer.service.ts` 724 [S] |
| CI / Docker / health | None found in the repository tree |
| Root `README.md` | Missing (other docs exist: `WORKFLOW.md`, `LOCAL_DEVELOPMENT.md`, `ADMIN_SPEC.md`, `ESTATEPRO_*.md`, `docs/*`) |

### Progress compared with the earlier QA (QA-001…QA-023)

The first QA said the frontend and backend were not connected. That is **no longer true**: auth, buyer dashboard, agent analytics, My Ads, CRM leads and the chat inbox call the backend [P][S]. Some agent screens (Calls & Messages contacts, notifications, top-bar identity) are still browser-local/demo (see AUD-05, AUD-15).

---

## 4. Verified fixes (previously reported defects now closed in source)

| Earlier ID | Issue | Status | Evidence |
|---|---|---|---|
| QA-001 | Anyone could self-register as `admin` | **Fixed** | `RegisterDto.role` is `@IsIn([BUYER, AGENT])` [S] |
| QA-004 | Hard-coded JWT secret fallback | **Fixed** | `requireJwtSecret()` fails startup on missing/short/placeholder secret; `getOrThrow` in strategy [S] |
| QA-002 | Public property detail leaked unpublished listings / agent email | **Fixed** | `findById` only returns eligible statuses with published ad; populate excludes email [S] |
| QA-003 | Any user could read any profile | **Fixed** | `GET /users/:id` allows self or admin; role re-read from DB [S] |
| QA-016 | Role trusted from JWT payload | **Fixed** | `JwtStrategy.validate` reloads user and role from DB [S] |
| QA-011 | Invalid IDs caused 500 | **Fixed** | `ParseObjectIdPipe` on `:id` params [S] |
| QA-011 | Internal error text leaked on 500 | **Fixed** | Filter masks all 5xx as "Internal server error"; maps 11000→409, CastError→400, Multer errors [S] |
| QA-012 | Regex injection (`city=(`) | **Fixed** | `escapeRegExp` used for every user-supplied regex found by the scan [S] |
| QA-014 | `"false"` became `true` | **Fixed** | Implicit conversion removed from `ValidationPipe` [S] |
| — | Password hash exposure | **Safe** | `findById` / `findAll` use `.select('-passwordHash')` [S] |
| — | Admin using the normal login | **Blocked** | `login()` rejects `role === admin`; admin has a dedicated endpoint [S] |
| — | Backend compile | **Passing** | `Found 0 errors` in the watch log you shared [U] |

> Note: some of these fixes (DTOs, filter, pipes, users controller, config) were made by Claude earlier in this same chat session. This audit re-read the current files to confirm they are still in place.

---

## 5. Findings

Severity scale: **Critical** (exploitable, severe impact), **High** (serious, fix before launch), **Medium** (should fix, risk is conditional), **Low** (hardening/quality).

### CRITICAL

#### AUD-01 — Next.js 15.1.7 has critical public vulnerabilities
- **Area:** Frontend dependencies
- **Evidence:** `frontend/package.json` pins `"next": "15.1.7"` [S]. Public advisories: **CVE-2025-66478** (React Server Components RCE, CVSS 10) affects Next 15.1.x **before 15.1.9**; **CVE-2025-29927** (middleware authorization bypass, CVSS 9.1) is fixed in **15.2.3**, and an IBM bulletin names `next-15.1.7` explicitly [W].
- **Impact:** If the frontend is reachable from a network, an unauthenticated attacker may achieve remote code execution on the Next.js server. The middleware bypass is lower impact here (middleware does host routing, not authentication), but the version is still vulnerable.
- **Recommendation:** Upgrade `next` to a currently patched release (at minimum 15.1.9 for the 15.1 line; preferably the latest patched 15.5.x or 16.x) and keep `react`/`react-dom` ≥ 19.0.1. Run `npm audit` and `npx fix-react2shell-next`. If any build of this app has ever been publicly exposed, treat secrets as potentially compromised and rotate them.
- **Confidence:** High (version and advisories both confirmed).

### HIGH

#### AUD-02 — Visitor-chat rate limits are bypassable; unlimited spam conversations and leads
- **Area:** `crm/property-messaging.service.ts`, `property-messaging.controller.ts`
- **Evidence [S]:** `POST /messages/visitor-session` hands out a random 64-hex token but **stores nothing**. `hashVisitorToken()` only checks the format `/^[0-9a-f]{64}$/i` and HMACs it. Every limit is keyed on that client-chosen value: conversations per 24 h (`countDocuments({ visitorHash })`), messages per minute (per conversation), and session issuance (per IP, but sessions are never required to be issued).
- **Impact:** A script can invent a new token per request and open unlimited conversations on any published property. This floods agents' inboxes and unread counters, creates CRM leads (`updateChatLead`) and grows the database. Authenticated agents are the victims.
- **Recommendation:** Make sessions real: store issued tokens (or sign them with an HMAC + expiry) and reject unknown/expired ones. Add per-IP and per-property limits on conversation creation. Add CAPTCHA/Turnstile for anonymous first messages. Cap leads created per visitor.
- **How to check on a local dev server:** generate a fresh 64-hex string, send it as `X-Visitor-Session` to `POST /api/v1/messages/properties/<publishedPropertyId>/conversation` with a valid body, repeat with new strings, and watch whether the 20/day limit ever triggers.
- **Confidence:** High.

#### AUD-03 — No throttling on login/register/admin-login; admin credential design is weak
- **Area:** `auth.controller.ts`, `auth.service.ts`, `package.json`
- **Evidence [S]:** No `@nestjs/throttler` dependency or guard on the auth routes. `loginConfiguredAdmin` compares the submitted password to **`ADMIN_PASSWORD` in plain text from the environment** (constant-time compare, but unlimited attempts). The database admin's bcrypt hash is never used for this check, so there are two sources of truth. No MFA. The prior report noted missing login throttling too [P].
- **Impact:** Online guessing of the single admin password and credential stuffing against buyers/agents. bcrypt hashing on every attempt also makes login a CPU-exhaustion target.
- **Recommendation:** Add per-IP and per-account throttling with progressive backoff on `/auth/*`. Validate the admin against the stored bcrypt hash instead of a plain env password (or at least hash the env value at startup). Consider TOTP for admin. Add alerting on repeated failures.
- **Confidence:** High.

#### AUD-04 — Uploaded photos keep EXIF metadata (including GPS)
- **Area:** `property-image-storage.service.ts`
- **Evidence [S]:** `save()` validates magic bytes and size, then writes `file.buffer` unchanged (`writeFile(filePath, file.buffer, …)`). There is no re-encode or metadata strip. Images are then served publicly with a one-year immutable cache.
- **Impact:** Phone photos usually contain GPS coordinates, device model and timestamps. Publishing them reveals the exact location of a property or the agent, which **defeats the product's "private exact location" feature** and is a personal-safety risk.
- **Recommendation:** Re-encode every upload server-side (e.g., `sharp`) to strip EXIF, apply orientation, cap pixel dimensions, and output a normalized format. Re-process existing files in `backend/uploads/property-images/`.
- **Confidence:** High on source behavior; actual EXIF presence depends on the files uploaded.

#### AUD-05 — Agent browser store persists client PII across accounts and shows demo data as real
- **Area:** `frontend/src/lib/agent-store.ts`, `AgentTopBar.tsx`, `AgentSidebar.tsx`, `calls/page.tsx`
- **Evidence [S]:**
  - The store persists to `localStorage` under `estatepro-agent-dashboard-v1`, including leads, contacts, notifications.
  - Sign-out in `AgentTopBar` removes only `auth_token` and `auth_user`; the store key is **not cleared**.
  - `buildSeedData()` seeds fake ads, leads (Ahmed Khan, Sara Ali, …), contacts, notifications and activity, and these are what every new agent sees in Calls & Messages, the notification bell and the sidebar badges.
  - The "Reset demo data" menu item is present in the production UI.
- **Impact:** On a shared device, the next agent can see the previous agent's lead names and phone numbers. Real users also see fabricated activity and unread counts, which damages trust and can cause wrong follow-ups.
- **Recommendation:** Clear this store (and all `estatepro-*` keys) on sign-out and whenever the authenticated user ID changes. Stop persisting lead PII client-side. Remove seeds from production builds; label any remaining sample data. Hide "Reset demo data" outside development.
- **Confidence:** High.

#### AUD-06 — Production disables `autoIndex` but no index migration was found for core indexes
- **Area:** `config/database.config.ts`, `backend/scripts/`
- **Evidence [S]:** `autoIndex: nodeEnv !== 'production'`. `backend/scripts/` contains only `provision-admin.js` and `start-dev-analytics.js`. `docs/ANALYTICS_INDEX_OPERATIONS.md` exists, but covers analytics indexes [P]; no script creates the `User.email` unique index or the other schema indexes.
- **Impact (conditional on production deployment):** Without the unique email index, the register flow (check-then-create) allows duplicate accounts under concurrency, and queries lose their indexes (slow listings, inbox, analytics). Hard-delete and analytics code assume indexes exist.
- **Recommendation:** Add an explicit, reviewed index-sync/migration step (script or migration tool) that runs before first production start, and document it in a README/runbook. Verify indexes in a staging database.
- **Confidence:** Medium-High (depends on whether indexes were created manually elsewhere).

### MEDIUM

#### AUD-07 — JWT stored in `localStorage`, 7-day lifetime, no revocation
- **Evidence [S]/[P]:** `api-client.ts` reads `auth_token` from `localStorage`; `JWT_EXPIRES_IN` defaults to `7d`; there is no refresh/blacklist, and sign-out is purely client-side.
- **Impact:** Any XSS lets an attacker steal a 7-day bearer token. A stolen token stays valid after the user "signs out". Account suspension does work (the strategy checks status on each request).
- **Recommendation:** Prefer HttpOnly `Secure` `SameSite` cookies or short-lived access tokens with refresh rotation. Add a token version/`jti` check so sign-out and password change invalidate tokens. Add a strict CSP (see AUD-08).

#### AUD-08 — No security headers; wildcard remote image hosts
- **Evidence [S]:** `main.ts` does not use `helmet`; `next.config.ts` defines no `headers()`; no CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS or `Permissions-Policy`. `images.remotePatterns` allows **any** HTTPS hostname, which turns the Next image optimizer into an open proxy for arbitrary remote images.
- **Recommendation:** Add `helmet` on the API and a `headers()` block (CSP, frame-ancestors, referrer policy, HSTS) in Next. Restrict `remotePatterns` to the API/CDN host(s) actually used.

#### AUD-09 — CORS configuration risks
- **Evidence [S]:** If `CORS_ORIGIN` contains `*`, the code sets `origin: true` **with `credentials: true`**, which reflects any origin. `http://localhost:3000` is always added, even in production. `Access-Control-Allow-Private-Network: true` is returned on every `OPTIONS`, regardless of origin.
- **Recommendation:** Refuse `*` when credentials are enabled; build the allow-list strictly from env; add localhost only when `NODE_ENV !== 'production'`; scope the private-network header to allowed origins.

#### AUD-10 — IP-based limiters will see the proxy IP behind a reverse proxy
- **Evidence [S]:** No `app.set('trust proxy', …)`. Visitor-session limiting uses `request.ip`; public reports use `@Ip()`.
- **Impact:** Behind nginx/Cloudflare/Render all clients share one IP, so IP limits either block everyone or are useless.
- **Recommendation:** Configure trust-proxy to match the real topology, and use a shared limiter store (the prior report also notes counters are per-process [P]).

#### AUD-11 — JWT secret is reused as the HMAC key for unrelated features
- **Evidence [S]:** `jwt.secret` is the HMAC key for visitor chat tokens, chat/analytics rate-limit keys, buyer chat IDs and analytics visitor hashes.
- **Impact:** **Rotating the JWT secret** (which you should do after any leak) will silently orphan all existing visitor conversations and reset analytics deduplication. A single leaked secret also compromises every feature at once.
- **Recommendation:** Introduce separate derived keys (e.g., `CHAT_HMAC_KEY`, `ANALYTICS_HMAC_KEY`) with documented rotation.

#### AUD-12 — Analytics can be inflated by rotating the client-chosen `visitorId`
- **Evidence [S][P]:** `trackPublicEvent` hashes the client-supplied ID; the 60 events/hour cap and de-duplication are per `visitorHash`. A script that varies `visitorId` bypasses both. Only bot user-agent filtering is applied.
- **Impact:** Views, "reach", call and WhatsApp click counts shown to agents can be manipulated; agents may make decisions or pay for ads on bad data.
- **Recommendation:** Add an IP/subnet-bucketed secondary limit and per-property throttle; label metrics as "recorded events", not unique humans (the live dashboard already says "Recorded events").

#### AUD-13 — Remaining validation gaps in DTOs
- **Evidence [S]:**
  - `CreatePropertyDto.features.rooms` / `outdoor` are `@IsObject()` with `Record<string, number>`, but keys and values are not validated.
  - `interior`, `community`, `nearby` arrays validate `IsString({ each })` but not per-item length.
  - `CreateLeadDto` has no `MaxLength` on any string, no phone-format check, and `budget` has no `@Min(0)`.
- **Impact:** Oversized or oddly keyed data can be stored (document bloat, odd keys such as `$`-prefixed or `.`-containing names). Low exploitability thanks to the global body size limit and Mongoose strictness, but easy to tighten.
- **Recommendation:** Validate keys against an allow-list and values as bounded integers; add `MaxLength` per item and for lead fields; add a phone `@Matches` consistent with registration.

#### AUD-14 — Lost leads are displayed as "Closed Won"
- **Evidence [S]:** `AgentDashboardDataLoader.tsx` maps API status `lost` → `"Closed Won"`. The prior report also notes "Closed" writes `closed_won` and there is no distinct Lost stage [P].
- **Impact:** Agents' win-rate and pipeline reports are wrong; lost deals look like successes.
- **Recommendation:** Add a distinct `Lost` stage in the UI types and mapping; migrate existing display logic.

#### AUD-15 — Hard-coded identity and mock notifications in the agent shell
- **Evidence [S]:** `AgentTopBar.tsx` renders `AGENT_PROFILE` (`Adeel Malik`, initials `AM`) for **every** agent. A real hook, `use-agent-identity.ts`, exists but is not used here. The bell and sidebar badges use seeded local data.
- **Impact:** Wrong identity shown to every user; fake unread counts; undermines trust and may confuse support.
- **Recommendation:** Use the authenticated user's name/role from the profile; source notifications from the API or hide the bell until implemented.

#### AUD-16 — Mobile agents cannot sign out or see notifications
- **Evidence [S]:** `AgentTopBar` is `hidden … lg:flex`. The mobile header and bottom nav in `AgentSidebar.tsx` contain no sign-out and no notification entry.
- **Recommendation:** Add a mobile account menu with sign-out and notifications.

#### AUD-17 — Agent verification does not gate agent capabilities (policy undecided)
- **Evidence [P][S]:** Agents register as `pending_verification`; `RolesGuard` only checks role; the JWT strategy only checks `accountStatus`. A `verified-agent.guard.ts` exists in `requirements`, so gating is used in at least one place.
- **Impact:** Unverified agents can create listings and use CRM. Whether that is intended is a product decision.
- **Recommendation:** Decide the policy (post vs. publish vs. badge only) and apply a consistent guard.

#### AUD-18 — Tooling and dependency declarations are incomplete
- **Evidence [S]:**
  - Backend `lint` and `format` call `eslint`/`prettier`, which are **not in `devDependencies`**; `lint` also runs with `--fix` (mutates files).
  - There is **no `npm test`**. Ten spec files have scripts; eight do not (`buyer-alerts`, `buyer-overview`, `buyer-search`, `buyer-service`, `crm-lead-status`, `database-config`, `property-messaging`, `requirements`).
  - `scripts/provision-admin.js` requires `dotenv`, which is not a declared dependency (it works only because `@nestjs/config` installs it transitively).
  - Frontend `lint` is `next lint` with no ESLint packages; no frontend test script.
  - Root `package.json` duplicates `leaflet` / `@types/leaflet` that also live in `frontend/package.json`.
- **Recommendation:** Add ESLint/Prettier (or remove the scripts), a single `test` script that runs all specs, declare `dotenv`, and remove the root duplicate.

#### AUD-19 — Repository hygiene (`.gitignore` gaps)
- **Evidence [S]:** `.gitignore` excludes `node_modules/`, `.next/`, `dist/`, `build/`, `.env`, `.env.local`. It does **not** exclude `backend/uploads/` (14 user-uploaded images currently there), `frontend/.next-dev/` (hundreds of dev cache files), `frontend/tsconfig.tsbuildinfo`, logs or coverage.
- **Impact:** Uploaded photos (with EXIF, see AUD-04), build caches and generated files can be committed, bloating the repo and leaking content.
- **Recommendation:** Add those paths to `.gitignore`; if already committed, remove them from history as appropriate.

#### AUD-20 — No CI/CD, containerization, health check or monitoring
- **Evidence [S]:** No `.github/`, Dockerfile, compose file, `/health` endpoint, or metrics/alerting configuration in the tree. Image storage defaults to local disk (`uploads/`), which is not durable on most hosts.
- **Recommendation:** Add CI (install, type-check, test, build, `npm audit`), a `/health` + `/ready` endpoint, structured logging, backups for MongoDB and image storage (or object storage + CDN), and a deployment runbook.

#### AUD-21 — Very large service classes
- **Evidence [S]:** `properties.service.ts` 2,045 lines, `admin.service.ts` 1,580, `property-messaging.service.ts` 1,061.
- **Impact:** Hard to review, test and secure; higher regression risk (the prior report already calls for explicit state-transition regression tests [P]).
- **Recommendation:** Split by responsibility (listings, advertisements, analytics, location sharing, images), and add focused tests before refactoring.

#### AUD-22 — Hard delete leaves image files; transactions require a replica set
- **Evidence [P][S]:** The admin delete transaction removes database references but does not call image cleanup; a replica-set transaction is required, and one integration spec depends on it.
- **Recommendation:** Decide retention vs. cleanup, delete managed files (or queue cleanup) after a successful commit, and document the replica-set requirement.

### LOW

#### AUD-23 — Account enumeration
- Register returns a distinct "email already exists" (409); `login()` returns immediately for unknown emails but runs bcrypt for known ones (timing difference). Use a uniform response and dummy bcrypt comparison [S].

#### AUD-24 — `middleware.ts` has unreachable code and trusts `x-forwarded-host`
- A second `/admin-login` branch inside the admin-host block can never run (an earlier branch handles the same path). The host is taken from the client-controlled `x-forwarded-host`; harmless today because admin pages still require an admin token, but it should come from trusted proxy config [S].

#### AUD-25 — `DELETE` requests carry a body
- `DELETE /properties/:id` (archive) and `DELETE /properties/:id/images` read a body. Some proxies and clients drop bodies on `DELETE`. Prefer `POST …/archive` or query/path parameters [S].

#### AUD-26 — Modal accessibility
- Dialogs in `AgentModals.tsx` set `role="dialog"`/`aria-modal` and close on Escape, but do not trap focus or return focus to the trigger. Accessibility overall is unverified [S].

#### AUD-27 — Documentation and branding inconsistencies
- No root `README.md`; several overlapping reports; older notes (`WORKFLOW.md`, verification report) describe behavior that the code no longer has (for example `ensureLegacyAdvertisements`, which the current source no longer contains [P]). Branding varies between EstatePro, PRM and legacy names; footer links to `/privacy`, `/terms`, `/agent/verification` have no routes [P].

---

## 6. What is done well

- **Role/ownership model:** guards + service-level ownership checks; role and account status re-read from DB per request [S].
- **Admin separation:** dedicated admin login, constant-time credential comparison, normal login refuses admin accounts, admin mutations rate-limited (in-process) and audited [S][P].
- **Validation:** global whitelist + reject unknown fields; ObjectId pipe; consistent regex escaping; request DTOs for nearly every route [S].
- **Error handling:** 5xx messages masked; known driver errors mapped to proper codes [S].
- **Image pipeline:** magic-byte detection must match the declared MIME type, 10 MB cap, random UUID filenames, strict filename regex on read/delete (path-traversal safe), `nosniff` header, `wx` file flag [S].
- **Private location sharing:** encrypted at rest, hashed scoped share tokens, expiry/revocation, recipient binding [P].
- **Config safety:** JWT secret fail-fast, required production storage settings, explicit `NODE_ENV` requirement, `autoIndex` off in production (needs a migration companion, see AUD-06) [S].
- **Analytics privacy:** visitors are HMAC-hashed rather than stored raw [S].
- **Existing test discipline:** a meaningful backend spec suite and several written audit/test-plan documents [P].

---

## 7. Functional status by role (summary)

| Role | Works (source-level) | Gaps |
|---|---|---|
| **Public/Visitor** | Catalog, filters, property detail, report form, visitor chat, call/WhatsApp click tracking | Homepage search is a no-op, freshness/verification copy not backed by data, static popular-location stats, broken footer links [P]; chat spam risk (AUD-02) |
| **Buyer** | Register/login, profile & preferences, saved properties/searches, inquiries/chat, notifications, requirements | No email/push/scheduled alerts; saved-search frequency has no worker [P] |
| **Agent** | Inventory, image upload, advertisement lifecycle, live analytics, CRM leads, chat inbox, private location sharing | Demo/local data mixed in (AUD-05/15), lead outcome mislabel (AUD-14), no verification gating (AUD-17), no mobile sign-out (AUD-16) |
| **Admin** | Agent verification/status, property & ad moderation, reports, stats, activity log, guarded hard delete | Env-password admin login (AUD-03), "pending agents" count semantics, agency is only a grouped string [P] |

---

## 8. Recommended remediation roadmap

### Do first (before any public exposure)
1. **AUD-01** Upgrade Next.js/React to patched versions; run `npm audit` for both packages.
2. **AUD-03** Add auth-route throttling; stop comparing the admin password in plain text.
3. **AUD-02** Make visitor sessions server-verified and rate-limit conversation creation.
4. **AUD-05** Clear client store on sign-out; remove seed/demo data and the "Adeel Malik" identity from production.
5. **AUD-04** Strip EXIF by re-encoding uploads (and clean existing files).
6. **AUD-06** Create and document the index migration; verify the `users.email` unique index exists.

### Next (1–2 weeks)
7. AUD-08/09/10: helmet + CSP, strict CORS, trust-proxy, restrict image hosts.
8. AUD-07/11: token strategy (cookies/refresh/revocation) and separate HMAC keys.
9. AUD-13/14/15/16: DTO tightening, Lost stage, real user identity, mobile menu.
10. AUD-18/19: lint/test scripts, `.gitignore`, declared dependencies.

### Then (1 month)
11. AUD-20/21/22: CI/CD, health checks, backups, storage strategy, service refactors, delete-retention policy.
12. Browser end-to-end tests for buyer, agent and admin journeys (the project already has `ESTATEPRO_E2E_TEST_PLAN.md`).
13. Accessibility and responsive review; legal pages; branding cleanup; add a root `README.md`.

---

## 9. Suggested verification checklist (run locally; none of this was executed by this audit)

```powershell
# Backend
cd backend
npm audit
npx tsc --noEmit -p tsconfig.json
npm run build
# Run every spec file individually (there is no `npm test`):
Get-ChildItem test\*.spec.* | ForEach-Object { node --test -r ts-node/register $_.FullName }

# Frontend
cd ..\frontend
npm audit
npx tsc --noEmit
npm run build
```

Security spot-checks (local dev only):
- Fabricate a 64-hex `X-Visitor-Session` token and confirm whether conversation creation can be repeated beyond 20 times (AUD-02).
- Send 50 rapid failed `POST /api/v1/auth/login` requests and confirm no throttling response appears (AUD-03).
- Upload a phone photo and inspect it with `exiftool` for GPS tags (AUD-04).
- Sign in as agent A, sign out, sign in as agent B in the same browser, and inspect `localStorage` for `estatepro-agent-dashboard-v1` (AUD-05).
- `curl -I http://localhost:3000` and `curl -I http://localhost:5000/api/v1/properties` to confirm absence of security headers (AUD-08).

---

## 10. Changes made by Claude earlier in this session (transparency)

The following were modified during the preceding conversation (not by this audit):
- **Backend:** `configuration.ts`, `auth.module.ts`, `jwt.strategy.ts`, `.env.example` (JWT secret hardening); `http-exception.filter.ts`; new `common/pipes/` and `common/utils/escape-regexp.ts`; `users.controller.ts`; `properties.service.ts` / `properties.controller.ts` (public lookup, owner view, regex escaping); `query-property.dto.ts`, `create-property.dto.ts`, `register.dto.ts`, `create-user.dto.ts`, `create-lead.dto.ts`, `moderate-property.dto.ts`; `admin.service.ts` / `admin.controller.ts`; `main.ts` (implicit conversion off).
- **Frontend:** agent dashboard redesign (sidebar, top bar, widgets, `agent-store.ts`, `agent-ui.ts`, `agent-dashboard-mock-data.ts`, modals, hydrator, `TimeAgo`, ads/calls pages), `types/crm.ts`.
- Several of these files were **later changed by others** (for example the dashboard now renders `LiveAgentAnalytics`, and My Ads uses the API). This audit reflects the files as they exist on disk on 2026-11-03.
- Two planned edits (property store sync, Leads/AddProperty store wiring) were **not applied** because the project moved on and `property-store.ts` no longer exists.

---

## 11. Appendix — files and areas reviewed

**Read in full:** `backend/src/main.ts`, `app.module.ts`, `config/configuration.ts`, `config/database.config.ts`, `.env.example`, `backend/package.json`, `auth/*` (controller, service, strategy, register DTO), `users/users.controller.ts`, `users.service.ts`, `user.schema.ts`, `common/guards/{jwt-auth,roles}.guard.ts`, `common/filters/http-exception.filter.ts`, `properties.controller.ts`, `property-image-storage.service.ts`, `property-messaging.controller.ts`, `public-reports.controller.ts`, `admin-mutation-rate-limit.guard.ts`, `scripts/provision-admin.js`, `create-lead.dto.ts`, `create-property.dto.ts`, root `package.json`, `.gitignore`; frontend `middleware.ts`, `api-client.ts`, `next.config.ts`, `package.json`, `.env.example`, `AgentAccessGuard.tsx`, `AdminAccessGuard.tsx`, `use-agent-identity.ts`, `agent/layout.tsx`, `agent/page.tsx`, `AgentDashboardDataLoader.tsx`, `LiveAgentAnalytics.tsx`, `AgentTopBar.tsx`; the three existing audit documents.

**Pattern-scanned or partially read:** `properties.service.ts` (public lookup, event tracking sections), `property-messaging.service.ts` (session, hashing, rate limits), `admin.service.ts`, `buyer.service.ts`, `requirements.service.ts`, `agent-store.ts`, `AgentSidebar.tsx`, `ads/page.tsx`, `calls/page.tsx`.

**Not reviewed:** `.env`, `.env.local`, all other schemas, `test/*` bodies, `docs/*`, `WORKFLOW.md`, `LOCAL_DEVELOPMENT.md`, `QA_REGISTRATION_REPORT.md`, interceptors, and the remaining frontend pages and components.

---

---

## 12. Re-audit (second pass, 2026-11-03)

The project changed after the first pass (Next.js upgrade, auth rate limiting, image sanitizing, CORS rewrite, security headers, index migration script, server-side visitor sessions, agent-store cleanup). This section re-checks every finding against the files **currently on disk**. Sections 1-11 above are kept unchanged as the baseline. **Still no build, test run, `npm audit` or browser check was executed.**

### 12.1 Status of every finding

| ID | Finding | Status now | Evidence / note |
|---|---|---|---|
| AUD-01 | Next.js 15.1.7 critical CVEs | **Resolved** (pending `npm audit`) | `frontend/package.json` now pins `next` **15.5.28** (patched line for CVE-2025-66478 is 15.5.7+; CVE-2025-29927 fixed in 15.2.3+) [S][W]. Confirm the lockfile resolves `react`/`react-dom` ≥ 19.0.1. |
| AUD-02 | Visitor-chat limits bypassable | **Resolved** | Sessions are now stored server-side (`visitorSessionModel`, `tokenHash`, `expiresAt`), bound to a property and validated by `validateVisitorSession`; new per-IP/per-context limits for session, conversation, message and read actions [S]. |
| AUD-03 | No auth throttling / plain admin password | **Mostly resolved** | `AuthRateLimitGuard` on `login`, `admin-login`, `register`; admin login now verifies the **bcrypt hash** of the DB admin (env password no longer compared) [S]. Residual: limits are in-memory (see NEW-1), no MFA. |
| AUD-04 | EXIF/GPS kept in images | **Resolved for new uploads** | `sharp` re-encodes JPEG/PNG/WebP with `.rotate()` and no `withMetadata()`, so metadata is stripped; format must match the declared type [S]. Residual: files already in `backend/uploads/` were not shown to be reprocessed. |
| AUD-05 | Agent PII persisted across accounts, demo data shown | **Mostly resolved** | Sign-out now calls `clearAgentDashboardData(...)`; the current `agent-store.ts` no longer contains seed data, demo traffic or reset-demo actions [S]. Not verified: contents of `agent-session-data.ts`, and whether any remaining store state is persisted. |
| AUD-06 | `autoIndex` off, no index migration | **Addressed (unverified)** | `npm run db:migrate:indexes` and a `schema-index-migration` spec now exist [S]. The script itself was not reviewed or run. Run it in staging and document it. |
| AUD-07 | JWT in `localStorage`, no revocation | **Not re-checked** | `api-client.ts` was not re-read in this pass. |
| AUD-08 | No security headers; wildcard image hosts | **Partially resolved** | `next.config.ts` now sets `poweredByHeader: false` and `headers()` via `security-headers.mjs` (file not read). `images.remotePatterns` still allows `hostname: "**"`. The API still has no `helmet` dependency. |
| AUD-09 | CORS risks | **Resolved** | New `cors.config.ts`: wildcard rejected, production requires explicit HTTPS non-localhost origins, `credentials: false`, private-network header only in development for allow-listed local origins; `test:cors` script added [S]. |
| AUD-10 | No `trust proxy` | **Open (now more important)** | `main.ts` still has no trust-proxy setting while all new limiters are IP-based. |
| AUD-11 | JWT secret reused as HMAC key | **Open** | `property-messaging.service.ts` (line ~1111) and `properties.service.ts` (line ~1079) still read `jwt.secret` for HMAC [S]. |
| AUD-12 | Analytics inflation via rotating `visitorId` | **Not re-checked** | Logic in `properties.service.ts` appeared unchanged where grepped; not re-read. |
| AUD-13 | DTO validation gaps | **Open (confirmed for leads)** | `CreateLeadDto` is unchanged: no `MaxLength`, no phone check, no `@Min` on `budget` [S]. `CreatePropertyDto` was not re-read. |
| AUD-14 | Lost leads shown as Closed Won | **Resolved** | Mapping is now `lost: "Lost"` in `agent-lead-data.ts` [S]. |
| AUD-15 | Hard-coded "Adeel Malik", demo reset in UI | **Resolved** | `AgentTopBar` uses `useAgentIdentity()`; no reset-demo action remains [S]. |
| AUD-16 | No mobile sign-out | **Not re-checked** | `AgentSidebar.tsx` was previously confirmed without sign-out; not re-read now. |
| AUD-17 | Verification does not gate agents | **Not re-checked** | Policy decision still needed. |
| AUD-18 | Tooling gaps | **Partially resolved** | Both packages now have an `npm test` script (backend runs `test/*.spec.*`, frontend `test/*.test.mjs`). Still missing: `eslint`/`prettier` in backend `devDependencies` (lint still uses `--fix`), `dotenv` is not declared, frontend `next lint` has no ESLint packages [S]. |
| AUD-19 | `.gitignore` gaps | **Open** | `.gitignore` is unchanged: no `backend/uploads/`, `frontend/.next-dev/`, `tsbuildinfo` [S]. |
| AUD-20 | No CI/CD, Docker, health check | **Not re-checked** | Repository tree was not re-listed. |
| AUD-21 | Oversized services | **Not re-checked** | Likely unchanged. |
| AUD-22 | Hard delete leaves image files | **Not re-checked** | |
| AUD-23 | Account enumeration | **Mostly resolved** | Registration now returns a neutral acknowledgement and hashes before the existence check; duplicate-key races are handled [S]. Residual: login for an unknown email still returns before bcrypt (small timing difference). |
| AUD-24 | Middleware dead code / `x-forwarded-host` | **Not re-checked** | |
| AUD-25 | `DELETE` with body | **Not re-checked** | |
| AUD-26 | Modal accessibility | **Not re-checked** | |
| AUD-27 | Docs/branding | **Not re-checked** | Still no root `README.md` known. |

**Tally of the 27 baseline findings:** 6 resolved, 4 mostly resolved/addressed, 2 partially resolved, 4 open (AUD-10, 11, 13, 19), 11 not re-checked.

### 12.2 New observations from this pass

- **NEW-1 (Medium): rate limiters are in-memory.** `AuthRateLimitService` keeps counters in a process-local `Map`. They reset on every restart, are not shared across instances, and, without trust-proxy (AUD-10), IP buckets may collapse to the proxy's address. Use a shared store (Redis) or gateway limits for production.
- **NEW-2 (verify): registration response changed.** `register` now returns only an acknowledgement message (no user, no token). Confirm the frontend register form and the login handoff work with this contract (not verified).
- **NEW-3 (info): new files not reviewed.** `security-headers.mjs`, `database/migrate-schema-indexes.ts`, `agent-session-data.ts`, the visitor-session schema, `auth-rate-limit.guard.ts` and the new test files were not read; only their existence and usage were confirmed.

### 12.3 Updated risk picture

| Area | First pass | Now |
|---|---|---|
| Dependency security | Poor | **Fair** (Next patched; needs `npm audit` for the rest) |
| Auth / abuse protection | Fair | **Good** (throttling, bcrypt admin check, server-side visitor sessions; limiters still in-memory) |
| File upload privacy | Fair | **Good** (EXIF stripped for new uploads) |
| Frontend security | Fair | **Fair** (headers added; JWT storage and image host wildcard remain) |
| Data privacy in browser | Fair | **Good** (sign-out cleanup, seeds removed; verify cleanup helper) |
| Operations | Poor | **Poor-Fair** (index migration added; no CI/health/monitoring confirmed) |

There is currently **no Critical finding** among the items re-verified in this pass. The remaining highest-value work is: run `npm audit` and the build/tests, add trust-proxy plus a shared rate-limit store, separate the HMAC keys from the JWT secret, tighten `CreateLeadDto`, fix `.gitignore`, and complete the not-re-checked items with a real build and browser pass.

---

*End of audit. Findings reflect the repository on 2026-11-03 (baseline in sections 1-11, re-check in section 12). Re-audit again after a real build, test run, `npm audit` and browser end-to-end pass.*
