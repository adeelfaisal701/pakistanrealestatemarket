import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedSearchDocument = SavedSearch & Document;

export enum SavedSearchFrequency {
  INSTANT = 'instant',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  OFF = 'off',
}

@Schema({ _id: false })
export class SavedSearchFilters {
  @Prop() city?: string;
  @Prop() area?: string;
  @Prop() purpose?: string;
  @Prop() propertyType?: string;
  @Prop() minPrice?: number;
  @Prop() maxPrice?: number;
  @Prop() minArea?: number;
  @Prop() maxArea?: number;
  @Prop() areaUnit?: string;
  @Prop() bedrooms?: number;
}

@Schema({ timestamps: true })
export class SavedSearch {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ type: Object, default: () => ({}) })
  filters: Record<string, string>;

  @Prop({
    type: String,
    enum: SavedSearchFrequency,
    default: SavedSearchFrequency.OFF,
  })
  frequency: SavedSearchFrequency;

  @Prop({ type: Boolean, default: true })
  alertsEnabled: boolean;

  @Prop({ type: Date, default: null })
  lastAlertAt?: Date | null;
}

export const SavedSearchSchema = SchemaFactory.createForClass(SavedSearch);
SavedSearchSchema.index({ buyerId: 1, createdAt: -1 });
