import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AgencyDocument = Agency & Document;

@Schema({ timestamps: true })
export class Agency {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  normalizedName: string;

  @Prop({ type: String, maxlength: 2000 })
  description?: string;

  @Prop({ type: String, maxlength: 100 })
  agencyType?: string;

  @Prop({ type: String, maxlength: 500 })
  officeAddress?: string;

  @Prop({ type: String, maxlength: 100 })
  city?: string;

  @Prop({ type: String, maxlength: 32 })
  phone?: string;

  @Prop({ type: String, lowercase: true, maxlength: 254 })
  email?: string;

  @Prop({ type: String, maxlength: 2048 })
  website?: string;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: String })
  coverImageUrl?: string;

  @Prop({ type: [String], default: [] })
  galleryUrls: string[];
}

export const AgencySchema = SchemaFactory.createForClass(Agency);
