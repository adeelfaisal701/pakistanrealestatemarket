import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyMessageDocument = PropertyMessage & Document;

export enum PropertyMessageSenderType {
  VISITOR = 'visitor',
  BUYER = 'buyer',
  AGENT = 'agent',
}

@Schema({ timestamps: true })
export class PropertyMessage {
  @Prop({
    type: Types.ObjectId,
    ref: 'PropertyConversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({ type: String, enum: PropertyMessageSenderType, required: true })
  senderType: PropertyMessageSenderType;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  senderId?: Types.ObjectId;

  @Prop({ required: true, trim: true, minlength: 1, maxlength: 2000 })
  content: string;

  @Prop({ type: Date, default: null })
  readAt?: Date;

  @Prop({ required: true, maxlength: 64 })
  idempotencyKey: string;
}

export const PropertyMessageSchema = SchemaFactory.createForClass(PropertyMessage);

PropertyMessageSchema.index(
  { conversationId: 1, idempotencyKey: 1 },
  { unique: true, name: 'unique_conversation_message_key' },
);
PropertyMessageSchema.index({ conversationId: 1, createdAt: -1 });
PropertyMessageSchema.index({ conversationId: 1, senderType: 1, readAt: 1 });
