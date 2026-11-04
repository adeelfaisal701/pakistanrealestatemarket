import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeadDocument = Lead & Document;

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  SITE_VISIT_SCHEDULED = 'site_visit_scheduled',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  LOST = 'lost',
}

export enum LeadSource {
  MARKETPLACE = 'marketplace',
  DIRECT_WHATSAPP = 'direct_whatsapp',
  PHONE_CALL = 'phone_call',
  REFERRAL = 'referral',
  WEBSITE_CHAT = 'website_chat',
}

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, trim: true })
  clientName: string;

  @Prop({ trim: true, default: '' })
  clientPhone: string;

  @Prop({ trim: true, default: null })
  clientEmail?: string;

  @Prop({ type: Types.ObjectId, ref: 'Property', default: null })
  propertyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PropertyAdvertisement', default: null })
  advertisementId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PropertyConversation', default: null })
  conversationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, select: false })
  buyerId?: Types.ObjectId;

  @Prop({ type: String, select: false })
  visitorHash?: string;

  @Prop({ default: null })
  propertyTitle?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({ type: String, enum: LeadStatus, default: LeadStatus.NEW, index: true })
  status: LeadStatus;

  @Prop({ type: String, enum: LeadSource, default: LeadSource.MARKETPLACE })
  source: LeadSource;

  @Prop({ default: null })
  budget?: number; // in PKR

  @Prop({ default: null })
  interestedCity?: string;

  @Prop({ default: null })
  notes?: string;

  @Prop({ default: null })
  lastContactedAt?: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

LeadSchema.index(
  { agentId: 1, propertyId: 1, visitorHash: 1 },
  {
    unique: true,
    partialFilterExpression: { visitorHash: { $type: 'string' } },
    name: 'unique_chat_lead_per_visitor_property',
  },
);
