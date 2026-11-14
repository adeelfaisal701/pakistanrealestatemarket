import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  PromoCampaignStatus,
  PromoDevice,
  PromoMediaKind,
  PromoPackage,
  PromoPlacement,
} from '../promotion.constants';

export type PromoCampaignDocument = PromoCampaign & Document;

@Schema({ _id: false })
export class PromoMedia {
  @Prop({ type: String, enum: PromoMediaKind, required: true })
  kind: PromoMediaKind;

  @Prop({ required: true, maxlength: 2048 })
  url: string;

  /** Video poster image (optional). */
  @Prop({ maxlength: 2048 })
  posterUrl?: string;

  @Prop({ maxlength: 200, default: '' })
  alt: string;
}
export const PromoMediaSchema = SchemaFactory.createForClass(PromoMedia);

@Schema({ _id: false })
export class PromoTargeting {
  /** Empty = all cities. Stored lower-cased for matching. */
  @Prop({ type: [String], default: [] })
  cities: string[];

  /** Empty = all property types. */
  @Prop({ type: [String], default: [] })
  propertyTypes: string[];

  /** Empty = both sale and rent. */
  @Prop({ type: [String], default: [] })
  purposes: string[];
}
export const PromoTargetingSchema = SchemaFactory.createForClass(PromoTargeting);

@Schema({ timestamps: true, collection: 'promo_campaigns' })
export class PromoCampaign {
  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  companyName: string;

  @Prop({ maxlength: 2048 })
  logoUrl?: string;

  @Prop({ type: [PromoMediaSchema], default: [] })
  media: PromoMedia[];

  @Prop({ required: true, maxlength: 2048 })
  destinationUrl: string;

  @Prop({ trim: true, maxlength: 40, default: 'Learn more' })
  ctaText: string;

  @Prop({ trim: true, maxlength: 240, default: '' })
  description: string;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  /** Null = runs until paused or archived. */
  @Prop({ type: Date, default: null })
  endsAt?: Date | null;

  @Prop({ type: String, enum: PromoCampaignStatus, default: PromoCampaignStatus.DRAFT })
  status: PromoCampaignStatus;

  @Prop({ type: [String], enum: PromoDevice, default: [PromoDevice.MOBILE, PromoDevice.DESKTOP] })
  devices: PromoDevice[];

  @Prop({ type: [String], enum: PromoPlacement, default: [] })
  placements: PromoPlacement[];

  @Prop({ type: PromoTargetingSchema, default: () => ({}) })
  targeting: PromoTargeting;

  /** Higher shows first. */
  @Prop({ type: Number, min: 0, max: 100, default: 50 })
  priority: number;

  /** Tie-breaker within the same priority (lower first). */
  @Prop({ type: Number, min: 0, max: 9999, default: 0 })
  displayOrder: number;

  /** Carousel advances after this many seconds of video (0 = play to the end). */
  @Prop({ type: Number, min: 0, max: 300, default: 0 })
  videoMaxSeconds: number;

  /** Future paid package reference (informational only for now). */
  @Prop({ type: String, enum: PromoPackage, default: null })
  package?: PromoPackage | null;

  /** Reserved for future advertiser accounts. */
  @Prop({ type: Types.ObjectId, default: null })
  advertiserId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const PromoCampaignSchema = SchemaFactory.createForClass(PromoCampaign);

// Serving: active campaigns for a placement within their schedule.
PromoCampaignSchema.index({ status: 1, placements: 1, startsAt: 1, endsAt: 1 });
// Admin list ordering.
PromoCampaignSchema.index({ updatedAt: -1 });
