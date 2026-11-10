# Ghar Safar Agent Instructions

## Inspect before changing

- Read the relevant implementation, tests, module wiring, and current Git status before editing. Treat current source as authoritative; do not rely on old or generated documentation.
- Preserve staged, unstaged, and untracked work independently. Do not overwrite or “clean up” changes unrelated to the requested task.
- Confirm every environment variable, endpoint, role, and package command against current source/manifests. Never inspect or print secret values.

## Architecture and ownership

- This repository contains separate npm applications; use `frontend/` for the Next.js App Router application and `backend/` for the NestJS API. The root package has no application scripts or workspaces.
- Frontend boundaries: pages/layouts in `frontend/src/app`, grouped UI in `frontend/src/components`, hooks in `frontend/src/hooks`, shared helpers/API client in `frontend/src/lib`, and types in `frontend/src/types`.
- Backend boundaries: common cross-feature concerns in `backend/src/common`, runtime configuration in `backend/src/config`, database/migration concerns in `backend/src/database`, and feature modules in `backend/src/modules`. Keep controllers, services, DTOs, and schemas with their existing feature unless an explicitly approved requirement justifies a structural change.
- Preserve current App Router organization, feature modules, import conventions, and dependency-injection patterns. Do not move files, merge similar components, or add abstractions for cosmetic reasons.

## Preservation is the default

- Do not change existing functionality, business logic, API contracts, UI/UX, or user workflows unless the user explicitly requests it.
- Do not change MongoDB Atlas configuration, production data, schemas, indexes, or database queries without explicit authorization and a reviewed plan. Database migrations and admin provisioning are operational writes; never run them casually.
- Do not add, remove, or update dependencies or package manifests without approval.
- Do not change Vercel/Railway settings, environment configuration, or credentials unless explicitly authorized.
- Never stop active development servers without permission.
- Never delete source files or components, or merge components based only on similar names.

## API and authorization

- The backend global API prefix is `/api/v1`; inspect controller decorators and module registration before describing or changing a route.
- Keep DTO validation, transformation, response envelopes, and error behavior consistent with existing global configuration.
- Authorization must be enforced by backend guards and services, not only by frontend visibility or route guards. Preserve JWT account checks and role checks.
- Backend roles are `buyer`, `agent`, and `admin`. Preserve the existing requirements for active/verified agents and ownership checks. Never infer authorization from a frontend role flag.
- Keep public routes explicitly public and protected routes protected. Do not weaken authentication, role checks, rate limits, or private-location access controls.

## Environment and secrets

- Never expose, copy into documentation, stage, or commit environment values, credentials, tokens, private keys, or production connection strings.
- Do not modify environment files unless explicitly authorized. Environment variable names may be documented only after confirming their source references; distinguish required, optional, and conditional values.
- `NEXT_PUBLIC_*` values are browser-visible and must never contain secrets.
- Use local dedicated test databases only. Do not run destructive integration tests, migrations, or provisioning against a production database. Preserve database and uploaded data.

## Runtime and generated files

- Preserve existing `.next/`, `.next-dev/`, backend `dist/`, `*.tsbuildinfo`, `backend/uploads/`, and other runtime/build artifacts. Inspect generated-file effects before running a build or tool that may overwrite them.
- Do not modify or delete generated artifacts as a side effect of unrelated work.
- Property image storage is filesystem-backed; treat uploads as user data and do not clean the upload directory.

## Git safety

- Preserve all existing staged, unstaged, and untracked changes separately.
- Never use `git reset`, `git clean`, `git restore`, `git checkout`, or `git stash`. Do not stage broadly, commit, or push unless explicitly requested.
- Before any authorized commit or push, inspect the exact diff and staged content, and exclude all environment files and secrets.

## Validation and reporting

- Select the smallest relevant test, type-check, or build command. Check its script and side effects first; avoid broad formatting or lint commands that automatically rewrite files unless expressly requested.
- Report the exact checks actually run and their results. Do not claim a build, deployment, or application-wide correctness without evidence.
- If a proposed correction may change behavior, database effects, API contracts, authentication, or deployment behavior, stop and request approval instead of guessing.
- Run `git diff --check` for documentation/text edits when appropriate, and verify only the intended files changed.
