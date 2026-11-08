# EstatePro

EstatePro is a Pakistan real-estate marketplace and agent CRM. The repository contains a Next.js web application and a separate NestJS API backed by MongoDB/Mongoose.

## Implemented capabilities

The current source implements:

- Public property browsing, search, property details, and agent listings.
- Buyer accounts, saved properties and searches, inquiries, notifications, and buyer requirements.
- Agent property management, lead and conversation workflows, advertisements, and analytics.
- Visitor-to-agent messaging and buyer/agent conversation endpoints.
- Admin sign-in and management tools for property moderation, agent verification/account status, advertisements, reports, and activity.
- Private property-location management and expiring/revocable location shares.
- Property image upload, validation, processing, and retrieval.

These are source-confirmed features, not a claim that every workflow has been independently exercised in production. Analytics can run in a development-only sample mode; its sample metrics are not production analytics.

## Technology and layout

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, Axios, and Leaflet.
- Backend: NestJS 11, TypeScript, Mongoose 8, MongoDB, and class-validator/class-transformer.
- CI: GitHub Actions workflow at `.github/workflows/ci.yml`.

```text
frontend/
  src/app/          Next.js App Router pages and layouts
  src/components/   UI grouped by application area
  src/hooks/        React hooks
  src/lib/          Shared client-side utilities, including the API client
  src/types/        Shared frontend types
backend/
  src/common/       Shared guards, decorators, filters, and interceptors
  src/config/       Environment-backed application and database configuration
  src/database/     Database and explicit index migration code
  src/modules/      NestJS feature modules, controllers, services, DTOs, and schemas
  scripts/          Admin provisioning and development utilities
  test/             Node.js test-runner specs
```

The root `package.json` has no scripts or workspaces. Install and run each application from its own directory; root `node_modules` is not part of the documented application workflow.

## Prerequisites

- Node.js 22 (the version used by CI) and npm.
- MongoDB for regular backend operation. A local MongoDB instance is convenient for development; production must use an explicitly configured database.
- A replica-set-capable, isolated MongoDB database only when running the hard-delete integration test.

## Local setup

Use separate terminals for the backend and frontend. These PowerShell examples copy the committed environment templates; review them locally and provide suitable values without committing secrets.

```powershell
Set-Location backend
npm ci
Copy-Item .env.example .env
npm run start:dev
```

```powershell
Set-Location frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

The frontend defaults its API base to `/api/v1`; the Next.js rewrite targets the local backend by default. The API listens on port 5000 unless `PORT` is set, and the frontend development server uses Next.js defaults. Configure the backend database and JWT settings before using authenticated features. The backend loads its local `.env` through Nest configuration; the frontend reads `NEXT_PUBLIC_*` settings during Next.js build/runtime as applicable.

### Environment variables

Names and purposes below are taken from source references and the checked-in example templates. No values are included. “Conditional” means the variable is needed only for the described feature, task, or deployment mode. Variables prefixed `NEXT_PUBLIC_` are intended for browser-visible configuration and must never contain secrets.

| Variable | Service | Required status and purpose |
|---|---|---|
| `NODE_ENV` | Both | Set by the runtime/build environment; backend database and security behavior depends on it. Use `development`, `test`, or `production` as appropriate. |
| `PORT` | Backend | Optional; HTTP listen port, default 5000. |
| `APP_NAME` | Backend | Optional; API application name. |
| `MONGODB_URI` | Backend | Optional in local configuration because code has a localhost default; configure a dedicated database URI for deployed environments. |
| `JWT_SECRET` | Backend | Required for normal API startup/authentication; keep secret and use a strong production value. |
| `JWT_EXPIRES_IN` | Backend | Optional; token lifetime, default `7d`. |
| `CORS_ORIGIN` | Backend | Optional for local development; configure the allowed frontend origin(s) in production. |
| `ADMIN_EMAIL` | Backend | Conditional; configured admin identity used by admin authentication and provisioning. |
| `ADMIN_PASSWORD` | Backend script | Conditional; used only by the admin provisioning script. Never use it as a committed value. |
| `FRONTEND_BASE_URL` | Backend | Optional; frontend URL used when constructing links, defaulting to localhost. |
| `PROPERTY_LOCATION_SHARE_TTL_HOURS` | Backend | Optional; expiration duration for private-location shares. |
| `PROPERTY_LOCATION_ENCRYPTION_KEY` | Backend | Conditional; needed for protected private-location functionality. Treat as a secret and do not rotate without understanding existing encrypted data. |
| `PROPERTY_IMAGE_STORAGE_DIR` | Backend | Optional locally; production must configure writable persistent storage for uploaded property images. |
| `PROPERTY_IMAGE_PUBLIC_BASE_URL` | Backend | Optional locally; configure the externally reachable image base URL in production. |
| `DB_MIGRATION_URI` | Backend migration | Required only for the explicit schema-index migration command. The migration does not fall back to `MONGODB_URI`. |
| `MONGODB_HARD_DELETE_TEST_URI` | Backend tests | Optional; set only to an isolated test database to run the hard-delete integration test; otherwise that test is skipped. |
| `ALLOW_ATLAS_HARD_DELETE_INTEGRATION` | Backend tests | Conditional opt-in when the hard-delete integration test is intentionally run against Atlas. |
| `MONGODB_HARD_DELETE_TEST_ATLAS_HOST` | Backend tests | Conditional expected Atlas host used by the integration-test isolation check. |
| `API_PROXY_TARGET` | Frontend | Optional; Next.js rewrite target for `/api/v1/*`; local default points to the local backend API. |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Optional; browser API base URL, default `/api/v1`. Prefer same-origin proxying unless cross-origin access is deliberately configured. |
| `NEXT_PUBLIC_ADMIN_HOSTNAME` | Frontend | Optional; hostname used for admin-host routing. Development has an `admin.localhost` default; configure intentionally for production. |
| `NEXT_PUBLIC_SITE_URL` | Frontend | Optional; site URL used by admin navigation, defaulting to localhost. |
| `NEXT_PUBLIC_OSM_TILE_URL` | Frontend | Optional; OpenStreetMap tile URL used by the location map. |
| `CSP_IMAGE_ORIGINS` | Frontend | Optional; comma-separated exact image origins added to the Content Security Policy. |
| `ENABLE_HSTS` | Frontend | Optional; enables the HSTS header when set to `true` in production and HTTPS is correctly deployed. |
| `NEXT_PUBLIC_APP_NAME` | Frontend template | Present in the example template, but no current source-code reference was found. |
| `NEXT_PUBLIC_ENABLE_DEMO_PROPERTIES` | Frontend template | Present in the example template, but no current source-code reference was found. |
| `NEXT_PUBLIC_WHATSAPP_PREFIX` | Frontend template | Present in the example template, but no current source-code reference was found. |
| `ANALYTICS_DEMO_MODE` | Backend development | Set by `npm run start:dev:analytics`; enables a development-only in-memory analytics sample without connecting to MongoDB. Do not use in production. |

The hard-delete integration suite also uses the three test-only variables above to enforce database isolation. Never point it at production data. The example templates can change independently of this table; confirm current source usage before relying on any template-only setting.

## Running and verification

Run commands from the relevant project directory:

| Task | Frontend | Backend |
|---|---|---|
| Development server | `npm run dev` | `npm run start:dev` |
| Tests | `npm test` | `npm test` |
| Production build | `npm run build` | `npm run build` |
| Serve a production build | `npm run start` | `npm run start:prod` |
| TypeScript check | `npx tsc --noEmit --incremental false` | `npx tsc --noEmit --incremental false --project tsconfig.build.json` |

Backend `start:prod` runs its `prestart:prod` build lifecycle script before starting `dist/main.js`. The backend `lint` script invokes ESLint with `--fix` and can modify files; the frontend `lint` script invokes the Next.js linter. Inspect scripts and the worktree before using either.

Production database auto-index creation is disabled. Index changes are handled by the explicit `db:migrate:indexes` command, which requires a separate `DB_MIGRATION_URI`, database confirmation, and additional explicit flags for remote or production targets. It is an operational database change, not a routine startup step; review the migration implementation and obtain database-owner approval before running it.

The backend exposes `/api/v1/health/live` for liveness and `/api/v1/health/ready` for MongoDB readiness. The readiness check returns unavailable when the database cannot be reached.

## API, authentication, and roles

The global API prefix is `/api/v1`. The Next.js app proxies `/api/v1/*` using `API_PROXY_TARGET` unless the frontend API base is configured differently. Controllers define these route groups:

- `/auth`: registration, user login, and configured-admin login.
- `/users`, `/buyer`, `/properties`: profiles, buyer features, public property browsing, and property management.
- `/crm`, `/messages`: agent CRM, leads, and visitor/agent conversations.
- `/requirements/buyer`, `/requirements/agent`, `/requirements/admin`: requirement and offer workflows.
- `/admin`, `/reports`: admin management and public report submission.
- `/health`: liveness and database readiness.

The roles defined in the backend are `buyer`, `agent`, and `admin`. The API issues JWTs; the frontend API client stores the token in browser `localStorage` and sends it as a bearer token. The JWT strategy reloads the account from MongoDB, and backend guards enforce authorization; frontend route guards are not a substitute for API authorization. Some requirement operations specifically require an active, verified agent. Login and other selected public actions have in-process rate limits; these limits are not shared across multiple backend instances.

Admin provisioning is an explicit backend script (`npm run admin:provision`) that uses the backend environment and configured admin identity. It creates/provisions an admin account; it is not a public self-registration workflow. Review the script and confirm the target database before running it.

DTO validation is globally configured to transform inputs, whitelist declared fields, and reject unknown fields. API responses pass through a response-transform interceptor. Preserve these conventions when adding or changing endpoints.

## Database and uploaded images

The application uses MongoDB/Mongoose schemas under backend feature modules. Do not point local tests, migrations, or provisioning at production data without explicit authorization. Production auto-indexing is disabled; schema/index changes need a reviewed, explicit migration. The hard-delete integration test requires a dedicated replica-set database; Atlas use has additional explicit opt-in and host checks.

Property images are stored on the backend filesystem, with JPEG, PNG, and WebP validation and image processing. The upload directory must be writable and durable in production. A Railway deployment using local image storage needs a persistent volume mounted at `PROPERTY_IMAGE_STORAGE_DIR`, plus a correct `PROPERTY_IMAGE_PUBLIC_BASE_URL`; an ephemeral filesystem is not suitable for durable uploads. No external object-storage implementation was found.

Private location sharing depends on configured encryption and TTL settings. Protect encryption material and database access; changing encryption settings can affect access to existing protected values.

## Deployment notes

No Vercel or Railway deployment descriptor was found during inspection, and neither deployment has been verified. Treat the following as setup guidance, not evidence that hosting is already configured:

### Vercel frontend

1. Import the repository and set the Vercel project root to `frontend/`.
2. Use the frontend lockfile/install (`npm ci`) and `npm run build`.
3. Configure `API_PROXY_TARGET` to the deployed backend API base (including `/api/v1`) so the same-origin rewrite can reach it. If using a direct `NEXT_PUBLIC_API_BASE_URL` instead, configure backend CORS and the frontend security policy for the selected HTTPS origin.
4. Configure the real public site/admin host values as applicable. Configure any additional image origins in `CSP_IMAGE_ORIGINS`.
5. Ensure backend `CORS_ORIGIN` allows the deployed frontend origin when cross-origin traffic is used.

### Railway backend

1. Create a service rooted at `backend/`; install with `npm ci`, build with `npm run build`, and start with `npm run start:prod` (or start the built entry point after a successful build).
2. Configure `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, production CORS, and the frontend URL using Railway's secret/configuration management. Add the configured admin identity only if admin provisioning/login is required.
3. Configure a persistent writable mount for property images and set `PROPERTY_IMAGE_STORAGE_DIR` and `PROPERTY_IMAGE_PUBLIC_BASE_URL`.
4. Use `/api/v1/health/ready` as a readiness endpoint only after MongoDB connectivity is configured; `/api/v1/health/live` is the liveness endpoint.
5. Run index migrations only as a separately reviewed operational task with an explicitly confirmed target.

## Known limitations and unverified areas

- The source and CI configuration were inspected, but deployment to Vercel or Railway was not performed or verified.
- No production database, credentials, or environment files were inspected as part of this documentation.
- Local filesystem image storage requires durable production storage; no cloud object-storage adapter was found.
- Analytics demo mode is synthetic and development-only. It does not establish that all real-world analytics metrics are collected.
- In-memory rate limiting is process-local and does not provide a shared distributed limit across scaled instances.
- Example-template variables listed above as unreferenced are not confirmed application features.
- CI definitions describe automated checks, but this documentation task did not run builds or tests.
