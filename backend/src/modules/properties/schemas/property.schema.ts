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
}

@Schema({ _id: false })
export class PropertyLocation {
  @Prop({ required: true, index: true })
  city: string;

  @Prop({ required: true, index: true })
  area: string;

  @Prop()
  address?: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;
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

  @Prop({ type: PropertyFeatures, default: () => ({}) })
  features: PropertyFeatures;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  agentId: Types.ObjectId;

  @Prop({ type: String, enum: PropertyStatus, default: PropertyStatus.PENDING_APPROVAL, index: true })
  status: PropertyStatus;

  @Prop({ default: false, index: true })
  isFeatured: boolean;

  @Prop({ default: 0 })
  viewsCount: number;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
