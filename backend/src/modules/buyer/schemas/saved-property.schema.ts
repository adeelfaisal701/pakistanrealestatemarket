import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedPropertyDocument = SavedProperty & Document;

@Schema({ timestamps: true })
export class SavedProperty {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: Types.ObjectId;
}

export const SavedPropertySchema = SchemaFactory.createForClass(SavedProperty);
SavedPropertySchema.index(
  { buyerId: 1, propertyId: 1 },
  { unique: true, name: 'unique_buyer_saved_property' },
);
SavedPropertySchema.index({ buyerId: 1, createdAt: -1 });
