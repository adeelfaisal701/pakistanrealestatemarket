import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AreaUnit, PropertyType } from '../../properties/schemas/property.schema';

export type ClientRequirementDocument = ClientRequirement & Document;

export enum RequirementPurpose {
  BUY = 'buy',
  RENT = 'rent',
}

export enum ClientRequirementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PAUSED = 'paused',
  CLOSED = 'closed',
  SUSPENDED = 'suspended',
}

@Schema({ _id: false })
export class RequirementLocation {
  @Prop({ required: true, trim: true, maxlength: 100 })
  city: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  area: string;
}

@Schema({ timestamps: true })
export class ClientRequirement {
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true, select: false })
  buyerId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  description: string;

  @Prop({ type: String, enum: RequirementPurpose, required: true, index: true })
  purpose: RequirementPurpose;

  @Prop({ type: String, enum: PropertyType, required: true })
  propertyType: PropertyType;

  @Prop({ type: RequirementLocation, required: true })
  location: RequirementLocation;

  @Prop({ min: 0 })
  minBudget?: number;

  @Prop({ min: 0 })
  maxBudget?: number;

  @Prop({ min: 0 })
  minArea?: number;

  @Prop({ min: 0 })
  maxArea?: number;

  @Prop({ min: 0, max: 50 })
  bedrooms?: number;

  @Prop({ min: 0, max: 50 })
  bathrooms?: number;

  @Prop({ type: String, enum: AreaUnit })
  areaUnit?: AreaUnit;

  @Prop({ type: String, enum: ClientRequirementStatus, default: ClientRequirementStatus.DRAFT, index: true })
  status: ClientRequirementStatus;

  @Prop({ type: String, enum: ClientRequirementStatus, default: null })
  statusBeforeModeration?: ClientRequirementStatus | null;

  @Prop({ type: Types.ObjectId, ref: 'RequirementOffer', default: null })
  acceptedOfferId?: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], ref: 'User', select: false })
  offeredAgentIds?: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  moderatedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  moderatedAt?: Date | null;

  @Prop({ type: String, maxlength: 1000, default: null })
  moderationReason?: string | null;
}

export const ClientRequirementSchema =
  SchemaFactory.createForClass(ClientRequirement);

ClientRequirementSchema.index({ buyerId: 1, createdAt: -1 });
ClientRequirementSchema.index({ status: 1, purpose: 1, createdAt: -1 });
