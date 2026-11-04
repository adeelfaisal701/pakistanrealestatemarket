import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VisitorChatSessionDocument = VisitorChatSession & Document;

@Schema({ timestamps: true })
export class VisitorChatSession {
  @Prop({ type: String, required: true, unique: true, select: false })
  tokenHash: string;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const VisitorChatSessionSchema =
  SchemaFactory.createForClass(VisitorChatSession);

VisitorChatSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'visitor_chat_session_expiry' },
);
