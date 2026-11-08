type IndexKey = Record<string, number | string>;
type IndexOptions = Record<string, unknown>;

interface IndexDescription {
  key: IndexKey;
  name: string;
  [option: string]: unknown;
}

interface IndexCollection {
  collectionName: string;
  listIndexes(): { toArray(): Promise<IndexDescription[]> };
  createIndex(key: IndexKey, options: IndexOptions): Promise<string>;
  aggregate(
    pipeline: Record<string, unknown>[],
    options?: Record<string, unknown>,
  ): { toArray(): Promise<Array<{ duplicateGroups: number; duplicateDocuments: number }>> };
}

export interface MigrationModel {
  modelName: string;
  schema: { indexes(): Array<[IndexKey, IndexOptions]> };
  collection: IndexCollection;
}

interface MigrationHistoryCollection {
  findOne(filter: { _id: string }): Promise<unknown>;
  insertOne(document: Record<string, unknown>): Promise<unknown>;
}

export interface MigrationDatabase {
  collection(name: string): MigrationHistoryCollection;
}

export const SCHEMA_INDEX_MIGRATION_VERSION = '2026-11-06-project-management-v1';
export const SCHEMA_INDEX_MIGRATION_HISTORY = 'schema_index_migrations';

export class SchemaIndexMigrationError extends Error {}

export interface MigrationTarget {
  uri: string;
  databaseName: string;
}

const COMPARABLE_OPTIONS = [
  'unique',
  'sparse',
  'expireAfterSeconds',
  'partialFilterExpression',
  'collation',
  'hidden',
  'weights',
  'default_language',
  'language_override',
  'wildcardProjection',
];

export interface SchemaIndexMigrationResult {
  version: string;
  created: number;
  alreadyPresent: number;
  historyRecorded: boolean;
}

export async function runSchemaIndexMigration(
  database: MigrationDatabase,
  models: MigrationModel[],
  version = SCHEMA_INDEX_MIGRATION_VERSION,
): Promise<SchemaIndexMigrationResult> {
  const history = database.collection(SCHEMA_INDEX_MIGRATION_HISTORY);
  const priorRun = await history.findOne({ _id: version });
  let historyRecorded = Boolean(priorRun);
  let created = 0;
  let alreadyPresent = 0;

  for (const model of models) {
    for (const [key, options = {}] of model.schema.indexes()) {
      const expectedName = typeof options.name === 'string'
        ? options.name
        : indexName(key);
      const existingIndexes = await listIndexes(model.collection);
      const sameKey = existingIndexes.find((index) => sameIndexKey(index.key, key));
      const sameName = existingIndexes.find((index) => index.name === expectedName);

      if (
        (sameKey && !sameIndexDefinition(sameKey, key, options)) ||
        (sameName && !sameIndexDefinition(sameName, key, options))
      ) {
        throw new SchemaIndexMigrationError(
          `Index conflict on collection '${model.collection.collectionName}' for '${expectedName}'. ` +
          'Review the existing database index and schema definition; no index was dropped.',
        );
      }

      if (sameKey || sameName) {
        alreadyPresent += 1;
        continue;
      }

      if (options.unique === true) {
        const duplicates = await findDuplicateKeys(model.collection, key, options);
        if (duplicates.duplicateGroups > 0) {
          throw new SchemaIndexMigrationError(
            `Cannot create unique index '${expectedName}' on collection ` +
            `'${model.collection.collectionName}': ${duplicates.duplicateGroups} duplicate key group(s) ` +
            `cover ${duplicates.duplicateDocuments} document(s). Resolve duplicates using an approved ` +
            'data-cleanup plan, then rerun the migration.',
          );
        }
      }

      try {
        await model.collection.createIndex(key, options);
      } catch (error) {
        const code = getMongoCode(error);
        const codeName =
          error && typeof error === 'object' && 'codeName' in error &&
          typeof error.codeName === 'string'
            ? error.codeName
            : undefined;
        throw new SchemaIndexMigrationError(
          `Failed to create index '${expectedName}' on collection ` +
          `'${model.collection.collectionName}'${codeName ? ` (${codeName})` : code ? ` (database error ${code})` : ''}. ` +
          'No index was dropped and the migration was not recorded.',
        );
      }
      created += 1;
    }
  }

  if (!priorRun) {
    await history.insertOne({
      _id: version,
      completedAt: new Date(),
      indexCount: created + alreadyPresent,
      created,
      alreadyPresent,
    });
    historyRecorded = true;
  }

  return {
    version,
    created,
    alreadyPresent,
    historyRecorded,
  };
}

export function resolveMigrationTarget(
  uri: string | undefined,
  confirmedDatabase: string | undefined,
  nodeEnv: string | undefined,
  allowRemote: boolean,
  allowProduction: boolean,
): MigrationTarget {
  if (!uri?.trim()) {
    throw new SchemaIndexMigrationError(
      'Set DB_MIGRATION_URI explicitly; the migration never uses MONGODB_URI implicitly.',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new SchemaIndexMigrationError('DB_MIGRATION_URI must be a valid MongoDB URI.');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new SchemaIndexMigrationError('DB_MIGRATION_URI must use mongodb:// or mongodb+srv://.');
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
  } catch {
    throw new SchemaIndexMigrationError('DB_MIGRATION_URI has an invalid database name.');
  }
  if (!databaseName) {
    throw new SchemaIndexMigrationError('DB_MIGRATION_URI must include a database name in its path.');
  }
  if (confirmedDatabase !== databaseName) {
    throw new SchemaIndexMigrationError(
      `Target confirmation must exactly match the URI database name '${databaseName}'.`,
    );
  }
  const hostname = parsed.hostname.toLowerCase();
  const isLoopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  if (!isLoopback && !allowRemote) {
    throw new SchemaIndexMigrationError(
      'A non-local database requires the explicit --allow-remote flag.',
    );
  }
  if (nodeEnv === 'production' && !allowProduction) {
    throw new SchemaIndexMigrationError(
      'Production migration requires the explicit --allow-production flag.',
    );
  }
  return { uri, databaseName };
}

async function listIndexes(collection: IndexCollection): Promise<IndexDescription[]> {
  try {
    return await collection.listIndexes().toArray();
  } catch (error) {
    if (getMongoCode(error) === 26) return [];
    throw error;
  }
}

async function findDuplicateKeys(
  collection: IndexCollection,
  key: IndexKey,
  options: IndexOptions,
): Promise<{ duplicateGroups: number; duplicateDocuments: number }> {
  const match: Record<string, unknown>[] = [];
  if (options.partialFilterExpression) {
    match.push(options.partialFilterExpression as Record<string, unknown>);
  }
  if (options.sparse === true) {
    match.push({
      $or: Object.keys(key).map((field) => ({ [field]: { $exists: true } })),
    });
  }
  const pipeline: Record<string, unknown>[] = [];
  if (match.length === 1) pipeline.push({ $match: match[0] });
  if (match.length > 1) pipeline.push({ $match: { $and: match } });
  pipeline.push(
    { $group: { _id: Object.keys(key).map((field) => `$${field}`), count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    {
      $group: {
        _id: null,
        duplicateGroups: { $sum: 1 },
        duplicateDocuments: { $sum: '$count' },
      },
    },
    { $limit: 1 },
  );

  try {
    const [result] = await collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
    return result ?? { duplicateGroups: 0, duplicateDocuments: 0 };
  } catch (error) {
    if (getMongoCode(error) === 26) {
      return { duplicateGroups: 0, duplicateDocuments: 0 };
    }
    throw error;
  }
}

function sameIndexDefinition(
  existing: IndexDescription,
  key: IndexKey,
  options: IndexOptions,
): boolean {
  if (!sameIndexKey(existing.key, key)) return false;
  const fields = new Set([
    ...COMPARABLE_OPTIONS.filter((field) => field in options),
    ...COMPARABLE_OPTIONS.filter((field) => field in existing),
  ]);
  for (const field of fields) {
    if (canonicalJson(existing[field]) !== canonicalJson(options[field])) return false;
  }
  return true;
}

function sameIndexKey(left: IndexKey, right: IndexKey): boolean {
  return canonicalJson(Object.entries(left)) === canonicalJson(Object.entries(right));
}

function indexName(key: IndexKey): string {
  return Object.entries(key).map(([field, direction]) => `${field}_${direction}`).join('_');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function getMongoCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof error.code === 'number' ? error.code : undefined;
}
