# Local Development

## Analytics UI without MongoDB

The analytics demo server is an explicit, development-only mode. It starts the
backend API on port `5000`, skips MongoDB and authentication modules, and serves
generated sample analytics from memory. The Overview page labels the values as
development sample data. They are not stored and are not real user activity.
This mode exposes only health and analytics endpoints; authentication, listings,
CRM, and other database-backed APIs remain available only in the full backend
mode.

Open two terminals from the repository root:

```powershell
cd backend
npm run start:dev:analytics
```

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000/agent`. The frontend API default is
`http://127.0.0.1:5000/api/v1`. Verify the development API with:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/v1/health
Invoke-RestMethod "http://127.0.0.1:5000/api/v1/properties/agent/analytics?days=7"
```

The analytics endpoint accepts `days=7` or `days=30`. Restarting the process
does not preserve sample events.

The frontend uses a separate `.next-dev` build directory in development and
the default `.next` directory for production builds. Keep the development
server running while running `npm run build`; the outputs do not overwrite
each other's chunks.

## Full backend with persistent data

MongoDB is required for normal authentication, listings, CRM, and persistent
analytics. It is not required for the development analytics demo server. To run
the full API, install/start MongoDB locally, configure `backend/.env` using
`backend/.env.example`, set a random `JWT_SECRET` of at least 32 characters, and
use a local URI such as:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/pak_real_estate
```

### CORS and frontend security headers

In development, backend CORS permits only the explicitly configured
`CORS_ORIGIN` values, or `http://localhost:3000`,
`http://127.0.0.1:3000`, and `http://admin.localhost:3000` when unset.
Production requires `CORS_ORIGIN` to list the approved HTTPS frontend origins
as comma-separated exact origins (for example placeholders
`https://<frontend-origin>,https://<admin-origin>`). Production startup fails
when the setting is missing, wildcarded, malformed, non-HTTPS, or localhost.
Origin-less server-to-server/health-check requests continue without CORS
response headers. Browser credentials are disabled; the frontend uses bearer
authorization headers, not cookies. Private-network preflight permission is
limited to matching local development origins that explicitly request it.

Next.js sends a Content-Security-Policy-Report-Only policy built from the
application's same-origin API proxy, local bundles, Leaflet's OpenStreetMap
tiles, the existing Unsplash mock images, the Google Maps property iframe, and
any exact additional `CSP_IMAGE_ORIGINS`. Set that variable at frontend build
time to the HTTPS origin(s) used by production property-image storage; do not
add wildcards. The report-only policy intentionally avoids `unsafe-inline` and
`unsafe-eval`; Next.js hydration and Leaflet-generated inline styles may produce
reports. Review those reports and implement runtime nonce support before
enforcing CSP. No reporting endpoint is configured.

Baseline headers include `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, and a restrictive `Permissions-Policy`. HSTS is omitted
unless the frontend deployment explicitly sets `ENABLE_HSTS=true` after HTTPS
and certificate/redirect behavior are confirmed. The emitted policy uses
`max-age=31536000` for the frontend host only; enable it only when the hosting
edge sends the header over HTTPS. Deployment-specific frontend, admin, API,
and image origins still need operator confirmation.

For Atlas, set `MONGODB_URI` in `backend/.env` to the cluster's `mongodb+srv`
connection string and include the application database name in the path, for
example `/pak_real_estate`. The backend loads `backend/.env` regardless of
whether it is launched from the repository root or the `backend` directory.
Percent-encode reserved characters in the username or password (for example
`@` as `%40`); do not put this URI in frontend variables or commit `.env`.

### Explicit database index migration

Production disables Mongoose automatic index creation. Indexes declared by the
audited schemas can be applied only by the separate, explicit migration command;
normal API startup does not run it. The command uses `DB_MIGRATION_URI` only and
requires an exact database-name confirmation. It creates indexes only, never
drops them, and records successful version
`2026-11-03-schema-indexes-v1` in `schema_index_migrations`.

For a local database, run from `backend` in PowerShell:

```powershell
$env:DB_MIGRATION_URI = "mongodb://127.0.0.1:27017/pak_real_estate"
npm run db:migrate:indexes -- --confirm-database=pak_real_estate
```

For a production-mode invocation, `--allow-production` is additionally
required. A non-local host also requires `--allow-remote`; production runs
therefore require both flags. Before any controlled deployment execution, review existing index
definitions and run during an approved maintenance window: unique-index
preflight scans existing records and index creation can consume database
resources. Duplicate keys stop the migration without deleting or changing
records; resolve them only through an approved data-cleanup plan. Conflicting
indexes stop with a named conflict and are never replaced automatically. If a
later index fails, already-created indexes remain and the migration version is
not recorded; rerun only after the cause has been reviewed.

Do not use the example JWT placeholder as a real secret. Start the regular
backend and frontend with (the production start command builds `dist` before
launching it, so it will not fail when compiled files are missing):

```powershell
cd backend
npm run start:dev
```

For production-mode startup, use `npm run start:prod`; its prestart hook runs
`npm run build` and then launches `dist/main.js`.

```powershell
cd frontend
npm run dev
```

### Persistent property photos

The backend stores uploaded JPEG, PNG, and WebP files on disk and saves their
public API URLs plus MIME type, size, checksum, ordering, cover status, and upload
time in MongoDB. Configure `PROPERTY_IMAGE_STORAGE_DIR` in `backend/.env` to a
durable volume location; its default is `backend/uploads/property-images` when
the server runs from the backend directory. `PROPERTY_IMAGE_PUBLIC_BASE_URL`
must be the browser-reachable backend API base URL, including `/api/v1` (for
example `https://api.example.com/api/v1`). This public URL is saved with each
image, so keep the public origin stable or migrate the stored URLs when changing
it. Do not mount the storage directory as an ephemeral container filesystem.

Uploads require the regular authenticated backend and MongoDB. The analytics
demo mode does not provide listing or image endpoints. The API accepts at most
10 images per listing and 10 MB per image; only listing owners (or admins) can
upload, reorder, or remove image references. For local setup, the example values
in `backend/.env.example` work with the default ports. No image-storage
credentials are required.

## Admin subdomain

The Admin dashboard is served at `http://admin.localhost:3000`. The existing
`/admin` URLs on the main host redirect to the corresponding path on the
configured Admin host; the main website routes remain on `http://localhost:3000`.
Next.js rewrites the Admin host's `/`, `/agents`, and `/properties` paths to the
existing Admin App Router pages. The Admin pages still use the protected
MongoDB-backed API endpoints and `AdminAccessGuard`; the backend remains the
final authority for role checks.

For local development:

- Set `NEXT_PUBLIC_ADMIN_HOSTNAME=admin.localhost` in `frontend/.env.local`
  (or keep the default from `frontend/.env.example`) and restart Next.js after
  changing it.
- Put `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` only. The email
  identifies the admin record at login; the password is used only by the
  provisioning script to create its bcrypt hash. Neither value is exposed to
  the browser. Do not prefix them with `NEXT_PUBLIC_`.
- The Admin login also requires a matching database user with role `admin`,
  because the existing JWT guards resolve each token against the current
  database role. Provision the configured identity once from the backend
  directory with `npm run admin:provision`. The script reads only
  `backend/.env`, stores a bcrypt password hash, and refuses to change an
  existing buyer/agent account. If the matching email already belongs to a
  non-admin, no role is changed automatically; resolve that account through an
  authorized database administrator.
- Agent dashboard leads are loaded from authenticated CRM APIs and kept only
  in transient application memory. The old `estatepro-agent-dashboard-v1`
  browser cache is deleted on dashboard entry, sign-out, and account changes.
  The existing `auth_token` and `auth_user` keys remain part of the current
  authentication flow; they are cleared on sign-out. Local-only call logs and
  generated agent notifications are not shown as if they were server records.
- Sample analytics remain available only through the explicit development
  analytics mode described above. Production mode does not mount that module.
- Authentication endpoints enforce process-local limits: buyer/agent login is
  limited to 8 attempts per normalized email and 30 per IP per 15 minutes;
  Admin login to 5 per email and IP per 15 minutes; registration to 5 per email
  and 20 per IP per hour. Successful login clears the account counter, while
  the IP counter expires with its window. Counters reset on process restart and
  are not shared across backend instances; production multi-instance deployments
  need a shared rate-limit store.
- Public visitor chat sessions are random server-issued tokens stored only as
  SHA-256 hashes, bound to one property, and expire after 30 days. Limits are
  10 session issuances per IP and 100 per property per hour; conversation
  creation is limited to 20 per IP, 5 per visitor session, and 50 per property
  per hour; message sends
  are limited to 120 per IP, 20 per visitor session, and 100 per property/chat
  per minute (with an additional persistent 20-per-conversation-per-minute
  check). Visitor reads are limited to 300 per IP, 120 per session, and 180
  per property/chat per minute. All limits return HTTP 429 and use
  process-local counters, so they reset on restart and are not shared across
  backend instances.
- The visitor session collection checks `expiresAt` on every use. Production
  disables Mongoose auto-index creation, so the declared TTL index must be
  provisioned through the normal database index release process for automatic
  cleanup; expiry enforcement does not depend on TTL deletion.
- The backend does not currently enable Express `trust proxy`, so `request.ip`
  uses the direct socket peer and ignores client-supplied forwarded headers.
  Behind a reverse proxy, this groups requests under the proxy IP unless trusted
  proxy handling is explicitly configured. To rate-limit by actual client IP,
  configure Express `trust proxy` with only the exact proxy IP addresses or
  subnets (for example via
  `app.getHttpAdapter().getInstance().set('trust proxy', ['<proxy-ip-or-cidr>'])`)
  and ensure the ingress proxy removes incoming `X-Forwarded-For` values and
  writes its own verified forwarding chain. Never set trust proxy to `true` or
  trust arbitrary client-provided forwarded headers.
- Open `http://admin.localhost:3000` (or its `/login` path) for the dedicated
  email/password form. The main site's login remains limited to agents and
  buyers, and public registration cannot create administrators. Missing admin
  environment settings produce a safe server-side configuration error.
- `admin.localhost` should resolve to loopback on current browsers/OS versions.
  If it does not on your Windows setup, add `127.0.0.1 admin.localhost` to
  `C:\Windows\System32\drivers\etc\hosts` with administrator privileges.
- Allow the browser to connect to the backend from both origins. The example
  backend CORS setting includes `http://localhost:3000` and
  `http://admin.localhost:3000`; set the same comma-separated origins in
  `backend/.env` and restart the API if your local configuration differs.
- Browser `localStorage` is origin-scoped, so an Admin must sign in on the
  Admin subdomain. Tokens are not cookies and are not shared with the main
  hostname. The backend checks the current database role for every protected
  Admin request.

For production, replace `mydomain.com` with the actual domain before
deployment:

- Set the frontend deployment environment variables
  `NEXT_PUBLIC_ADMIN_HOSTNAME=admin.mydomain.com` and
  `NEXT_PUBLIC_SITE_URL=https://mydomain.com`, then rebuild/redeploy Next.js.
- Point the DNS `admin` host (`admin.mydomain.com`) to the same Next.js
  deployment using the provider's recommended CNAME or A/AAAA record. Keep the
  main domain attached to that deployment as well.
- Configure the hosting provider to accept both hostnames and issue/attach a
  valid TLS certificate for `mydomain.com` and `admin.mydomain.com`. DNS alone
  does not configure HTTPS or route the host to the application.
- Set backend `CORS_ORIGIN=https://mydomain.com,https://admin.mydomain.com`
  and restart/redeploy the API. Use HTTPS for both origins.
- If private-location share links should open on the main site, keep
  `FRONTEND_BASE_URL=https://mydomain.com`; these links do not need to use the
  Admin host.

The real production domain and DNS/hosting provider were not supplied, so the
production hostname, DNS record, TLS certificate, and deployment environment
must be configured manually as above. Admin path access on the main host is
redirected only when `NEXT_PUBLIC_ADMIN_HOSTNAME` is configured; production
must set it to the real Admin hostname.

## Environment variables

- Frontend: `NEXT_PUBLIC_API_BASE_URL` (optional; defaults to
  `http://127.0.0.1:5000/api/v1`). Copy `frontend/.env.example` to
  `frontend/.env.local` only if you need to override it.
  `NEXT_PUBLIC_ADMIN_HOSTNAME` defaults to `admin.localhost` in development;
  set it to the production Admin host when deploying. `NEXT_PUBLIC_SITE_URL`
  must be the canonical main-site origin in production. Public property pages
  show only published listings returned by the backend API; no demo listings
  or generated placeholder property data are used.
- Backend full mode: `PORT` (defaults to `5000`), `MONGODB_URI`,
  `JWT_SECRET` (required; at least 32 random characters),
  `JWT_EXPIRES_IN` (defaults to `7d`), and comma-separated `CORS_ORIGIN`
  values (defaults to `http://localhost:3000`), `ADMIN_EMAIL`, and
  `ADMIN_PASSWORD`. Copy `backend/.env.example` to `backend/.env`, replace
  placeholders, then provision the Admin record with `npm run admin:provision`.
- Backend analytics demo: no `.env` or database setup is required. The
  `start:dev:analytics` script sets development-only mode and a process-local
  random JWT secret automatically.

## Private property location sharing

Exact property coordinates and private entrance instructions are stored
separately from the approximate public city/area. The public property APIs
return an explicit allowlist and do not include legacy exact address or
coordinate fields. Agents/admins can set the entrance from the agent's
published listing management interface.

To share an entrance, the agent selects a registered buyer account by email.
The link contains a random token in its URL fragment (not coordinates or query
parameters), while MongoDB stores only its SHA-256 hash. Opening a link requires
signing in as that same buyer account. Links expire after 24 hours by default;
set `PROPERTY_LOCATION_SHARE_TTL_HOURS` in `backend/.env` to an integer from
`1` to `720` to change the lifetime. The owner/admin can revoke a link. The
server checks recipient, expiry, revocation, property status, and ownership on
every request. Keep MongoDB backups and access controls appropriate for
personally sensitive location data.

Set `FRONTEND_BASE_URL` in `backend/.env` to the canonical frontend origin so
new share links point to the deployed app. Use HTTPS in production.

Set `PROPERTY_LOCATION_ENCRYPTION_KEY` to a separate, randomly generated,
base64-encoded 32-byte key before enabling location entry. New exact locations
are encrypted with AES-256-GCM in the property document; only the token hash is
stored for share links. Keep this key in a secret manager, back it up securely,
and do not rotate it without first migrating the encrypted locations. The API
returns a clear service-unavailable response for location edits/shares when the
key is not configured. Legacy exact coordinates, if present in older property
documents, remain hidden from default queries and are removed from the legacy
fields when an owner saves the encrypted location.

The map picker uses OpenStreetMap raster tiles by default and needs network
access; optionally set `NEXT_PUBLIC_OSM_TILE_URL` to a compatible tile service.
Tile requests reveal the viewed map area to that tile provider. Directions open
Google Maps' public directions URL without a server API key; Google Maps uses
its own road data, and the application cannot guarantee private-road access or
detect every closure. An OpenStreetMap pin link is also provided as a fallback.
The WhatsApp action opens a prefilled draft for the agent to review and send;
the application does not send or confirm delivery of messages.

Do not commit `.env` or `.env.local` files or put server secrets in frontend
environment variables.

## CI, tests, and health endpoints

The GitHub Actions workflow at `.github/workflows/ci.yml` runs for pushes,
pull requests, and manual dispatch. It uses Node.js 22, installs the backend
and frontend independently with `npm ci` and their committed lockfiles, runs
each package's test script, checks frontend TypeScript, and builds both
applications. It has read-only repository permissions and does not deploy,
run migrations, or require application secrets. The workflow is prepared in
the repository; its execution requires a GitHub Actions run.

Use Node.js 22 locally to match CI. From the repository root, run:

```powershell
cd backend
npm ci
npm test
npm run build
```

In another terminal:

```powershell
cd frontend
npm ci
npm test
npx tsc --noEmit
npm run build
```

The optional hard-delete replica-set integration test is skipped unless
`MONGODB_HARD_DELETE_TEST_URI` is explicitly supplied. CI does not set that
variable, connect to MongoDB, run database migrations, or access production
services. Do not set it to a production URI.

The regular MongoDB-backed API exposes:

- `GET /api/v1/health/live` — liveness only; returns HTTP 200 while the
  application process is serving requests, independently of MongoDB.
- `GET /api/v1/health/ready` — readiness; returns HTTP 200 only after a bounded
  MongoDB ping succeeds. If the connection is unavailable, the ping fails, or
  it exceeds two seconds, the endpoint returns HTTP 503 with the standard
  sanitized error response and no connection details.
- `GET /api/v1/health` — retained compatibility endpoint with liveness
  semantics; use `/live` or `/ready` when the distinction matters.

The explicit development analytics demo skips MongoDB: liveness remains HTTP
200, while `/api/v1/health/ready` returns HTTP 503 because database-backed
features are not ready in that mode. Its existing `/api/v1/health` response is
retained and explicitly identifies the skipped database.

Normal application operation requires MongoDB as described above. No new
environment variables are required for the health checks. Deployment
orchestration should use the readiness endpoint for traffic eligibility and
the liveness endpoint for process restarts; configure probe intervals and
timeouts in the hosting platform without exposing database errors to public
clients.
