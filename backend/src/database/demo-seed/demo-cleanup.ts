/**
 * Demo data cleanup (`npm run seed:demo:cleanup`).
 *
 * Removes only records whose exact _id is registered in `demo_seed_manifest`
 * by the demo seeder. Before deleting anything it re-checks each record's
 * identity and looks for genuine user activity that references the demo
 * records (leads, conversations, messages, favourites, offers, reports, ads,
 * location shares, agency profiles not created by the seeder, extra listings). If any is found it
 * reports the dependencies and stops without deleting anything.
 *
 * `--dry-run` reports what would be removed. Actual deletion requires
 * ALLOW_DEMO_SEED=true, DEMO_SEED_URI and --confirm-database=<name>.
 */
import 'reflect-metadata';
import mongoose = require('mongoose');
import { UserRole } from '../../modules/users/schemas/user.schema';
import { Lead, LeadSchema } from '../../modules/crm/schemas/lead.schema';
import {
  PropertyConversation,
  PropertyConversationSchema,
} from '../../modules/crm/schemas/property-conversation.schema';
import { PropertyMessage, PropertyMessageSchema } from '../../modules/crm/schemas/property-message.schema';
import {
  VisitorChatSession,
  VisitorChatSessionSchema,
} from '../../modules/crm/schemas/visitor-chat-session.schema';
import { SavedProperty, SavedPropertySchema } from '../../modules/buyer/schemas/saved-property.schema';
import {
  BuyerNotification,
  BuyerNotificationSchema,
} from '../../modules/buyer/schemas/buyer-notification.schema';
import {
  PropertyAdvertisement,
  PropertyAdvertisementSchema,
} from '../../modules/properties/schemas/property-advertisement.schema';
import {
  PropertyLocationShare,
  PropertyLocationShareSchema,
} from '../../modules/properties/schemas/property-location-share.schema';
import {
  PropertyAnalyticsEvent,
  PropertyAnalyticsEventSchema,
} from '../../modules/properties/schemas/property-analytics-event.schema';
import {
  RequirementOffer,
  RequirementOfferSchema,
} from '../../modules/requirements/schemas/requirement-offer.schema';
import {
  ClientRequirement,
  ClientRequirementSchema,
} from '../../modules/requirements/schemas/client-requirement.schema';
import { UserReport, UserReportSchema } from '../../modules/admin/schemas/user-report.schema';
import { AdminActivity, AdminActivitySchema } from '../../modules/admin/schemas/admin-activity.schema';
import {
  UserNotification,
  UserNotificationSchema,
} from '../../modules/notifications/schemas/user-notification.schema';
import { Agency, AgencySchema } from '../../modules/agencies/schemas/agency.schema';
import { DEMO_AGENCIES, DEMO_AGENTS, DEMO_PROJECT_SLUG_PREFIX } from './demo-seed-data';
import {
  DemoSeedError,
  assertDemoEnvironment,
  createMongoManifest,
  createMongooseCollection,
  demoAgentEmail,
  openDemoConnection,
  parseDemoArgs,
  registerDemoSeedModels,
  reportDemoFailure,
  resolveDemoTarget,
  type DemoManifestEntry,
  type DemoSeedCollections,
  type PlainRecord,
  type SeedCollection,
} from './demo-seed';

interface DependencyIds {
  userIds: mongoose.Types.ObjectId[];
  propertyIds: mongoose.Types.ObjectId[];
  /** Advertisements registered in the manifest; these are demo records, not dependencies. */
  advertisementIds: mongoose.Types.ObjectId[];
  /** Agency profiles registered in the manifest; demo records, not dependencies. */
  agencyIds: mongoose.Types.ObjectId[];
  allIdStrings: string[];
  agencyNames: string[];
}

export interface DependencySpec {
  label: string;
  modelName: string;
  schema: mongoose.Schema;
  /** Blocking dependencies are genuine activity: cleanup stops if any exist. */
  blocking: boolean;
  filter(ids: DependencyIds): Record<string, unknown>;
}

const anyOf = (field: string, values: unknown[]) => ({ [field]: { $in: values } });

/**
 * Collections that can reference demo agents, listings or projects. Blocking
 * entries represent real user activity and are never deleted by cleanup.
 * Non-blocking entries are automatic records (audit log, notifications to the
 * demo accounts themselves, view analytics); they are left in place untouched.
 */
export const DEMO_DEPENDENCY_SPECS: DependencySpec[] = [
  { label: 'CRM leads / enquiries', modelName: Lead.name, schema: LeadSchema, blocking: true,
    filter: ({ userIds, propertyIds }) => ({ $or: [anyOf('propertyId', propertyIds), anyOf('agentId', userIds)] }) },
  { label: 'property conversations', modelName: PropertyConversation.name, schema: PropertyConversationSchema, blocking: true,
    filter: ({ userIds, propertyIds }) => ({ $or: [anyOf('propertyId', propertyIds), anyOf('agentId', userIds)] }) },
  { label: 'property messages sent by demo agents', modelName: PropertyMessage.name, schema: PropertyMessageSchema, blocking: true,
    filter: ({ userIds }) => anyOf('senderId', userIds) },
  { label: 'visitor chat sessions', modelName: VisitorChatSession.name, schema: VisitorChatSessionSchema, blocking: true,
    filter: ({ propertyIds }) => anyOf('propertyId', propertyIds) },
  { label: 'buyer favourites (saved properties)', modelName: SavedProperty.name, schema: SavedPropertySchema, blocking: true,
    filter: ({ propertyIds }) => anyOf('propertyId', propertyIds) },
  { label: 'buyer notifications about demo listings', modelName: BuyerNotification.name, schema: BuyerNotificationSchema, blocking: true,
    filter: ({ propertyIds }) => anyOf('propertyId', propertyIds) },
  { label: 'property advertisements not created by the demo seeder', modelName: PropertyAdvertisement.name, schema: PropertyAdvertisementSchema, blocking: true,
    filter: ({ userIds, propertyIds, advertisementIds }) => ({
      $or: [anyOf('propertyId', propertyIds), anyOf('agentId', userIds)],
      _id: { $nin: advertisementIds },
    }) },
  { label: 'private location shares', modelName: PropertyLocationShare.name, schema: PropertyLocationShareSchema, blocking: true,
    filter: ({ userIds, propertyIds }) => ({ $or: [anyOf('propertyId', propertyIds), anyOf('agentId', userIds)] }) },
  { label: 'requirement offers', modelName: RequirementOffer.name, schema: RequirementOfferSchema, blocking: true,
    filter: ({ userIds, propertyIds }) => ({ $or: [anyOf('propertyId', propertyIds), anyOf('agentId', userIds)] }) },
  { label: 'buyer requirements offered by demo agents', modelName: ClientRequirement.name, schema: ClientRequirementSchema, blocking: true,
    filter: ({ userIds }) => anyOf('offeredAgentIds', userIds) },
  { label: 'user reports about demo records', modelName: UserReport.name, schema: UserReportSchema, blocking: true,
    filter: ({ allIdStrings }) => anyOf('targetId', allIdStrings) },
  { label: 'agency profiles under demo agency names not created by the demo seeder', modelName: Agency.name, schema: AgencySchema, blocking: true,
    filter: ({ agencyNames, agencyIds }) => ({
      ...anyOf('normalizedName', agencyNames),
      _id: { $nin: agencyIds },
    }) },
  { label: 'listing analytics events (left in place)', modelName: PropertyAnalyticsEvent.name, schema: PropertyAnalyticsEventSchema, blocking: false,
    filter: ({ propertyIds }) => anyOf('propertyId', propertyIds) },
  { label: 'notifications to demo accounts (left in place)', modelName: UserNotification.name, schema: UserNotificationSchema, blocking: false,
    filter: ({ userIds }) => anyOf('userId', userIds) },
  { label: 'admin audit log entries (left in place)', modelName: AdminActivity.name, schema: AdminActivitySchema, blocking: false,
    filter: ({ allIdStrings }) => anyOf('entityId', allIdStrings) },
];

export interface DemoCleanupStore extends DemoSeedCollections {
  dependency(modelName: string): SeedCollection;
}

export interface DemoCleanupPlan {
  users: PlainRecord[];
  properties: PlainRecord[];
  projects: PlainRecord[];
  advertisements: PlainRecord[];
  agencies: PlainRecord[];
  /** Manifest entries whose record no longer exists; removed from the manifest. */
  staleEntries: DemoManifestEntry[];
  blockers: { label: string; count: number }[];
  retained: { label: string; count: number }[];
  entries: DemoManifestEntry[];
}

const normalizeAgencyName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export async function planDemoCleanup(store: DemoCleanupStore): Promise<DemoCleanupPlan> {
  const entries = await store.manifest.list();
  const idsOf = (kind: DemoManifestEntry['kind']) =>
    entries.filter((entry) => entry.kind === kind).map((entry) => entry.recordId);
  const userIdList = idsOf('user');
  const propertyIdList = idsOf('property');
  const projectIdList = idsOf('project');
  const advertisementIdList = idsOf('advertisement');
  const agencyIdList = idsOf('agency');
  const toIds = (ids: string[]) => ids.map((id) => new mongoose.Types.ObjectId(id));

  const users = userIdList.length ? await store.users.findMany({ _id: { $in: toIds(userIdList) } }) : [];
  const properties = propertyIdList.length
    ? await store.properties.findMany({ _id: { $in: toIds(propertyIdList) } })
    : [];
  const projects = projectIdList.length
    ? await store.projects.findMany({ _id: { $in: toIds(projectIdList) } })
    : [];
  const advertisements = advertisementIdList.length
    ? await store.advertisements.findMany({ _id: { $in: toIds(advertisementIdList) } })
    : [];
  const agencies = agencyIdList.length
    ? await store.agencies.findMany({ _id: { $in: toIds(agencyIdList) } })
    : [];

  const found = new Set(
    [...users, ...properties, ...projects, ...advertisements, ...agencies].map((record) => String(record._id)),
  );
  const staleEntries = entries.filter((entry) => !found.has(entry.recordId));
  const blockers: DemoCleanupPlan['blockers'] = [];

  // Identity re-check: the manifest record must still look like what we seeded.
  const demoEmails = new Set(DEMO_AGENTS.map(demoAgentEmail));
  const userIdSet = new Set(userIdList);
  const badUsers = users.filter(
    (user) => user.role !== UserRole.AGENT || !demoEmails.has(String(user.email).toLowerCase()),
  );
  if (badUsers.length) blockers.push({ label: 'manifest accounts that no longer match a demo agent (role or email changed)', count: badUsers.length });
  const badProperties = properties.filter((property) => !userIdSet.has(String(property.agentId)));
  if (badProperties.length) blockers.push({ label: 'manifest listings no longer owned by a demo agent', count: badProperties.length });
  const badProjects = projects.filter((project) => !String(project.slug).startsWith(DEMO_PROJECT_SLUG_PREFIX));
  if (badProjects.length) blockers.push({ label: 'manifest projects whose slug changed', count: badProjects.length });
  const propertyIdSet = new Set(propertyIdList);
  const badAdvertisements = advertisements.filter(
    (ad) => !propertyIdSet.has(String(ad.propertyId)) || !userIdSet.has(String(ad.agentId)),
  );
  if (badAdvertisements.length) blockers.push({ label: 'manifest advertisements no longer attached to a demo listing and agent', count: badAdvertisements.length });

  const demoAgencyNames = new Set(DEMO_AGENCIES.map((agency) => normalizeAgencyName(agency.name)));
  const badAgencies = agencies.filter(
    (agency) => !demoAgencyNames.has(normalizeAgencyName(String(agency.normalizedName ?? ''))),
  );
  if (badAgencies.length) blockers.push({ label: 'manifest agency profiles renamed away from a demo agency name', count: badAgencies.length });

  const liveUserIds = toIds(users.map((user) => String(user._id)));
  const livePropertyIds = toIds(properties.map((property) => String(property._id)));
  if (liveUserIds.length) {
    const extraListings = await store.properties.countDocuments({
      agentId: { $in: liveUserIds },
      _id: { $nin: toIds(propertyIdList) },
    });
    if (extraListings) blockers.push({ label: 'listings created through demo agent logins (not seeded)', count: extraListings });
  }

  const ids: DependencyIds = {
    userIds: liveUserIds,
    propertyIds: livePropertyIds,
    advertisementIds: toIds(advertisementIdList),
    agencyIds: toIds(agencyIdList),
    allIdStrings: [...users, ...properties, ...projects, ...agencies].map((record) => String(record._id)),
    agencyNames: [
      ...new Set([
        ...users.map((user) => normalizeAgencyName(String(user.agencyName ?? ''))),
        ...demoAgencyNames,
      ]),
    ].filter(Boolean),
  };
  const retained: DemoCleanupPlan['retained'] = [];
  if (ids.allIdStrings.length) {
    for (const spec of DEMO_DEPENDENCY_SPECS) {
      const count = await store.dependency(spec.modelName).countDocuments(spec.filter(ids));
      if (count > 0) (spec.blocking ? blockers : retained).push({ label: spec.label, count });
    }
  }

  return { users, properties, projects, advertisements, agencies, staleEntries, blockers, retained, entries };
}

export interface DemoCleanupResult {
  dryRun: boolean;
  plan: DemoCleanupPlan;
  deleted: {
    advertisements: number;
    agencies: number;
    users: number;
    properties: number;
    projects: number;
    manifestEntries: number;
  };
}

export async function cleanupDemoData(
  store: DemoCleanupStore,
  options: { dryRun: boolean },
): Promise<DemoCleanupResult> {
  const plan = await planDemoCleanup(store);
  const deleted = { advertisements: 0, agencies: 0, users: 0, properties: 0, projects: 0, manifestEntries: 0 };
  if (plan.blockers.length > 0) {
    throw new DemoSeedError(
      'Cleanup stopped; nothing was deleted. Demo records have dependencies that may be genuine user data: ' +
        plan.blockers.map((blocker) => `${blocker.count} ${blocker.label}`).join('; ') +
        '. Review them before removing demo data.',
    );
  }
  if (options.dryRun) return { dryRun: true, plan, deleted };

  // Advertisements (reference listings) and agency profiles (resolved through
  // agent agencyName) first, then listings, projects, and finally the agent
  // accounts that own them.
  deleted.advertisements = await store.advertisements.deleteByIds(
    plan.advertisements.map((record) => String(record._id)),
  );
  deleted.agencies = await store.agencies.deleteByIds(plan.agencies.map((record) => String(record._id)));
  deleted.properties = await store.properties.deleteByIds(plan.properties.map((record) => String(record._id)));
  deleted.projects = await store.projects.deleteByIds(plan.projects.map((record) => String(record._id)));
  deleted.users = await store.users.deleteByIds(plan.users.map((record) => String(record._id)));
  await store.manifest.remove(plan.entries);
  deleted.manifestEntries = plan.entries.length;
  return { dryRun: false, plan, deleted };
}

export function resolveDemoCleanupOptions(env: NodeJS.ProcessEnv, args: string[]) {
  assertDemoEnvironment(env);
  const { dryRun, allowRemote, confirmedDatabase } = parseDemoArgs(args);
  return { dryRun, ...resolveDemoTarget(env, confirmedDatabase, allowRemote) };
}

export function formatCleanupReport(result: DemoCleanupResult, databaseName: string): string[] {
  const { plan } = result;
  const lines = [
    `${result.dryRun ? 'Dry run — would remove' : 'Removed'} from database '${databaseName}':`,
    `  Agents (${plan.users.length}): ${plan.users.map((user) => user.email).join(', ') || 'none'}`,
    `  Properties (${plan.properties.length}): ${plan.properties.map((p) => `"${p.title}"`).join(', ') || 'none'}`,
    `  Projects (${plan.projects.length}): ${plan.projects.map((p) => p.slug).join(', ') || 'none'}`,
    `  Advertisements (${plan.advertisements.length}) for the demo listings above`,
    `  Agency profiles (${plan.agencies.length}): ${plan.agencies.map((a) => `"${a.name}"`).join(', ') || 'none'}`,
    `  Manifest entries: ${plan.entries.length} (${plan.staleEntries.length} already without a record)`,
  ];
  for (const item of plan.retained) lines.push(`  Left in place: ${item.count} ${item.label}`);
  if (!result.dryRun) {
    lines.push(
      `  Deleted: ${result.deleted.advertisements} advertisements, ${result.deleted.agencies} agency profiles, ` +
        `${result.deleted.users} agents, ` +
        `${result.deleted.properties} properties, ${result.deleted.projects} projects, ` +
        `${result.deleted.manifestEntries} manifest entries.`,
    );
  }
  return lines;
}

export async function executeDemoCleanup(env: NodeJS.ProcessEnv, args: string[]): Promise<void> {
  const options = resolveDemoCleanupOptions(env, args);
  const connection = await openDemoConnection(options.uri);
  try {
    const models = registerDemoSeedModels(connection);
    const advertisements = createMongooseCollection(models.advertisement);
    const agencies = createMongooseCollection(models.agency);
    const shared = new Map([
      [models.advertisement.modelName, advertisements],
      [models.agency.modelName, agencies],
    ]);
    const dependencyModels = new Map(
      DEMO_DEPENDENCY_SPECS.map((spec) => [
        spec.modelName,
        // PropertyAdvertisement and Agency are already registered as seeded record kinds.
        shared.get(spec.modelName) ??
          createMongooseCollection(connection.model(spec.modelName, spec.schema)),
      ]),
    );
    const store: DemoCleanupStore = {
      users: createMongooseCollection(models.user),
      properties: createMongooseCollection(models.property),
      projects: createMongooseCollection(models.project),
      advertisements,
      agencies,
      manifest: createMongoManifest(connection),
      dependency: (name) => dependencyModels.get(name)!,
    };
    const result = await cleanupDemoData(store, { dryRun: options.dryRun });
    for (const line of formatCleanupReport(result, options.databaseName)) console.log(line);
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  executeDemoCleanup(process.env, process.argv.slice(2)).catch((error: unknown) => {
    reportDemoFailure('Demo cleanup', error);
    process.exitCode = 1;
  });
}
