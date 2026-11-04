import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserReportDocument = UserReport & Document;

export enum UserReportCategory {
  FAKE_PROPERTY = 'fake_property',
  INCORRECT_PRICE = 'incorrect_price',
  FRAUDULENT_AGENT = 'fraudulent_agent',
  SOLD_OR_RENTED = 'sold_or_rented',
  MISLEADING_PHOTOS = 'misleading_photos',
  DUPLICATE_ADVERTISEMENT = 'duplicate_advertisement',
  SUSPICIOUS_BEHAVIOR = 'suspicious_behavior',
  OTHER = 'other',
}

export enum UserReportStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum UserReportTargetType {
  PROPERTY = 'property',
  ADVERTISEMENT = 'advertisement',
  AGENT = 'agent',
}

@Schema({ timestamps: true })
export class UserReport {
  @Prop({ type: String, enum: UserReportTargetType, required: true, index: true })
  targetType: UserReportTargetType;

  @Prop({ required: true, trim: true, index: true })
  targetId: string;

  @Prop({ type: String, enum: UserReportCategory, required: true, index: true })
  category: UserReportCategory;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  details: string;

  @Prop({ trim: true, maxlength: 120 })
  reporterName?: string;

  @Prop({ trim: true, lowercase: true, maxlength: 254 })
  reporterEmail?: string;

  @Prop({ trim: true, maxlength: 40 })
  reporterPhone?: string;

  @Prop({ type: String, enum: UserReportStatus, default: UserReportStatus.OPEN, index: true })
  status: UserReportStatus;

  @Prop({ type: String, maxlength: 5000, select: false })
  internalNotes?: string;

  @Prop({ type: String, maxlength: 1000 })
  resolutionDetails?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: String, select: false })
  sourceHash?: string;
}

export const UserReportSchema = SchemaFactory.createForClass(UserReport);

UserReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
UserReportSchema.index({ status: 1, createdAt: -1 });
UserReportSchema.index({ sourceHash: 1, createdAt: -1 });
