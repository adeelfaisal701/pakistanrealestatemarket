# Analytics Index Deployment and Verification

Production Mongoose automatic index creation is disabled. Operators must verify and manage the indexes below through the approved database change process before enabling analytics deduplication guarantees. Application startup does not create, synchronize, or verify production indexes.

## Required indexes

The schema declarations are in:

- `backend/src/modules/properties/schemas/property-analytics-deduplication.schema.ts`
- `backend/src/modules/properties/schemas/property-analytics-event.schema.ts`

Required indexes:

| Collection | Key | Options |
|---|---|---|
| Property analytics deduplication | `{ key: 1 }` | `{ unique: true }` |
| Property analytics deduplication | `{ expiresAt: 1 }` | `{ expireAfterSeconds: 0 }` |
| Property analytics events | `{ dedupeKey: 1 }` | `{ unique: true, sparse: true }` |

The deduplication collection is explicitly named `property_analytics_deduplication`. The event schema does not explicitly set its collection name; resolve its actual collection from the target model/schema or the application’s existing deployment configuration rather than assuming a name.

## Safe operator workflow

1. Confirm the intended environment, database name, and backup/restore procedure out of band. Never paste production credentials into shell history or this repository.
2. Before index creation, run a read-only index listing and duplicate preflight in the intended database. Check duplicate key groups for `key` in the reservation collection and non-null `dedupeKey` values in the analytics event collection. Investigate and resolve conflicts through a separately approved data-retention procedure; do not automatically delete or rewrite records to make index creation pass.
3. Use `getIndexes()` to inspect existing definitions. Confirm keys and options, not merely index names.
4. In an approved maintenance/change window, create only missing indexes using the exact definitions above. Index creation can fail or consume substantial resources if existing data conflicts or the collections are large. Monitor the operation and application logs.
5. Re-run `getIndexes()` and duplicate preflight after deployment. Record the target, database, index keys/options, result, timestamp, operator, and change reference in the deployment record.
6. Enable or claim analytics deduplication guarantees only after successful verification. TTL expiration is asynchronous; expired documents may remain until MongoDB's TTL monitor processes them.

After preflight and approval, the operator-controlled creation commands are:

```javascript
db.getCollection('property_analytics_deduplication').createIndex({ key: 1 }, { unique: true })
db.getCollection('property_analytics_deduplication').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
db.getCollection('<resolved analytics event collection>').createIndex({ dedupeKey: 1 }, { unique: true, sparse: true })
```

These are documentation examples only; they were not run as part of this change.

Example read-only verification commands (replace placeholders only in an authorized operator session):

```javascript
db.getCollection('property_analytics_deduplication').getIndexes()
db.getCollection('<resolved analytics event collection>').getIndexes()
db.getCollection('property_analytics_deduplication').aggregate([
  { $group: { _id: '$key', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
  { $limit: 20 }
])
db.getCollection('<resolved analytics event collection>').aggregate([
  { $match: { dedupeKey: { $type: 'string' } } },
  { $group: { _id: '$dedupeKey', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
  { $limit: 20 }
])
```

Do not run index creation from application startup in production. Development and test configurations continue to use Mongoose automatic index creation.
