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
}

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, trim: true })
  clientName: string;

  @Prop({ required: true, trim: true })
  clientPhone: string;

  @Prop({ trim: true, default: null })
  clientEmail?: string;

  @Prop({ type: Types.ObjectId, ref: 'Property', default: null })
  propertyId?: Types.ObjectId;

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
