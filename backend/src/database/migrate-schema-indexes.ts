import mongoose = require('mongoose');
import {
  SCHEMA_INDEX_MIGRATION_VERSION,
  SchemaIndexMigrationError,
  resolveMigrationTarget,
  runSchemaIndexMigration,
  type MigrationModel,
} from './schema-index-migration';
import { AdminActivity, AdminActivitySchema } from '../modules/admin/schemas/admin-activity.schema';
import { UserReport, UserReportSchema } from '../modules/admin/schemas/user-report.schema';
import { BuyerNotification, BuyerNotificationSchema } from '../modules/buyer/schemas/buyer-notification.schema';
import { BuyerProfile, BuyerProfileSchema } from '../modules/buyer/schemas/buyer-profile.schema';
import { SavedProperty, SavedPropertySchema } from '../modules/buyer/schemas/saved-property.schema';
import { SavedSearch, SavedSearchSchema } from '../modules/buyer/schemas/saved-search.schema';
import { Lead, LeadSchema } from '../modules/crm/schemas/lead.schema';
import { PropertyConversation, PropertyConversationSchema } from '../modules/crm/schemas/property-conversation.schema';
import { PropertyMessage, PropertyMessageSchema } from '../modules/crm/schemas/property-message.schema';
import { VisitorChatSession, VisitorChatSessionSchema } from '../modules/crm/schemas/visitor-chat-session.schema';
import { PropertyAdvertisement, PropertyAdvertisementSchema } from '../modules/properties/schemas/property-advertisement.schema';
import { PropertyAnalyticsDeduplication, PropertyAnalyticsDeduplicationSchema } from '../modules/properties/schemas/property-analytics-deduplication.schema';
import { PropertyAnalyticsEvent, PropertyAnalyticsEventSchema } from '../modules/properties/schemas/property-analytics-event.schema';
import { PropertyLocationShare, PropertyLocationShareSchema } from '../modules/properties/schemas/property-location-share.schema';
import { Property, PropertySchema } from '../modules/properties/schemas/property.schema';
import { ClientRequirement, ClientRequirementSchema } from '../modules/requirements/schemas/client-requirement.schema';
import { RequirementOffer, RequirementOfferSchema } from '../modules/requirements/schemas/requirement-offer.schema';
import { User, UserSchema } from '../modules/users/schemas/user.schema';
import { Agency, AgencySchema } from '../modules/agencies/schemas/agency.schema';
import {
  DevelopmentProject,
  DevelopmentProjectSchema,
} from '../modules/projects/schemas/development-project.schema';
import {
  MaintenanceRequest,
  MaintenanceRequestSchema,
} from '../modules/maintenance/schemas/maintenance-request.schema';
import {
  TechnicianProfile,
  TechnicianProfileSchema,
} from '../modules/maintenance/schemas/technician-profile.schema';
import {
  UserNotification,
  UserNotificationSchema,
} from '../modules/notifications/schemas/user-notification.schema';
import { PromoCampaign, PromoCampaignSchema } from '../modules/promotions/schemas/promo-campaign.schema';
import { PromoDailyStat, PromoDailyStatSchema } from '../modules/promotions/schemas/promo-daily-stat.schema';
import { PromoEventDedup, PromoEventDedupSchema } from '../modules/promotions/schemas/promo-event-dedup.schema';
import { PromoSettings, PromoSettingsSchema } from '../modules/promotions/schemas/promo-settings.schema';

export const APPROVED_INDEX_SCHEMAS = [
  { modelName: AdminActivity.name, schema: AdminActivitySchema, purpose: 'admin activity filtering by actor/action/entity and reverse-chronological audit listing' },
  { modelName: UserReport.name, schema: UserReportSchema, purpose: 'report filtering by target, status, and source with newest-first lists' },
  { modelName: BuyerNotification.name, schema: BuyerNotificationSchema, purpose: 'buyer notification inbox filtering and event deduplication' },
  { modelName: BuyerProfile.name, schema: BuyerProfileSchema, purpose: 'one profile per buyer constraint' },
  { modelName: SavedProperty.name, schema: SavedPropertySchema, purpose: 'buyer saved-property uniqueness and recent saved-property lists' },
  { modelName: SavedSearch.name, schema: SavedSearchSchema, purpose: 'buyer saved-search lists ordered by creation time' },
  { modelName: Lead.name, schema: LeadSchema, purpose: 'agent pipeline queries and per-visitor/property lead deduplication' },
  { modelName: PropertyConversation.name, schema: PropertyConversationSchema, purpose: 'visitor/property conversation uniqueness and agent/buyer inbox queries' },
  { modelName: PropertyMessage.name, schema: PropertyMessageSchema, purpose: 'conversation timelines, read-state filtering, and idempotent message writes' },
  { modelName: VisitorChatSession.name, schema: VisitorChatSessionSchema, purpose: 'visitor token lookup, property scoping, and session expiry' },
  { modelName: PropertyAdvertisement.name, schema: PropertyAdvertisementSchema, purpose: 'one advertisement per property and agent/status listing queries' },
  { modelName: PropertyAnalyticsDeduplication.name, schema: PropertyAnalyticsDeduplicationSchema, purpose: 'analytics deduplication and TTL cleanup' },
  { modelName: PropertyAnalyticsEvent.name, schema: PropertyAnalyticsEventSchema, purpose: 'agent/property/advertisement analytics queries and event deduplication' },
  { modelName: PropertyLocationShare.name, schema: PropertyLocationShareSchema, purpose: 'property/agent/recipient access, token uniqueness, and share expiry' },
  { modelName: Property.name, schema: PropertySchema, purpose: 'property listing filters, manager ownership queries, and admin moderation' },
  { modelName: ClientRequirement.name, schema: ClientRequirementSchema, purpose: 'buyer requirement lists and status/purpose matching queries' },
  { modelName: RequirementOffer.name, schema: RequirementOfferSchema, purpose: 'one offer per agent/requirement and agent offer lists' },
  { modelName: User.name, schema: UserSchema, purpose: 'unique normalized email authentication and agent/account-status filtering' },
  { modelName: Agency.name, schema: AgencySchema, purpose: 'unique normalized agency profile lookup' },
  { modelName: DevelopmentProject.name, schema: DevelopmentProjectSchema, purpose: 'unique project slug lookup and ordered published/featured project queries' },
  { modelName: MaintenanceRequest.name, schema: MaintenanceRequestSchema, purpose: 'unique maintenance reference, customer/technician job lists, and admin status/complaint filtering' },
  { modelName: TechnicianProfile.name, schema: TechnicianProfileSchema, purpose: 'one technician profile per user and active/available/category dispatch lookup' },
  { modelName: UserNotification.name, schema: UserNotificationSchema, purpose: 'per-user notification inbox ordering and event deduplication' },
  { modelName: PromoCampaign.name, schema: PromoCampaignSchema, purpose: 'serving active sponsored campaigns by placement and schedule, admin list ordering' },
  { modelName: PromoDailyStat.name, schema: PromoDailyStatSchema, purpose: 'one counter row per campaign/day/placement/device and date-range analytics' },
  { modelName: PromoEventDedup.name, schema: PromoEventDedupSchema, purpose: 'unique sponsored-event dedup keys with automatic expiry' },
  { modelName: PromoSettings.name, schema: PromoSettingsSchema, purpose: 'single sponsored placement settings document' },
];

function readArguments(args: string[]) {
  let confirmedDatabase: string | undefined;
  let allowRemote = false;
  let allowProduction = false;
  for (const arg of args) {
    if (arg.startsWith('--confirm-database=')) {
      confirmedDatabase = arg.slice('--confirm-database='.length);
    } else if (arg === '--allow-remote') {
      allowRemote = true;
    } else if (arg === '--allow-production') {
      allowProduction = true;
    } else {
      throw new SchemaIndexMigrationError(
        'Supported arguments are --confirm-database=<name>, --allow-remote, and --allow-production.',
      );
    }
  }
  return { confirmedDatabase, allowRemote, allowProduction };
}

export async function executeSchemaIndexMigration(
  env: NodeJS.ProcessEnv,
  args: string[],
): Promise<void> {
  const { confirmedDatabase, allowRemote, allowProduction } = readArguments(args);
  const target = resolveMigrationTarget(
    env.DB_MIGRATION_URI,
    confirmedDatabase,
    env.NODE_ENV,
    allowRemote,
    allowProduction,
  );
  const connection = await mongoose.createConnection(target.uri, {
    autoIndex: false,
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
    appName: 'EstateProExplicitIndexMigration',
  }).asPromise();

  try {
    const models = APPROVED_INDEX_SCHEMAS.map(({ modelName, schema, purpose }) => {
      if (!purpose || schema.indexes().length === 0) {
        throw new SchemaIndexMigrationError(
          `Schema '${modelName}' is missing an approved index justification or index definition.`,
        );
      }
      return connection.model(modelName, schema) as unknown as MigrationModel;
    });
    const result = await runSchemaIndexMigration(
      connection.db,
      models,
      SCHEMA_INDEX_MIGRATION_VERSION,
    );
    console.log(
      `Index migration ${result.version} completed for database '${target.databaseName}': ` +
      `${result.created} created, ${result.alreadyPresent} already present.`,
    );
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  executeSchemaIndexMigration(process.env, process.argv.slice(2)).catch((error: unknown) => {
    if (error instanceof SchemaIndexMigrationError) {
      console.error(`Index migration stopped: ${error.message}`);
    } else {
      const code =
        error && typeof error === 'object' && 'code' in error &&
        (typeof error.code === 'number' || typeof error.code === 'string')
          ? ` (database error ${error.code})`
          : '';
      console.error(
        `Index migration failed${code}. Connection details and database record values are not logged.`,
      );
    }
    process.exitCode = 1;
  });
}
