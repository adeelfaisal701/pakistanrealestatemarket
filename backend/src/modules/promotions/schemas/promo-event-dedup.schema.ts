import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromoEventDedupDocument = PromoEventDedup & Document;

/** Short-lived keys that suppress duplicate / accidental event counts. */
@Schema({ collection: 'promo_event_dedup' })
export class PromoEventDedup {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true, type: Date })
  expiresAt: Date;
}

export const PromoEventDedupSchema = SchemaFactory.createForClass(PromoEventDedup);

PromoEventDedupSchema.index({ key: 1 }, { unique: true });
PromoEventDedupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
