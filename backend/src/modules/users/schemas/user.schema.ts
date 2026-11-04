import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  BUYER = 'buyer',
  AGENT = 'agent',
  ADMIN = 'admin',
}

export enum UserAccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum AgentVerificationStatus {
  PENDING = 'pending_verification',
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.BUYER })
  role: UserRole;

  @Prop({ default: null })
  agencyName?: string;

  @Prop({ default: null })
  city?: string;

  @Prop({ default: null })
  avatarUrl?: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({
    type: String,
    enum: AgentVerificationStatus,
    default: AgentVerificationStatus.PENDING,
    index: true,
  })
  verificationStatus: AgentVerificationStatus;

  @Prop({ type: String, maxlength: 1000 })
  verificationNotes?: string;

  @Prop({ type: Date })
  verificationChangedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verificationChangedBy?: Types.ObjectId;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: 'ObjectId', ref: 'User' })
  verifiedBy?: Types.ObjectId;

  @Prop({
    type: String,
    enum: UserAccountStatus,
    default: UserAccountStatus.ACTIVE,
    index: true,
  })
  accountStatus: UserAccountStatus;

  @Prop({ type: String, maxlength: 1000 })
  accountStatusReason?: string;

  @Prop({ type: Date })
  accountStatusChangedAt?: Date;

  @Prop({ type: 'ObjectId', ref: 'User' })
  accountStatusChangedBy?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
