import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyConversationDocument = PropertyConversation & Document;

export enum PropertyConversationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class PropertyConversation {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'PropertyAdvertisement',
    required: true,
    index: true,
  })
  advertisementId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead', required: true, index: true })
  leadId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, select: false })
  buyerId?: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  visitorName: string;

  @Prop({ default: null, lowercase: true, trim: true })
  visitorEmail?: string;

  @Prop({ default: null, trim: true })
  visitorPhone?: string;

  @Prop({ required: true, select: false })
  visitorHash: string;

  @Prop({ type: String, enum: PropertyConversationStatus, default: PropertyConversationStatus.ACTIVE })
  status: PropertyConversationStatus;

  @Prop({ default: '' })
  latestMessagePreview: string;

  @Prop({ type: String, enum: ['visitor', 'buyer', 'agent'], default: null })
  latestMessageSender?: 'visitor' | 'buyer' | 'agent';

  @Prop({ type: Date, default: Date.now, index: true })
  lastMessageAt: Date;

  @Prop({ type: Number, default: 0 })
  unreadForAgent: number;

  @Prop({ type: Number, default: 0 })
  unreadForVisitor: number;
}

export const PropertyConversationSchema =
  SchemaFactory.createForClass(PropertyConversation);

PropertyConversationSchema.index(
  { propertyId: 1, visitorHash: 1 },
  { unique: true, name: 'unique_visitor_property_conversation' },
);
PropertyConversationSchema.index({ agentId: 1, lastMessageAt: -1 });
PropertyConversationSchema.index({ agentId: 1, unreadForAgent: 1, lastMessageAt: -1 });
PropertyConversationSchema.index({ buyerId: 1, lastMessageAt: -1 });
