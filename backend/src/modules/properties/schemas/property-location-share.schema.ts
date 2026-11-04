import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyLocationShareDocument = PropertyLocationShare & Document;

@Schema({ timestamps: true, collection: 'property_location_shares' })
export class PropertyLocationShare {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  advertisementPublishedAt: Date;

  @Prop({ required: true, unique: true, select: false })
  tokenHash: string;

  @Prop({ required: true, type: Date, index: { expires: 0 } })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PropertyLocationShareSchema =
  SchemaFactory.createForClass(PropertyLocationShare);

PropertyLocationShareSchema.index({ propertyId: 1, createdAt: -1 });
