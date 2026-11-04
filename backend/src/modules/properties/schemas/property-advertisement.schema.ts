import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyAdvertisementDocument = PropertyAdvertisement & Document;

export enum PropertyAdvertisementStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  PAUSED = 'paused',
  ENDED = 'ended',
  REMOVED = 'removed',
}

@Schema({ timestamps: true })
export class PropertyAdvertisement {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  propertyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({
    type: String,
    enum: PropertyAdvertisementStatus,
    default: PropertyAdvertisementStatus.PENDING_REVIEW,
    index: true,
  })
  status: PropertyAdvertisementStatus;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  moderatedBy?: Types.ObjectId;

  @Prop()
  moderationNotes?: string;

  @Prop()
  pausedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: Date })
  publishedAt?: Date;
}

export const PropertyAdvertisementSchema =
  SchemaFactory.createForClass(PropertyAdvertisement);

PropertyAdvertisementSchema.index({ propertyId: 1 }, { unique: true });
PropertyAdvertisementSchema.index({ agentId: 1, status: 1, createdAt: -1 });
