import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromoDailyStatDocument = PromoDailyStat & Document;

/**
 * Pre-aggregated campaign counters per day × placement × device. Raw events
 * are not stored (no personal data, bounded growth, fast reports).
 */
@Schema({ collection: 'promo_daily_stats', timestamps: false })
export class PromoDailyStat {
  @Prop({ type: Types.ObjectId, required: true })
  campaignId: Types.ObjectId;

  /** UTC day, YYYY-MM-DD. */
  @Prop({ required: true })
  day: string;

  @Prop({ required: true })
  placement: string;

  @Prop({ required: true })
  device: string;

  @Prop({ type: Number, default: 0 })
  impressions: number;

  @Prop({ type: Number, default: 0 })
  uniqueImpressions: number;

  @Prop({ type: Number, default: 0 })
  clicks: number;

  @Prop({ type: Number, default: 0 })
  videoViews: number;

  @Prop({ type: Number, default: 0 })
  videoCompletions: number;
}

export const PromoDailyStatSchema = SchemaFactory.createForClass(PromoDailyStat);

PromoDailyStatSchema.index({ campaignId: 1, day: 1, placement: 1, device: 1 }, { unique: true });
PromoDailyStatSchema.index({ day: 1 });
