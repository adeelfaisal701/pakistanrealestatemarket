# Hard-delete and admin-operation safeguards

## Transaction requirement and isolated integration test

Hard-delete is a MongoDB transaction. It fails closed when the application
connection/session is unavailable and does not fall back to sequential writes.
The deployment target must support transactions (a replica set or compatible
sharded cluster); a standalone MongoDB server is insufficient.

An opt-in integration test exercises actual transaction rollback after each
hard-delete write (saved properties, notifications, location shares,
advertisement, property, and audit record), then verifies a successful deletion
also removes expired-but-unreclaimed share rows. It is not run by the regular
mock test suite. By default, it accepts only a loopback MongoDB replica set
using this dedicated database:

```powershell
$env:MONGODB_HARD_DELETE_TEST_URI = 'mongodb://127.0.0.1:27017/estatepro_hard_delete_integration_test?replicaSet=rs0'
npm run test:admin-hard-delete-integration
```

The test rejects non-loopback hosts, a different database name, and URIs without
a replica-set parameter. It creates uniquely identified fixture documents and
does not drop collections or run database-wide cleanup. Failure fixtures remain
in the dedicated test database; the successful fixture is removed by the
hard-delete operation under test.

## Explicit MongoDB Atlas test mode

Atlas is supported only through a separate explicit opt-in. Configure a
dedicated Atlas database user with permissions limited to
`estatepro_hard_delete_integration_test`; do not use an application or
cluster-wide administrative account. Set the URI to the Atlas `mongodb+srv`
connection string for the dedicated database, including `tls=true`, and set
the expected cluster hostname separately:

```powershell
$env:MONGODB_HARD_DELETE_TEST_URI = '<Atlas SRV URI for estatepro_hard_delete_integration_test with tls=true>'
$env:ALLOW_ATLAS_HARD_DELETE_INTEGRATION = 'true'
$env:MONGODB_HARD_DELETE_TEST_ATLAS_HOST = '<exact-cluster-host>.mongodb.net'
npm run test:admin-hard-delete-integration
```

Atlas mode requires all three conditions: exact opt-in value `true`, exact
hostname match against `MONGODB_HARD_DELETE_TEST_ATLAS_HOST`, and an
`*.mongodb.net` `mongodb+srv` host with TLS enabled. Both local and Atlas modes
require the URI database path to be exactly
`/estatepro_hard_delete_integration_test`; `dbName` query overrides, fragments,
other database names (including the application's `pak_real_estate` database),
and other connection modes are rejected before connecting. The test does not
print the URI or credentials, and connection failures use a sanitized message.

Do not point the test at production or an application database. A passing
mocked test is not evidence of transaction rollback; only running this test
against an isolated replica set, local or Atlas, verifies the driver/server
behavior.

Hard-delete deletes every location-share row for the property inside the same
transaction, regardless of expiry or previous revocation state. The public
share access path continues to reject revoked or expired links. The share TTL
index remains asynchronous cleanup for normal expiry, not a hard-delete
integrity mechanism.

## Uploaded image retention

Hard-delete deliberately does not unlink uploaded files. Image URLs are served
publicly with a one-year immutable cache policy, and a managed file may be
referenced by more than one property. Keeping the file avoids breaking cached
URLs and avoids deleting a file still used by another listing. The current
policy is indefinite retention; this can leave orphaned files and consume
storage.

Do not add automatic deletion on hard-delete. Any future garbage collector
needs an approved retention period longer than the public cache lifetime,
reference checks across all property records, concurrency-safe claiming, and
an explicit policy for audit/history references. No such garbage collector is
implemented or verified here.

## Admin mutation rate limiting

`AdminMutationRateLimitGuard` provides a per-process, in-memory limit. It
continues to protect admin mutation routes, but it is not a distributed limit:
limits are independent across application instances and reset on restart.

There is no shared rate-limit backend configured in this application. For
multi-instance deployments, operators should use an atomic shared counter/store
(for example, an existing Redis service) or enforce an equivalent gateway
limit. Adding such infrastructure is intentionally deferred rather than
introducing a new dependency without an operational decision.
