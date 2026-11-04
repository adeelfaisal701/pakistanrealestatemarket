import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './schemas/property.schema';
import {
  PropertyAnalyticsEvent,
  PropertyAnalyticsEventSchema,
} from './schemas/property-analytics-event.schema';
import {
  PropertyAnalyticsDeduplication,
  PropertyAnalyticsDeduplicationSchema,
} from './schemas/property-analytics-deduplication.schema';
import {
  PropertyLocationShare,
  PropertyLocationShareSchema,
} from './schemas/property-location-share.schema';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { UsersModule } from '../users/users.module';
import { PropertyImageStorageService } from './property-image-storage.service';
import {
  PropertyAdvertisement,
  PropertyAdvertisementSchema,
} from './schemas/property-advertisement.schema';
import {
  BuyerNotification,
  BuyerNotificationSchema,
} from '../buyer/schemas/buyer-notification.schema';
import { BuyerProfile, BuyerProfileSchema } from '../buyer/schemas/buyer-profile.schema';
import { SavedSearch, SavedSearchSchema } from '../buyer/schemas/saved-search.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: PropertyAnalyticsEvent.name, schema: PropertyAnalyticsEventSchema },
      {
        name: PropertyAnalyticsDeduplication.name,
        schema: PropertyAnalyticsDeduplicationSchema,
      },
      {
        name: PropertyAdvertisement.name,
        schema: PropertyAdvertisementSchema,
      },
      {
        name: PropertyLocationShare.name,
        schema: PropertyLocationShareSchema,
      },
      { name: SavedSearch.name, schema: SavedSearchSchema },
      { name: BuyerNotification.name, schema: BuyerNotificationSchema },
      { name: BuyerProfile.name, schema: BuyerProfileSchema },
    ]),
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyImageStorageService],
  exports: [PropertiesService, MongooseModule],
})
export class PropertiesModule {}
