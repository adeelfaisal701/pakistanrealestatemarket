import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketIndicatorHistoryDocument = MarketIndicatorHistory & Document;

/**
 * Historical values. Administered prices (fuel) get one row per revision
 * (`rev:YYYY-MM-DD`); market rates get one row per Pakistan calendar day
 * (`day:YYYY-MM-DD`) holding that day's latest verified value.
 */
@Schema({ collection: 'market_indicator_history' })
export class MarketIndicatorHistory {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  periodKey: string;

  @Prop({ required: true, type: Number })
  value: number;

  @Prop({ type: Date, default: null })
  effectiveAt: Date | null;

  @Prop({ required: true, type: Date })
  recordedAt: Date;

  @Prop({ type: { name: String, url: String }, _id: false, default: null })
  source: { name: string; url: string } | null;

  @Prop({ required: true, type: Date })
  expiresAt: Date;
}

export const MarketIndicatorHistorySchema = SchemaFactory.createForClass(MarketIndicatorHistory);

MarketIndicatorHistorySchema.index({ key: 1, periodKey: 1 }, { unique: true });
MarketIndicatorHistorySchema.index({ key: 1, recordedAt: -1 });
MarketIndicatorHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
