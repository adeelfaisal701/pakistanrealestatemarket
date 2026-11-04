import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequirementOfferDocument = RequirementOffer & Document;

export enum RequirementOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class RequirementOffer {
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'ClientRequirement', required: true, index: true })
  requirementId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  propertyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PropertyConversation', default: null })
  conversationId?: Types.ObjectId | null;

  @Prop({ trim: true, maxlength: 1500, default: '' })
  message: string;

  @Prop({ type: String, enum: RequirementOfferStatus, default: RequirementOfferStatus.PENDING, index: true })
  status: RequirementOfferStatus;

  @Prop({ type: Date, default: null })
  respondedAt?: Date | null;
}

export const RequirementOfferSchema =
  SchemaFactory.createForClass(RequirementOffer);

RequirementOfferSchema.index(
  { requirementId: 1, agentId: 1 },
  { unique: true, name: 'unique_agent_offer_per_requirement' },
);
RequirementOfferSchema.index({ agentId: 1, createdAt: -1 });
