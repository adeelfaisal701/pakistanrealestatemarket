import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module';
import {
  BuyerNotification,
  BuyerNotificationSchema,
} from '../buyer/schemas/buyer-notification.schema';
import {
  AdminActivity,
  AdminActivitySchema,
} from '../admin/schemas/admin-activity.schema';
import {
  Property,
  PropertySchema,
} from '../properties/schemas/property.schema';
import {
  PropertyAdvertisement,
  PropertyAdvertisementSchema,
} from '../properties/schemas/property-advertisement.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminMutationRateLimitGuard } from '../admin/admin-mutation-rate-limit.guard';
import { AdminRequirementsController } from './admin-requirements.controller';
import { AgentRequirementsController } from './agent-requirements.controller';
import { BuyerRequirementsController } from './buyer-requirements.controller';
import {
  ClientRequirement,
  ClientRequirementSchema,
} from './schemas/client-requirement.schema';
import {
  RequirementOffer,
  RequirementOfferSchema,
} from './schemas/requirement-offer.schema';
import { RequirementsService } from './requirements.service';
import { VerifiedAgentGuard } from './verified-agent.guard';

@Module({
  imports: [
    CrmModule,
    MongooseModule.forFeature([
      { name: ClientRequirement.name, schema: ClientRequirementSchema },
      { name: RequirementOffer.name, schema: RequirementOfferSchema },
      { name: User.name, schema: UserSchema },
      { name: Property.name, schema: PropertySchema },
      {
        name: PropertyAdvertisement.name,
        schema: PropertyAdvertisementSchema,
      },
      { name: BuyerNotification.name, schema: BuyerNotificationSchema },
      { name: AdminActivity.name, schema: AdminActivitySchema },
    ]),
  ],
  controllers: [
    BuyerRequirementsController,
    AgentRequirementsController,
    AdminRequirementsController,
  ],
  providers: [
    RequirementsService,
    VerifiedAgentGuard,
    AdminMutationRateLimitGuard,
  ],
})
export class RequirementsModule {}
