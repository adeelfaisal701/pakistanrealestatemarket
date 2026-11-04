import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BuyerNotificationDocument = BuyerNotification & Document;

export enum BuyerNotificationType {
  SAVED_SEARCH_MATCH = 'saved_search_match',
  PROPERTY_PUBLISHED = 'property_published',
  PRICE_CHANGED = 'price_changed',
  AVAILABILITY_CHANGED = 'availability_changed',
  CONVERSATION_MESSAGE = 'conversation_message',
  REQUIREMENT_OFFER = 'requirement_offer',
}

@Schema({ timestamps: true })
export class BuyerNotification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ type: String, enum: BuyerNotificationType, required: true })
  type: BuyerNotificationType;

  @Prop({ required: true, maxlength: 160 })
  title: string;

  @Prop({ required: true, maxlength: 500 })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Property', default: null })
  propertyId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'SavedSearch', default: null })
  savedSearchId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'PropertyConversation', default: null })
  conversationId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'ClientRequirement', default: null })
  requirementId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'RequirementOffer', default: null })
  offerId?: Types.ObjectId | null;

  @Prop({ required: true, maxlength: 240 })
  dedupeKey: string;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  occurredAt: Date;
}

export const BuyerNotificationSchema =
  SchemaFactory.createForClass(BuyerNotification);
BuyerNotificationSchema.index(
  { buyerId: 1, dedupeKey: 1 },
  { unique: true, name: 'unique_buyer_notification_event' },
);
BuyerNotificationSchema.index({ buyerId: 1, readAt: 1, occurredAt: -1 });
