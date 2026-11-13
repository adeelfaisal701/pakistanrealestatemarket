import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserNotificationDocument = UserNotification & Document;

/**
 * Generic, role-agnostic in-app notification. Each record belongs to exactly
 * one user and can only be read or updated by that user.
 */
@Schema({ timestamps: true })
export class UserNotification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  type: string;

  @Prop({ required: true, maxlength: 160 })
  title: string;

  @Prop({ required: true, maxlength: 500 })
  message: string;

  /** Relative in-app path the notification links to. */
  @Prop({ type: String, maxlength: 300 })
  link?: string;

  @Prop({ type: String, maxlength: 60 })
  entityType?: string;

  @Prop({ type: String, maxlength: 60 })
  entityId?: string;

  @Prop({ required: true, maxlength: 240 })
  dedupeKey: string;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  occurredAt: Date;
}

export const UserNotificationSchema = SchemaFactory.createForClass(UserNotification);
UserNotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, name: 'unique_user_notification_event' },
);
UserNotificationSchema.index({ userId: 1, readAt: 1, occurredAt: -1 });
