import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyAnalyticsEventDocument = PropertyAnalyticsEvent & Document;

export enum PropertyAnalyticsEventType {
  PROPERTY_VIEW = 'property_view',
  CALL_CLICK = 'call_click',
  WHATSAPP_CLICK = 'whatsapp_click',
}

@Schema({ timestamps: true })
export class PropertyAnalyticsEvent {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PropertyAdvertisement', required: true, index: true })
  advertisementId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({ type: String, enum: PropertyAnalyticsEventType, required: true })
  type: PropertyAnalyticsEventType;

  @Prop({ type: Date, required: true, default: Date.now })
  occurredAt: Date;

  @Prop({ type: String, required: true, select: false })
  visitorHash: string;

  @Prop({ type: String, select: false })
  dedupeKey?: string;
}

export const PropertyAnalyticsEventSchema =
  SchemaFactory.createForClass(PropertyAnalyticsEvent);

PropertyAnalyticsEventSchema.index({ agentId: 1, occurredAt: 1 });
PropertyAnalyticsEventSchema.index({ propertyId: 1, visitorHash: 1, type: 1, occurredAt: -1 });
PropertyAnalyticsEventSchema.index({ advertisementId: 1, occurredAt: 1 });
PropertyAnalyticsEventSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
