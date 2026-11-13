/**
 * Demo data seeder (`npm run seed:demo`). Removal: `npm run seed:demo:cleanup`.
 *
 * Safety model:
 * - Never imported by the application; runs only when invoked directly.
 * - Refuses to run unless ALLOW_DEMO_SEED=true, and refuses unconditionally
 *   when the process itself carries a production environment marker.
 * - Connects only to DEMO_SEED_URI (never MONGODB_URI), requires the target
 *   database name to be confirmed on the command line, and requires
 *   --allow-remote for non-loopback hosts.
 * - Every record the seeder creates is first registered by exact _id in the
 *   standalone `demo_seed_manifest` collection (no existing schema changes).
 *   The seeder only updates records listed there, and the cleanup command only
 *   removes records listed there.
 * - If any demo email, listing title, project slug, listing advertisement or
 *   agency profile name already exists but is not
 *   in the manifest, the run stops before its first write and reports it; that
 *   record is never touched.
 * - Never drops, deletes or resets anything.
 * - Admin-controlled state (verification, account status, moderation status,
 *   publication flags) is set only on first creation, so admin actions survive
 *   re-runs.
 * - Passwords are bcrypt-hashed exactly like admin-created agent accounts and
 *   are never printed.
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import mongoose = require('mongoose');
import type { Model } from 'mongoose';
import {
  User,
  UserAccountStatus,
  UserRole,
  UserSchema,
} from '../../modules/users/schemas/user.schema';
import {
  Property,
  PropertySchema,
  PropertyStatus,
} from '../../modules/properties/schemas/property.schema';
import {
  PropertyAdvertisement,
  PropertyAdvertisementSchema,
  PropertyAdvertisementStatus,
} from '../../modules/properties/schemas/property-advertisement.schema';
import {
  DevelopmentProject,
  DevelopmentProjectSchema,
} from '../../modules/projects/schemas/development-project.schema';
import {
  Agency,
  AgencyAccountStatus,
  AgencySchema,
} from '../../modules/agencies/schemas/agency.schema';
import {
  DEMO_AGENCIES,
  DEMO_AGENTS,
  DEMO_CITY,
  DEMO_PROJECTS,
  DEMO_PROJECT_SLUG_PREFIX,
  DEMO_PROPERTIES,
  type DemoAgencySeed,
  type DemoAgentSeed,
} from './demo-seed-data';

/** Same cost factor as AdminService.createAgentAccount and AuthService.register. */
const DEMO_PASSWORD_BCRYPT_ROUNDS = 10;
/** Matches AdminCreateAccountDto (8-72), the existing admin-created agent rule. */
const MIN_DEMO_PASSWORD_LENGTH = 8;
const MAX_DEMO_PASSWORD_LENGTH = 72;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const PRODUCTION_MARKERS = [
  'NODE_ENV',
  'RAILWAY_ENVIRONMENT',
  'RAILWAY_ENVIRONMENT_NAME',
  'VERCEL_ENV',
] as const;

export const DEMO_SEED_MANIFEST_COLLECTION = 'demo_seed_manifest';

export class DemoSeedError extends Error {}

export interface DemoSeedOptions {
  dryRun: boolean;
  uri?: string;
  databaseName?: string;
  password?: string;
}

export interface DemoTarget {
  uri: string;
  databaseName: string;
}

/** Same normalization as AgenciesService / UsersService agency lookups. */
export function normalizeDemoAgencyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function demoAgentEmail(agent: Pick<DemoAgentSeed, 'email'>): string {
  return agent.email.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function assertDemoEnvironment(env: NodeJS.ProcessEnv): void {
  for (const marker of PRODUCTION_MARKERS) {
    if (env[marker]?.trim().toLowerCase() === 'production') {
      throw new DemoSeedError(
        `Refusing to seed demo data: ${marker} is 'production'. The demo seeder never runs in production.`,
      );
    }
  }
  if (env.ALLOW_DEMO_SEED !== 'true') {
    throw new DemoSeedError(
      'Refusing to seed demo data: set ALLOW_DEMO_SEED=true to confirm this is an approved target database.',
    );
  }
}

export function parseDemoArgs(args: string[]) {
  let dryRun = false;
  let allowRemote = false;
  let confirmedDatabase: string | undefined;
  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--allow-remote') allowRemote = true;
    else if (arg.startsWith('--confirm-database=')) {
      confirmedDatabase = arg.slice('--confirm-database='.length);
    } else {
      throw new DemoSeedError(
        'Supported arguments are --confirm-database=<name>, --allow-remote and --dry-run.',
      );
    }
  }
  return { dryRun, allowRemote, confirmedDatabase };
}

/** Validates DEMO_SEED_URI and the explicit confirmation. Never echoes the URI. */
export function resolveDemoTarget(
  env: NodeJS.ProcessEnv,
  confirmedDatabase: string | undefined,
  allowRemote: boolean,
): DemoTarget {
  const uri = env.DEMO_SEED_URI?.trim();
  if (!uri) {
    throw new DemoSeedError(
      'Set DEMO_SEED_URI explicitly; the demo seeder never falls back to MONGODB_URI.',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new DemoSeedError('DEMO_SEED_URI must be a valid MongoDB URI.');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new DemoSeedError('DEMO_SEED_URI must use mongodb:// or mongodb+srv://.');
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
  } catch {
    throw new DemoSeedError('DEMO_SEED_URI has an invalid database name.');
  }
  if (!databaseName) {
    throw new DemoSeedError('DEMO_SEED_URI must include a database name in its path.');
  }
  if (/prod/i.test(databaseName)) {
    throw new DemoSeedError(
      `Refusing to seed database '${databaseName}': its name looks like a production database.`,
    );
  }
  if (confirmedDatabase !== databaseName) {
    throw new DemoSeedError(
      `Pass --confirm-database=${databaseName} to confirm the target database.`,
    );
  }
  const isLoopback =
    parsed.protocol === 'mongodb:' && LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase());
  if (!isLoopback && !allowRemote) {
    throw new DemoSeedError(
      'DEMO_SEED_URI is not a local database. Pass --allow-remote only for an approved target database.',
    );
  }
  return { uri, databaseName };
}

/**
 * Validates the environment and CLI arguments for the seeder. Throws
 * DemoSeedError with a message that never contains the URI or password.
 */
export function resolveDemoSeedOptions(
  env: NodeJS.ProcessEnv,
  args: string[],
): DemoSeedOptions {
  assertDemoEnvironment(env);
  const { dryRun, allowRemote, confirmedDatabase } = parseDemoArgs(args);
  if (dryRun) return { dryRun: true };

  const { uri, databaseName } = resolveDemoTarget(env, confirmedDatabase, allowRemote);
  const password = env.DEMO_SEED_PASSWORD;
  if (
    !password ||
    password.length < MIN_DEMO_PASSWORD_LENGTH ||
    password.length > MAX_DEMO_PASSWORD_LENGTH
  ) {
    throw new DemoSeedError(
      `Set DEMO_SEED_PASSWORD (${MIN_DEMO_PASSWORD_LENGTH}-${MAX_DEMO_PASSWORD_LENGTH} characters); it is shared by all demo agent accounts.`,
    );
  }
  return { dryRun: false, uri, databaseName, password };
}

export function openDemoConnection(uri: string) {
  return mongoose
    .createConnection(uri, {
      autoIndex: false,
      autoCreate: false,
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      appName: 'GharSafarDemoSeed',
    })
    .asPromise();
}

// ---------------------------------------------------------------------------
// Storage adapters. Real runs use Mongoose models (full schema validation on
// every write); tests use an in-memory store backed by the same schemas.
// ---------------------------------------------------------------------------

export type PlainRecord = Record<string, any> & { _id: string };

export interface SeedCollection {
  /** Schema-cast plain JSON form of `values`, with defaults applied. Validates. */
  normalize(values: Record<string, unknown>): Promise<Record<string, any>>;
  findOne(filter: Record<string, unknown>): Promise<PlainRecord | null>;
  findMany(filter: Record<string, unknown>): Promise<PlainRecord[]>;
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  insertOne(values: Record<string, unknown>): Promise<string>;
  updateOne(id: string, values: Record<string, unknown>): Promise<void>;
  deleteByIds(ids: string[]): Promise<number>;
}

export type DemoRecordKind = 'user' | 'property' | 'project' | 'advertisement' | 'agency';

export interface DemoManifestEntry {
  kind: DemoRecordKind;
  recordId: string;
  seedKey: string;
}

export interface DemoSeedManifest {
  list(): Promise<DemoManifestEntry[]>;
  /** Idempotent: registering the same kind/recordId twice keeps one entry. */
  add(entry: DemoManifestEntry): Promise<void>;
  remove(entries: DemoManifestEntry[]): Promise<void>;
}

export interface DemoSeedCollections {
  users: SeedCollection;
  properties: SeedCollection;
  projects: SeedCollection;
  advertisements: SeedCollection;
  agencies: SeedCollection;
  manifest: DemoSeedManifest;
}

export const manifestEntryId = (entry: Pick<DemoManifestEntry, 'kind' | 'recordId'>) =>
  `${entry.kind}:${entry.recordId}`;

function toPlain(doc: mongoose.Document): Record<string, any> {
  return JSON.parse(
    JSON.stringify(doc.toObject({ flattenMaps: true, versionKey: false, depopulate: true })),
  );
}

const toObjectIds = (ids: string[]) => ids.map((id) => new mongoose.Types.ObjectId(id));

export function createMongooseCollection(model: Model<any>): SeedCollection {
  return {
    async normalize(values) {
      const doc = new model(values);
      await doc.validate();
      return toPlain(doc);
    },
    async findOne(filter) {
      const doc = await model.findOne(filter).exec();
      return doc ? (toPlain(doc) as PlainRecord) : null;
    },
    async findMany(filter) {
      const docs = await model.find(filter).exec();
      return docs.map((doc) => toPlain(doc) as PlainRecord);
    },
    async countDocuments(filter) {
      return model.countDocuments(filter).exec();
    },
    async insertOne(values) {
      const doc = new model(values);
      await doc.save();
      return String(doc._id);
    },
    async updateOne(id, values) {
      const doc = await model.findById(id).exec();
      if (!doc) throw new DemoSeedError('A demo record disappeared during seeding; re-run the seeder.');
      doc.set(values);
      await doc.save();
    },
    async deleteByIds(ids) {
      if (ids.length === 0) return 0;
      const result = await model.deleteMany({ _id: { $in: toObjectIds(ids) } }).exec();
      return result.deletedCount ?? 0;
    },
  };
}

export function createMongoManifest(connection: mongoose.Connection): DemoSeedManifest {
  const collection = connection.collection<Record<string, any>>(DEMO_SEED_MANIFEST_COLLECTION);
  return {
    async list() {
      const docs = await collection.find({}).toArray();
      return docs.map((doc) => ({
        kind: doc.kind as DemoRecordKind,
        recordId: String(doc.recordId),
        seedKey: String(doc.seedKey ?? ''),
      }));
    },
    async add(entry) {
      await collection.updateOne(
        { _id: manifestEntryId(entry) } as Record<string, any>,
        {
          $setOnInsert: {
            kind: entry.kind,
            recordId: new mongoose.Types.ObjectId(entry.recordId),
            seedKey: entry.seedKey,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    },
    async remove(entries) {
      if (entries.length === 0) return;
      await collection.deleteMany({ _id: { $in: entries.map(manifestEntryId) } } as Record<string, any>);
    },
  };
}

export function registerDemoSeedModels(connection: mongoose.Connection) {
  return {
    user: connection.model(User.name, UserSchema),
    property: connection.model(Property.name, PropertySchema),
    project: connection.model(DevelopmentProject.name, DevelopmentProjectSchema),
    advertisement: connection.model(PropertyAdvertisement.name, PropertyAdvertisementSchema),
    agency: connection.model(Agency.name, AgencySchema),
  };
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

export interface DemoSeedCounts {
  created: number;
  updated: number;
  unchanged: number;
}

export interface DemoSeedSummary {
  agents: DemoSeedCounts;
  properties: DemoSeedCounts;
  projects: DemoSeedCounts;
  advertisements: DemoSeedCounts;
  agencies: DemoSeedCounts;
}

const emptyCounts = (): DemoSeedCounts => ({ created: 0, updated: 0, unchanged: 0 });

/** Validates the static demo data set itself before any database write. */
export function assertDemoDataConsistency(): void {
  const agentKeys = new Set<string>();
  const emails = new Set<string>();
  for (const agent of DEMO_AGENTS) {
    if (agentKeys.has(agent.key)) throw new DemoSeedError(`Duplicate demo agent key ${agent.key}.`);
    const email = demoAgentEmail(agent);
    if (emails.has(email)) throw new DemoSeedError(`Duplicate demo agent email ${email}.`);
    agentKeys.add(agent.key);
    emails.add(email);
  }
  const agencyKeys = new Set<string>();
  const agencyNames = new Set<string>();
  for (const agency of DEMO_AGENCIES) {
    const normalized = normalizeDemoAgencyName(agency.name);
    if (agencyKeys.has(agency.key) || agencyNames.has(normalized)) {
      throw new DemoSeedError(`Duplicate demo agency ${agency.name}.`);
    }
    agencyKeys.add(agency.key);
    agencyNames.add(normalized);
    const members = DEMO_AGENTS.filter((agent) => agent.agencyKey === agency.key);
    if (members.length < 2 || members.length > 3) {
      throw new DemoSeedError(`Demo agency ${agency.name} must have 2-3 agents (has ${members.length}).`);
    }
  }
  for (const agent of DEMO_AGENTS) {
    const agency = DEMO_AGENCIES.find((item) => item.key === agent.agencyKey);
    if (!agency || normalizeDemoAgencyName(agent.agencyName) !== normalizeDemoAgencyName(agency.name)) {
      throw new DemoSeedError(`Demo agent ${agent.key} agency name does not match its demo agency.`);
    }
  }
  const titlesPerAgent = new Map<string, Set<string>>();
  for (const property of DEMO_PROPERTIES) {
    if (!agentKeys.has(property.agentKey)) {
      throw new DemoSeedError(`Demo property '${property.title}' references an unknown agent.`);
    }
    const titles = titlesPerAgent.get(property.agentKey) ?? new Set<string>();
    if (titles.has(property.title)) {
      throw new DemoSeedError(`Duplicate demo property title '${property.title}' for one agent.`);
    }
    titles.add(property.title);
    titlesPerAgent.set(property.agentKey, titles);
  }
  for (const key of agentKeys) {
    const count = titlesPerAgent.get(key)?.size ?? 0;
    if (count < 2 || count > 3) {
      throw new DemoSeedError(`Demo agent ${key} must own 2-3 properties (has ${count}).`);
    }
  }
  const slugs = new Set<string>();
  for (const project of DEMO_PROJECTS) {
    if (!project.slug.startsWith(DEMO_PROJECT_SLUG_PREFIX) || slugs.has(project.slug)) {
      throw new DemoSeedError(`Demo project slug '${project.slug}' is invalid or duplicated.`);
    }
    slugs.add(project.slug);
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Inserts (manifest first) or updates one owned record and reports what happened. */
async function upsertOwned(
  collection: SeedCollection,
  manifest: DemoSeedManifest,
  kind: DemoRecordKind,
  seedKey: string,
  existing: PlainRecord | null,
  managedValues: Record<string, unknown>,
  createOnlyValues: Record<string, unknown>,
  counts: DemoSeedCounts,
): Promise<string> {
  if (!existing) {
    const id = new mongoose.Types.ObjectId().toHexString();
    // Register before inserting so a crash can never leave an untracked record.
    await manifest.add({ kind, recordId: id, seedKey });
    await collection.insertOne({ _id: id, ...managedValues, ...createOnlyValues });
    counts.created += 1;
    return id;
  }
  const candidate = await collection.normalize({ ...existing, ...managedValues });
  const changed = Object.keys(managedValues).filter(
    (key) => stableJson(candidate[key]) !== stableJson(existing[key]),
  );
  if (changed.length === 0) {
    counts.unchanged += 1;
  } else {
    const patch = Object.fromEntries(changed.map((key) => [key, managedValues[key]]));
    await collection.updateOne(existing._id, patch);
    counts.updated += 1;
  }
  return existing._id;
}

export async function seedDemoData(
  collections: DemoSeedCollections,
  password: string,
  now: Date = new Date(),
): Promise<DemoSeedSummary> {
  assertDemoDataConsistency();
  const summary: DemoSeedSummary = {
    agents: emptyCounts(),
    properties: emptyCounts(),
    projects: emptyCounts(),
    advertisements: emptyCounts(),
    agencies: emptyCounts(),
  };

  const owned = new Set((await collections.manifest.list()).map(manifestEntryId));
  const isOwned = (kind: DemoRecordKind, id: string) =>
    owned.has(manifestEntryId({ kind, recordId: id }));

  // Preflight: every pre-existing match must be a record this seeder created.
  // Anything else is a collision; stop before the first write.
  const collisions: string[] = [];
  const existingAgents = new Map<string, PlainRecord | null>();
  for (const agent of DEMO_AGENTS) {
    const email = demoAgentEmail(agent);
    const existing = await collections.users.findOne({ email });
    if (existing && !(isOwned('user', existing._id) && existing.role === UserRole.AGENT)) {
      collisions.push(`account ${email}`);
    }
    existingAgents.set(agent.key, existing);
  }
  // Reference ids are queried as ObjectIds: Property.agentId and
  // PropertyAdvertisement.propertyId resolve to Mixed paths through the Nest
  // schema factory, so Mongoose does not cast hex strings for them.
  const existingProperties = new Map<string, PlainRecord | null>();
  for (const property of DEMO_PROPERTIES) {
    const owner = existingAgents.get(property.agentKey);
    const matches = owner
      ? await collections.properties.findMany({
          agentId: new mongoose.Types.ObjectId(owner._id),
          title: property.title,
        })
      : [];
    if (matches.length > 1) {
      collisions.push(`${matches.length} listings titled "${property.title}" for one demo agent`);
    }
    const existing = matches[0] ?? null;
    if (existing && !isOwned('property', existing._id)) {
      collisions.push(`listing "${property.title}"`);
    }
    existingProperties.set(propertySeedKey(property), existing);
  }
  // Marketplace visibility requires a published advertisement per listing
  // (PropertiesService.findAll). Only ads this seeder created may be reused.
  const existingAdvertisements = new Map<string, PlainRecord | null>();
  for (const property of DEMO_PROPERTIES) {
    const listing = existingProperties.get(propertySeedKey(property));
    const existing = listing
      ? await collections.advertisements.findOne({
          propertyId: new mongoose.Types.ObjectId(listing._id),
        })
      : null;
    if (existing && !isOwned('advertisement', existing._id)) {
      collisions.push(`advertisement for listing "${property.title}"`);
    }
    existingAdvertisements.set(propertySeedKey(property), existing);
  }
  const existingProjects = new Map<string, PlainRecord | null>();
  for (const project of DEMO_PROJECTS) {
    const existing = await collections.projects.findOne({ slug: project.slug });
    if (existing && !isOwned('project', existing._id)) collisions.push(`project ${project.slug}`);
    existingProjects.set(project.slug, existing);
  }
  // Agency profiles are matched by normalizedName (unique index), exactly as
  // the public agency endpoints resolve them.
  const existingAgencies = new Map<string, PlainRecord | null>();
  for (const agency of DEMO_AGENCIES) {
    const normalizedName = normalizeDemoAgencyName(agency.name);
    const existing = await collections.agencies.findOne({ normalizedName });
    if (existing && !isOwned('agency', existing._id)) collisions.push(`agency profile "${agency.name}"`);
    existingAgencies.set(agency.key, existing);
  }
  if (collisions.length > 0) {
    throw new DemoSeedError(
      `These demo records already exist but were not created by this seeder: ${collisions.join(', ')}. ` +
        'No records were changed.',
    );
  }

  // Validate every record against the real schemas before the first write.
  const placeholderAgentId = new mongoose.Types.ObjectId();
  for (const property of DEMO_PROPERTIES) {
    await collections.properties.normalize(buildPropertyValues(property, placeholderAgentId));
  }
  for (const project of DEMO_PROJECTS) {
    await collections.projects.normalize(buildProjectValues(project));
  }
  for (const agency of DEMO_AGENCIES) {
    await collections.agencies.normalize({ ...buildAgencyValues(agency), ...buildAgencyCreateOnlyValues(agency) });
  }

  const agentIds = new Map<string, mongoose.Types.ObjectId>();
  for (const agent of DEMO_AGENTS) {
    const existing = existingAgents.get(agent.key) ?? null;
    const managed: Record<string, unknown> = {
      name: agent.name,
      email: demoAgentEmail(agent),
      phone: agent.phone,
      role: UserRole.AGENT,
      agencyName: agent.agencyName,
      agencyAddress: agent.agencyAddress,
      city: DEMO_CITY,
      avatarUrl: agent.avatarUrl,
    };
    const passwordMatches =
      existing?.passwordHash && (await bcrypt.compare(password, existing.passwordHash));
    if (!passwordMatches) {
      managed.passwordHash = await bcrypt.hash(password, DEMO_PASSWORD_BCRYPT_ROUNDS);
    }
    const verified = agent.verificationStatus === 'verified';
    const createOnly: Record<string, unknown> = {
      accountStatus: UserAccountStatus.ACTIVE,
      verificationStatus: agent.verificationStatus,
      isVerified: verified,
      verificationChangedAt: now,
      ...(verified ? { verifiedAt: now } : {}),
    };
    const id = await upsertOwned(
      collections.users, collections.manifest, 'user', `agent:${agent.key}`,
      existing, managed, createOnly, summary.agents,
    );
    agentIds.set(agent.key, new mongoose.Types.ObjectId(id));
  }

  // Name/normalizedName stay aligned with the agents' agencyName. Profile
  // content and status are create-only so agent edits and admin moderation
  // (and any logo the agent uploads later) survive re-runs.
  for (const agency of DEMO_AGENCIES) {
    await upsertOwned(
      collections.agencies, collections.manifest, 'agency', `agency:${agency.key}`,
      existingAgencies.get(agency.key) ?? null,
      buildAgencyValues(agency),
      buildAgencyCreateOnlyValues(agency),
      summary.agencies,
    );
  }

  const propertyIds = new Map<string, mongoose.Types.ObjectId>();
  for (const property of DEMO_PROPERTIES) {
    const agentId = agentIds.get(property.agentKey)!;
    const initialStatus = property.initialStatus ?? PropertyStatus.PUBLISHED;
    const propertyId = await upsertOwned(
      collections.properties, collections.manifest, 'property', propertySeedKey(property),
      existingProperties.get(propertySeedKey(property)) ?? null,
      buildPropertyValues(property, agentId),
      {
        status: initialStatus,
        inventoryStatus: property.initialInventoryStatus ?? 'available',
        isFeatured: property.isFeatured ?? false,
        ...(initialStatus === PropertyStatus.PENDING_APPROVAL ? {} : { moderatedAt: now }),
      },
      summary.properties,
    );
    propertyIds.set(propertySeedKey(property), new mongoose.Types.ObjectId(propertyId));
  }

  // One published advertisement per demo listing. Status/timestamps are
  // create-only so admin moderation of a demo ad survives re-runs.
  for (const property of DEMO_PROPERTIES) {
    const key = propertySeedKey(property);
    await upsertOwned(
      collections.advertisements, collections.manifest, 'advertisement', `advertisement:${key}`,
      existingAdvertisements.get(key) ?? null,
      { propertyId: propertyIds.get(key)!, agentId: agentIds.get(property.agentKey)! },
      {
        status: PropertyAdvertisementStatus.PUBLISHED,
        submittedAt: now,
        approvedAt: now,
        publishedAt: now,
      },
      summary.advertisements,
    );
  }

  for (const project of DEMO_PROJECTS) {
    await upsertOwned(
      collections.projects, collections.manifest, 'project', `project:${project.slug}`,
      existingProjects.get(project.slug) ?? null,
      buildProjectValues(project),
      {
        isPublished: project.initialIsPublished,
        isFeatured: project.initialIsFeatured,
        displayOrder: project.initialDisplayOrder,
      },
      summary.projects,
    );
  }

  return summary;
}

function propertySeedKey(property: (typeof DEMO_PROPERTIES)[number]): string {
  return `property:${property.agentKey}:${property.title}`;
}

function buildPropertyValues(
  property: (typeof DEMO_PROPERTIES)[number],
  agentId: mongoose.Types.ObjectId,
): Record<string, unknown> {
  return {
    title: property.title,
    description: property.description,
    purpose: property.purpose,
    propertyType: property.propertyType,
    price: property.price,
    areaSize: property.areaSize,
    areaUnit: property.areaUnit,
    location: { city: DEMO_CITY, area: property.area },
    features: property.features,
    images: property.images,
    agentId,
  };
}

function buildAgencyValues(agency: DemoAgencySeed): Record<string, unknown> {
  return { name: agency.name, normalizedName: normalizeDemoAgencyName(agency.name) };
}

function buildAgencyCreateOnlyValues(agency: DemoAgencySeed): Record<string, unknown> {
  return {
    description: agency.description,
    agencyType: agency.agencyType,
    officeAddress: agency.officeAddress,
    city: DEMO_CITY,
    logoUrl: agency.logoUrl,
    coverImageUrl: agency.coverImageUrl,
    galleryUrls: [],
    status: AgencyAccountStatus.ACTIVE,
  };
}

function buildProjectValues(project: (typeof DEMO_PROJECTS)[number]): Record<string, unknown> {
  return {
    slug: project.slug,
    name: project.name,
    developer: project.developer,
    shortDescription: project.shortDescription,
    description: project.description,
    location: project.location,
    projectType: project.projectType,
    categories: project.categories,
    priceRange: project.priceRange,
    status: project.status,
    coverImage: project.coverImage,
    gallery: project.gallery,
    amenities: project.amenities,
    additionalInformation: project.additionalInformation,
    paymentPlan: project.paymentPlan,
  };
}

/** Validates all demo records against the real schemas without connecting. */
export async function dryRunDemoSeed(): Promise<{
  agents: number;
  agencies: number;
  properties: number;
  projects: number;
}> {
  assertDemoDataConsistency();
  const connection = mongoose.createConnection();
  try {
    const models = registerDemoSeedModels(connection);
    const placeholderHash = await bcrypt.hash('dry-run-placeholder', DEMO_PASSWORD_BCRYPT_ROUNDS);
    for (const agent of DEMO_AGENTS) {
      await new models.user({
        name: agent.name,
        email: demoAgentEmail(agent),
        phone: agent.phone,
        role: UserRole.AGENT,
        agencyName: agent.agencyName,
        agencyAddress: agent.agencyAddress,
        city: DEMO_CITY,
        avatarUrl: agent.avatarUrl,
        passwordHash: placeholderHash,
        verificationStatus: agent.verificationStatus,
      }).validate();
    }
    const agentId = new mongoose.Types.ObjectId();
    for (const property of DEMO_PROPERTIES) {
      await new models.property({
        ...buildPropertyValues(property, agentId),
        status: property.initialStatus ?? PropertyStatus.PUBLISHED,
        inventoryStatus: property.initialInventoryStatus ?? 'available',
      }).validate();
    }
    for (const project of DEMO_PROJECTS) {
      await new models.project(buildProjectValues(project)).validate();
    }
    await new models.advertisement({
      propertyId: new mongoose.Types.ObjectId(),
      agentId,
      status: PropertyAdvertisementStatus.PUBLISHED,
      approvedAt: new Date(),
      publishedAt: new Date(),
    }).validate();
    for (const agency of DEMO_AGENCIES) {
      await new models.agency({
        ...buildAgencyValues(agency),
        ...buildAgencyCreateOnlyValues(agency),
      }).validate();
    }
  } finally {
    await connection.close();
  }
  return {
    agents: DEMO_AGENTS.length,
    agencies: DEMO_AGENCIES.length,
    properties: DEMO_PROPERTIES.length,
    projects: DEMO_PROJECTS.length,
  };
}

function formatCounts(label: string, counts: DemoSeedCounts): string {
  return `${label}: ${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged`;
}

export function reportDemoFailure(prefix: string, error: unknown): void {
  if (error instanceof DemoSeedError) {
    console.error(`${prefix} stopped: ${error.message}`);
  } else if (error instanceof mongoose.Error.ValidationError) {
    console.error(`${prefix} failed schema validation: ${Object.keys(error.errors).join(', ')}`);
  } else {
    const code =
      error && typeof error === 'object' && 'code' in error &&
      (typeof error.code === 'number' || typeof error.code === 'string')
        ? ` (database error ${error.code})`
        : '';
    console.error(`${prefix} failed${code}. Connection details and credentials are not logged.`);
  }
}

export async function executeDemoSeed(env: NodeJS.ProcessEnv, args: string[]): Promise<void> {
  const options = resolveDemoSeedOptions(env, args);
  if (options.dryRun) {
    const counts = await dryRunDemoSeed();
    console.log(
      `Dry run passed schema validation for ${counts.agents} agents, ${counts.agencies} agencies, ` +
        `${counts.properties} properties ` +
        `and ${counts.projects} projects. No database connection was made.`,
    );
    return;
  }

  const connection = await openDemoConnection(options.uri!);
  try {
    const models = registerDemoSeedModels(connection);
    const summary = await seedDemoData(
      {
        users: createMongooseCollection(models.user),
        properties: createMongooseCollection(models.property),
        projects: createMongooseCollection(models.project),
        advertisements: createMongooseCollection(models.advertisement),
        agencies: createMongooseCollection(models.agency),
        manifest: createMongoManifest(connection),
      },
      options.password!,
    );
    console.log(`Demo seed completed for database '${options.databaseName}'.`);
    console.log(formatCounts('Agents', summary.agents));
    console.log(formatCounts('Properties', summary.properties));
    console.log(formatCounts('Projects', summary.projects));
    console.log(formatCounts('Advertisements', summary.advertisements));
    console.log(formatCounts('Agencies', summary.agencies));
    console.log(
      `Demo agents sign in with ${DEMO_AGENTS.map(demoAgentEmail).join(', ')} and the DEMO_SEED_PASSWORD value.`,
    );
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  executeDemoSeed(process.env, process.argv.slice(2)).catch((error: unknown) => {
    reportDemoFailure('Demo seed', error);
    process.exitCode = 1;
  });
}
