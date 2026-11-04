import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import {
  PropertyConversation,
  PropertyConversationSchema,
} from './schemas/property-conversation.schema';
import {
  PropertyMessage,
  PropertyMessageSchema,
} from './schemas/property-message.schema';
import { PropertyMessagingController } from './property-messaging.controller';
import { PropertyMessagingService } from './property-messaging.service';
import { Property, PropertySchema } from '../properties/schemas/property.schema';
import {
  PropertyAdvertisement,
  PropertyAdvertisementSchema,
} from '../properties/schemas/property-advertisement.schema';
import {
  BuyerNotification,
  BuyerNotificationSchema,
} from '../buyer/schemas/buyer-notification.schema';
import { BuyerProfile, BuyerProfileSchema } from '../buyer/schemas/buyer-profile.schema';
import {
  VisitorChatSession,
  VisitorChatSessionSchema,
} from './schemas/visitor-chat-session.schema';
import { AuthRateLimitService } from '../auth/auth-rate-limit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: PropertyConversation.name, schema: PropertyConversationSchema },
      { name: PropertyMessage.name, schema: PropertyMessageSchema },
      { name: Property.name, schema: PropertySchema },
      {
        name: PropertyAdvertisement.name,
        schema: PropertyAdvertisementSchema,
      },
      { name: BuyerNotification.name, schema: BuyerNotificationSchema },
      { name: BuyerProfile.name, schema: BuyerProfileSchema },
      { name: VisitorChatSession.name, schema: VisitorChatSessionSchema },
    ]),
  ],
  controllers: [CrmController, PropertyMessagingController],
  providers: [CrmService, PropertyMessagingService, AuthRateLimitService],
  exports: [CrmService, PropertyMessagingService, MongooseModule],
})
export class CrmModule {}
