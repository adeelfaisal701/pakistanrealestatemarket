import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MarketIndicatorDocument = MarketIndicator & Document;

/**
 * The last VERIFIED value of one ticker indicator. A failed refresh never
 * overwrites `value`; it only records the failure so the UI can mark the value
 * as possibly outdated.
 */
@Schema({ collection: 'market_indicators', timestamps: true })
export class MarketIndicator {
  @Prop({ required: true })
  key: string;

  @Prop({ type: Number, default: null })
  value: number | null;

  @Prop({ required: true })
  unit: string;

  /** When this value took effect (price revision date, or the source's own timestamp). */
  @Prop({ type: Date, default: null })
  effectiveAt: Date | null;

  /** When the source last confirmed this value (daily refresh, even if unchanged). */
  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastAttemptAt: Date | null;

  @Prop({ type: String, default: null })
  lastError: string | null;

  @Prop({ default: 0 })
  consecutiveFailures: number;

  /** A source rate-limit/backoff window; refreshes are skipped until then. */
  @Prop({ type: Date, default: null })
  retryAfter: Date | null;

  @Prop({ type: { name: String, url: String }, _id: false, default: null })
  source: { name: string; url: string } | null;

  /** Indicator-specific facts (previous revision, weather conditions, conversion inputs). */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details: Record<string, unknown>;
}

export const MarketIndicatorSchema = SchemaFactory.createForClass(MarketIndicator);

MarketIndicatorSchema.index({ key: 1 }, { unique: true });
