import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module';
import { PropertiesModule } from '../properties/properties.module';
import { UsersModule } from '../users/users.module';
import { BuyerController } from './buyer.controller';
import { BuyerService } from './buyer.service';
import {
  ClientRequirement,
  ClientRequirementSchema,
} from '../requirements/schemas/client-requirement.schema';
import {
  RequirementOffer,
  RequirementOfferSchema,
} from '../requirements/schemas/requirement-offer.schema';
import {
  BuyerNotification,
  BuyerNotificationSchema,
} from './schemas/buyer-notification.schema';
import { BuyerProfile, BuyerProfileSchema } from './schemas/buyer-profile.schema';
import { SavedProperty, SavedPropertySchema } from './schemas/saved-property.schema';
import { SavedSearch, SavedSearchSchema } from './schemas/saved-search.schema';

@Module({
  imports: [
    UsersModule,
    PropertiesModule,
    CrmModule,
    MongooseModule.forFeature([
      { name: SavedProperty.name, schema: SavedPropertySchema },
      { name: SavedSearch.name, schema: SavedSearchSchema },
      { name: BuyerNotification.name, schema: BuyerNotificationSchema },
      { name: BuyerProfile.name, schema: BuyerProfileSchema },
      { name: ClientRequirement.name, schema: ClientRequirementSchema },
      { name: RequirementOffer.name, schema: RequirementOfferSchema },
    ]),
  ],
  controllers: [BuyerController],
  providers: [BuyerService],
  exports: [BuyerService],
})
export class BuyerModule {}
