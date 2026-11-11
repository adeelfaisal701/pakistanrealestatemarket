import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PropertiesModule } from '../properties/properties.module';
import { UsersModule } from '../users/users.module';
import { CrmModule } from '../crm/crm.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminActivity, AdminActivitySchema } from './schemas/admin-activity.schema';
import { UserReport, UserReportSchema } from './schemas/user-report.schema';
import { PublicReportsController } from './public-reports.controller';
import { AdminMutationRateLimitGuard } from './admin-mutation-rate-limit.guard';
import { SavedProperty, SavedPropertySchema } from '../buyer/schemas/saved-property.schema';
import {
  BuyerNotification,
  BuyerNotificationSchema,
} from '../buyer/schemas/buyer-notification.schema';
import { BuyerProfile, BuyerProfileSchema } from '../buyer/schemas/buyer-profile.schema';
import { SavedSearch, SavedSearchSchema } from '../buyer/schemas/saved-search.schema';
import { ClientRequirement, ClientRequirementSchema } from '../requirements/schemas/client-requirement.schema';
import { RequirementOffer, RequirementOfferSchema } from '../requirements/schemas/requirement-offer.schema';
import { PropertyMessage, PropertyMessageSchema } from '../crm/schemas/property-message.schema';
import { DevelopmentProject, DevelopmentProjectSchema } from '../projects/schemas/development-project.schema';
import { Agency, AgencySchema } from '../agencies/schemas/agency.schema';
import { PropertyImageStorageService } from '../properties/property-image-storage.service';

@Module({
  imports: [
    PropertiesModule,
    UsersModule,
    CrmModule,
    MongooseModule.forFeature([
      { name: AdminActivity.name, schema: AdminActivitySchema },
      { name: UserReport.name, schema: UserReportSchema },
      { name: SavedProperty.name, schema: SavedPropertySchema },
      { name: BuyerNotification.name, schema: BuyerNotificationSchema },
      { name: BuyerProfile.name, schema: BuyerProfileSchema },
      { name: SavedSearch.name, schema: SavedSearchSchema },
      { name: ClientRequirement.name, schema: ClientRequirementSchema },
      { name: RequirementOffer.name, schema: RequirementOfferSchema },
      { name: PropertyMessage.name, schema: PropertyMessageSchema },
      { name: DevelopmentProject.name, schema: DevelopmentProjectSchema },
      { name: Agency.name, schema: AgencySchema },
    ]),
  ],
  controllers: [AdminController, PublicReportsController],
  providers: [AdminService, AdminMutationRateLimitGuard, PropertyImageStorageService],
  exports: [AdminService],
})
export class AdminModule {}
