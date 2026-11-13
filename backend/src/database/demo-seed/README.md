# Demo data seeder and cleanup

Populates an approved MongoDB database with fictional Lahore demo data: 10
estate agents, 25 listings (2–3 per agent) and 5 development projects, and
removes exactly that data again afterwards. Both commands are separate from
`db:migrate:indexes` and `admin:provision` and are never run by the application.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ALLOW_DEMO_SEED` | Yes | Must be exactly `true`. |
| `DEMO_SEED_URI` | Yes (not for the seeder's `--dry-run`) | Target database URI including the database name. Neither command ever reads `MONGODB_URI`. |
| `DEMO_SEED_PASSWORD` | Seeder only (not for `--dry-run`) | Shared password for all demo agent accounts, 8–72 characters (same rule as admin-created agents). bcrypt-hashed (cost 10) and never printed or stored in source. |

Both commands refuse unconditionally if the process running them has `NODE_ENV`,
`RAILWAY_ENVIRONMENT`, `RAILWAY_ENVIRONMENT_NAME` or `VERCEL_ENV` set to
`production`, or if the database name contains `prod`. They do not load
`backend/.env`; set the variables in the shell for the one command. A
non-loopback host additionally requires `--allow-remote`, and
`--confirm-database=<name>` must match the database name in the URI.

## Seeding

```powershell
$env:ALLOW_DEMO_SEED='true'; npm run seed:demo -- --dry-run   # schema validation only, no connection

$env:ALLOW_DEMO_SEED='true'
$env:DEMO_SEED_URI='<approved target URI>'
$env:DEMO_SEED_PASSWORD='<demo password>'
npm run seed:demo -- --confirm-database=<name> [--allow-remote]
```

Agent emails are `faisal@gmail.com` and `faisal1@gmail.com` … `faisal9@gmail.com`,
all using `DEMO_SEED_PASSWORD`. All 10 agents are verified with complete
profiles, all 25 listings start `published`/`available`, and all 5 projects
start published. The marketplace only lists properties that have a published
`PropertyAdvertisement`, so the seeder also creates one published advertisement
per demo listing (linked to that listing and its agent).

## Manifest, ownership and idempotency

- Before inserting any record the seeder registers its exact `_id` in the
  standalone `demo_seed_manifest` collection. No existing schema is changed.
- The seeder only updates records listed in the manifest. If a demo email,
  demo listing title or `demo-` project slug already exists but is not in the
  manifest, the run stops before its first write and lists the collisions.
- Re-runs update seeded content in place and never create duplicates. Status
  fields an admin can change (account/verification status, listing moderation
  status, featured/published flags, display order) are set only on creation.
- Changing `DEMO_SEED_PASSWORD` and re-running rotates the demo password.

## Cleanup

```powershell
$env:ALLOW_DEMO_SEED='true'
$env:DEMO_SEED_URI='<same target URI>'
npm run seed:demo:cleanup -- --confirm-database=<name> [--allow-remote] --dry-run   # report only
npm run seed:demo:cleanup -- --confirm-database=<name> [--allow-remote]             # delete
```

Cleanup deletes only records whose `_id` is in the manifest (advertisements
first, then listings, projects and agents), after re-checking that each still
looks like seeded data. It stops and deletes nothing if it finds genuine
activity: CRM leads, conversations, messages, visitor chats, saved properties,
buyer notifications, advertisements the seeder did not create, location shares,
requirement offers, reports, agency profiles created under a demo agency name,
or listings posted through a demo agent login. View analytics, notifications to
the demo accounts and admin audit-log entries are reported and left in place.
Running cleanup again after a successful cleanup is a no-op.

Images reference `images.unsplash.com`, which the frontend already allows; no
files are written to the uploads directory.
