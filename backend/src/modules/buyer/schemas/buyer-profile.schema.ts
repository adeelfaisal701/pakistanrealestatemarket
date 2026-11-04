import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BuyerProfileDocument = BuyerProfile & Document;

@Schema({ _id: false })
export class BuyerProfileNotifications {
  @Prop({ type: Boolean, default: true })
  inApp: boolean;

  @Prop({ type: Boolean, default: false })
  email: boolean;
}

@Schema({ _id: false })
export class BuyerPreferenceSet {
  @Prop({ type: String, maxlength: 100 })
  preferredCity?: string;

  @Prop({ type: [String], default: [] })
  preferredLocations: string[];

  @Prop({ type: Number, min: 0 })
  budgetMin?: number;

  @Prop({ type: Number, min: 0 })
  budgetMax?: number;

  @Prop({ type: [String], default: [] })
  propertyTypes: string[];

  @Prop({ type: [String], default: [] })
  purposes: string[];

  @Prop({ type: BuyerProfileNotifications, default: () => ({}) })
  notifications: BuyerProfileNotifications;
}

@Schema({ timestamps: true })
export class BuyerProfile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  buyerId: Types.ObjectId;

  @Prop({ type: BuyerPreferenceSet, default: () => ({}) })
  preferences: BuyerPreferenceSet;

}

export const BuyerProfileSchema = SchemaFactory.createForClass(BuyerProfile);
