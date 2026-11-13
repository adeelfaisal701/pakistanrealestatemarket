import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  MAINTENANCE_CATEGORY_KEYS,
  TechnicianAvailability,
} from '../maintenance.constants';

export type TechnicianProfileDocument = TechnicianProfile & Document;

/**
 * Operational profile for a technician user account (role = technician).
 * Technicians are never exposed through public APIs; only admins and the
 * technician themself can read this record.
 */
@Schema({ timestamps: true })
export class TechnicianProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], enum: MAINTENANCE_CATEGORY_KEYS, default: [] })
  categories: string[];

  @Prop({ type: [String], default: [] })
  skills: string[];

  /** Lower-cased area/locality names the technician covers. */
  @Prop({ type: [String], default: [] })
  serviceAreas: string[];

  @Prop({ trim: true, maxlength: 100, default: 'Lahore' })
  city: string;

  @Prop({
    type: String,
    enum: TechnicianAvailability,
    default: TechnicianAvailability.AVAILABLE,
  })
  availability: TechnicianAvailability;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, maxlength: 1000 })
  statusReason?: string;

  /** Internal admin-only notes. */
  @Prop({ type: String, maxlength: 2000 })
  internalNotes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const TechnicianProfileSchema = SchemaFactory.createForClass(TechnicianProfile);
TechnicianProfileSchema.index(
  { userId: 1 },
  { unique: true, name: 'unique_technician_profile_user' },
);
TechnicianProfileSchema.index(
  { isActive: 1, availability: 1, categories: 1 },
  { name: 'technician_dispatch_lookup' },
);
