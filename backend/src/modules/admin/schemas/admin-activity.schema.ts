import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminActivityDocument = AdminActivity & Document;

@Schema({ timestamps: true })
export class AdminActivity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  adminId: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  actionType: string;

  @Prop({ required: true, trim: true, index: true })
  entityType: string;

  @Prop({ required: true, trim: true, index: true })
  entityId: string;

  @Prop()
  previousStatus?: string;

  @Prop()
  newStatus?: string;

  @Prop({ maxlength: 1000 })
  reason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now, index: true })
  occurredAt: Date;
}

export const AdminActivitySchema =
  SchemaFactory.createForClass(AdminActivity);

AdminActivitySchema.index({ occurredAt: -1, _id: -1 });
