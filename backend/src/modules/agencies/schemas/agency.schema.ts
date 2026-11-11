import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AgencyDocument = Agency & Document;

export enum AgencyAccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

@Schema({ timestamps: true })
export class Agency {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  normalizedName: string;

  @Prop({ type: String, maxlength: 2000 })
  description?: string;

  @Prop({ type: String, maxlength: 100 })
  agencyType?: string;

  @Prop({ type: String, maxlength: 500 })
  officeAddress?: string;

  @Prop({ type: String, maxlength: 100 })
  city?: string;

  @Prop({ type: String, maxlength: 32 })
  phone?: string;

  @Prop({ type: String, lowercase: true, maxlength: 254 })
  email?: string;

  @Prop({ type: String, maxlength: 2048 })
  website?: string;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: String })
  coverImageUrl?: string;

  @Prop({ type: [String], default: [] })
  galleryUrls: string[];

  @Prop({ type: String, enum: AgencyAccountStatus, default: AgencyAccountStatus.ACTIVE, index: true })
  status: AgencyAccountStatus;

  @Prop({ type: String, maxlength: 1000 })
  statusReason?: string;

  @Prop({ type: Date })
  statusChangedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  statusChangedBy?: Types.ObjectId;
}

export const AgencySchema = SchemaFactory.createForClass(Agency);
