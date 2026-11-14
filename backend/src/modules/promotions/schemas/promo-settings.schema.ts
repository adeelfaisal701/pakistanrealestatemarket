import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PROMO_PLACEMENTS } from '../promotion.constants';

export type PromoSettingsDocument = PromoSettings & Document;

/** Single settings document (key = "default"). */
@Schema({ collection: 'promo_settings', timestamps: true })
export class PromoSettings {
  @Prop({ required: true, default: 'default' })
  key: string;

  /** Show a sponsored slot after every N property cards. */
  @Prop({ type: Number, min: 3, max: 20, default: 6 })
  listingsInterval: number;

  /** Maximum sponsored slots per listings page. */
  @Prop({ type: Number, min: 0, max: 5, default: 2 })
  listingsMaxPerPage: number;

  /** Placements switched on site-wide. */
  @Prop({ type: [String], default: () => [...PROMO_PLACEMENTS] })
  enabledPlacements: string[];
}

export const PromoSettingsSchema = SchemaFactory.createForClass(PromoSettings);

PromoSettingsSchema.index({ key: 1 }, { unique: true });
