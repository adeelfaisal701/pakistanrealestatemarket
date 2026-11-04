import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyDocument = Property & Document;

export enum PropertyType {
  HOUSE = 'House',
  FLAT = 'Flat',
  UPPER_PORTION = 'Upper Portion',
  LOWER_PORTION = 'Lower Portion',
  PLOT = 'Plot',
  COMMERCIAL = 'Commercial',
}

export enum PropertyPurpose {
  SALE = 'Sale',
  RENT = 'Rent',
}

export enum AreaUnit {
  MARLA = 'Marla',
  KANAL = 'Kanal',
  SQFT = 'SqFt',
  SQYD = 'SqYd',
}

export enum PropertyStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  PUBLISHED = 'published',
  SOLD = 'sold',
  REJECTED = 'rejected',
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  RENTED = 'rented',
  UNAVAILABLE = 'unavailable',
  REMOVED = 'removed',
}

@Schema({ _id: false })
export class PropertyLocation {
  @Prop({ required: true, index: true })
  city: string;

  @Prop({ required: true, index: true })
  area: string;

  @Prop({ select: false })
  address?: string;

  @Prop({ select: false })
  latitude?: number;

  @Prop({ select: false })
  longitude?: number;
}

@Schema({ _id: false })
export class PrivatePropertyLocation {
  @Prop({ required: true, select: false })
  encryptedData: string;
}

@Schema({ _id: false })
export class PropertyFeatures {
  @Prop({ default: 0 })
  bedrooms: number;

  @Prop({ default: 0 })
  bathrooms: number;

  @Prop({ default: false })
  servantQuarter: boolean;

  @Prop({ default: 0 })
  parkingSpaces: number;

  @Prop({ default: false })
  furnished: boolean;

  @Prop({ default: true })
  electricityMeter: boolean;

  @Prop({ default: true })
  gasConnection: boolean;

  @Prop({ default: true })
  waterSupply: boolean;

  @Prop({ type: Object })
  rooms?: Record<string, number>;

  @Prop({ type: Object })
  outdoor?: Record<string, number>;

  @Prop({ type: [String] })
  interior?: string[];

  @Prop({ type: String })
  furnishing?: string;

  @Prop({ type: [String] })
  community?: string[];

  @Prop({ type: [String] })
  nearby?: string[];
}

@Schema({ _id: false })
export class PropertyImageMetadata {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ required: true })
  size: number;

  @Prop()
  checksum?: string;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ required: true, default: false })
  isCover: boolean;

  @Prop({ required: true, default: Date.now })
  uploadedAt: Date;
}

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: PropertyPurpose, required: true, index: true })
  purpose: PropertyPurpose;

  @Prop({ type: String, enum: PropertyType, required: true, index: true })
  propertyType: PropertyType;

  @Prop({ required: true, index: true })
  price: number; // in PKR

  @Prop({ required: true })
  areaSize: number;

  @Prop({ type: String, enum: AreaUnit, required: true })
  areaUnit: AreaUnit;

  @Prop({ type: PropertyLocation, required: true })
  location: PropertyLocation;

  @Prop({ type: PrivatePropertyLocation, select: false })
  privateLocation?: PrivatePropertyLocation;

  @Prop({ type: PropertyFeatures, default: () => ({}) })
  features: PropertyFeatures;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [PropertyImageMetadata], default: [] })
  imageMetadata?: PropertyImageMetadata[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({ type: String, enum: PropertyStatus, default: PropertyStatus.PENDING_APPROVAL, index: true })
  status: PropertyStatus;

  @Prop({ type: String, enum: ['available', 'sold', 'rented', 'reserved', 'unavailable'], default: 'available', index: true })
  inventoryStatus: string;

  @Prop({ default: false, index: true })
  isFeatured: boolean;

  @Prop({ default: 0 })
  viewsCount: number;

  // Moderation audit trail. Hidden from queries by default (select: false) so
  // internal notes/admin ids never leak through public endpoints; owner/admin
  // queries opt in with .select('+moderationNotes +moderatedBy').
  @Prop({ type: String, select: false })
  moderationNotes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', select: false })
  moderatedBy?: Types.ObjectId;

  @Prop({ type: Date })
  moderatedAt?: Date;

  @Prop({ default: false, index: true })
  adminHidden: boolean;

  @Prop({ default: false, index: true })
  adminRemoved: boolean;

  @Prop({ default: false, index: true })
  adminFlagged: boolean;

  @Prop({ default: false })
  agentArchived: boolean;

  @Prop({ type: Date })
  agentArchivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  agentArchivedBy?: Types.ObjectId;

  @Prop({ type: String, select: false })
  adminModerationReason?: string;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
