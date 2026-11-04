import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PropertyAnalyticsDeduplicationDocument =
  PropertyAnalyticsDeduplication & Document;

@Schema({ collection: 'property_analytics_deduplication' })
export class PropertyAnalyticsDeduplication {
  @Prop({ required: true, select: false })
  key: string;

  @Prop({ required: true, type: Date })
  expiresAt: Date;
}

export const PropertyAnalyticsDeduplicationSchema =
  SchemaFactory.createForClass(PropertyAnalyticsDeduplication);

PropertyAnalyticsDeduplicationSchema.index({ key: 1 }, { unique: true });
PropertyAnalyticsDeduplicationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
