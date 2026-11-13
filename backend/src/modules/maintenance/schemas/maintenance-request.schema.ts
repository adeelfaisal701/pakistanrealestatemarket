import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AssignmentStatus,
  ComplaintStatus,
  MAINTENANCE_CATEGORY_KEYS,
  MAINTENANCE_PROPERTY_TYPES,
  MAINTENANCE_TIME_SLOTS,
  MaintenanceStatus,
  PAYMENT_METHODS,
  PaymentStatus,
  QuotationStatus,
} from '../maintenance.constants';

export type MaintenanceRequestDocument = MaintenanceRequest & Document;

@Schema({ _id: false })
export class MaintenanceAddress {
  @Prop({ required: true, trim: true, maxlength: 300 })
  line: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  area: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  city: string;
}
const MaintenanceAddressSchema = SchemaFactory.createForClass(MaintenanceAddress);

@Schema({ _id: false })
export class MaintenanceContact {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 20 })
  phone: string;

  @Prop({ trim: true, maxlength: 254 })
  email?: string;
}
const MaintenanceContactSchema = SchemaFactory.createForClass(MaintenanceContact);

@Schema({ _id: true, timestamps: false })
export class MaintenanceImage {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: String, enum: ['problem', 'before', 'after'], required: true })
  kind: 'problem' | 'before' | 'after';

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  uploadedAt: Date;
}
const MaintenanceImageSchema = SchemaFactory.createForClass(MaintenanceImage);

@Schema({ _id: true })
export class MaintenanceAssignment {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  technicianId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  assignedAt: Date;

  @Prop({ type: Date })
  scheduledVisitAt?: Date;

  /** Internal admin note — never returned to customers. */
  @Prop({ type: String, maxlength: 1000 })
  notes?: string;

  @Prop({ type: String, enum: AssignmentStatus, default: AssignmentStatus.PENDING })
  status: AssignmentStatus;

  @Prop({ type: Date })
  respondedAt?: Date;

  @Prop({ type: String, maxlength: 1000 })
  rejectionReason?: string;

  @Prop({ type: String, maxlength: 1000 })
  withdrawnReason?: string;
}
const MaintenanceAssignmentSchema = SchemaFactory.createForClass(MaintenanceAssignment);

@Schema({ _id: false })
export class QuotationLine {
  @Prop({ required: true, trim: true, maxlength: 120 })
  label: string;

  @Prop({ required: true, min: 0 })
  amount: number;
}
const QuotationLineSchema = SchemaFactory.createForClass(QuotationLine);

@Schema({ _id: false })
export class MaintenanceQuotation {
  @Prop({ default: 0, min: 0 })
  inspectionCharge: number;

  @Prop({ default: 0, min: 0 })
  laborCharge: number;

  @Prop({ default: 0, min: 0 })
  materialCharge: number;

  @Prop({ type: [QuotationLineSchema], default: [] })
  additionalCharges: QuotationLine[];

  @Prop({ default: 0, min: 0 })
  total: number;

  @Prop({ default: 'PKR' })
  currency: string;

  @Prop({ type: String, maxlength: 1000 })
  notes?: string;

  @Prop({ type: String, enum: QuotationStatus, default: QuotationStatus.DRAFT })
  status: QuotationStatus;

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  preparedBy?: Types.ObjectId;

  @Prop({ type: Date })
  updatedAt?: Date;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  respondedAt?: Date;

  @Prop({ type: String, maxlength: 1000 })
  customerNote?: string;
}
const MaintenanceQuotationSchema = SchemaFactory.createForClass(MaintenanceQuotation);

@Schema({ _id: true })
export class PaymentTransaction {
  _id?: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ type: String, enum: PAYMENT_METHODS, required: true })
  method: string;

  @Prop({ type: String, maxlength: 120 })
  reference?: string;

  @Prop({ type: String, maxlength: 500 })
  note?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  recordedAt: Date;
}
const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);

@Schema({ _id: true })
export class MaintenanceWorkNote {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: String, enum: ['technician', 'admin'], required: true })
  authorRole: 'technician' | 'admin';

  @Prop({ required: true, maxlength: 2000 })
  note: string;

  /** Internal admin notes are hidden from customers and technicians. */
  @Prop({ default: false })
  internal: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}
const MaintenanceWorkNoteSchema = SchemaFactory.createForClass(MaintenanceWorkNote);

@Schema({ _id: false })
export class ChecklistItem {
  @Prop({ required: true, maxlength: 160 })
  label: string;

  @Prop({ required: true })
  done: boolean;
}
const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

@Schema({ _id: false })
export class CompletionReport {
  @Prop({ type: [ChecklistItemSchema], default: [] })
  checklist: ChecklistItem[];

  @Prop({ type: String, maxlength: 2000 })
  summary?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  submittedBy?: Types.ObjectId;

  @Prop({ type: Date })
  submittedAt?: Date;
}
const CompletionReportSchema = SchemaFactory.createForClass(CompletionReport);

@Schema({ _id: true })
export class MaintenanceTimelineEvent {
  _id?: Types.ObjectId;

  @Prop({ required: true, maxlength: 80 })
  event: string;

  @Prop({ type: String })
  fromStatus?: string;

  @Prop({ type: String })
  toStatus?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ type: String, enum: ['customer', 'technician', 'admin', 'system'], required: true })
  actorRole: string;

  @Prop({ type: String, maxlength: 1000 })
  note?: string;

  /** Internal events (assignment notes, rejections) are hidden from customers. */
  @Prop({ default: false })
  internal: boolean;

  @Prop({ type: Date, default: Date.now })
  at: Date;
}
const MaintenanceTimelineEventSchema = SchemaFactory.createForClass(MaintenanceTimelineEvent);

@Schema({ _id: false })
export class MaintenanceFeedback {
  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, maxlength: 1500 })
  comment?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  technicianId?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}
const MaintenanceFeedbackSchema = SchemaFactory.createForClass(MaintenanceFeedback);

@Schema({ _id: true })
export class MaintenanceComplaint {
  _id?: Types.ObjectId;

  @Prop({ required: true, maxlength: 160 })
  subject: string;

  @Prop({ required: true, maxlength: 2000 })
  description: string;

  @Prop({ type: String, enum: ComplaintStatus, default: ComplaintStatus.OPEN })
  status: ComplaintStatus;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: String, maxlength: 1500 })
  resolutionNote?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  resolvedAt?: Date;
}
const MaintenanceComplaintSchema = SchemaFactory.createForClass(MaintenanceComplaint);

/**
 * A customer maintenance request and its full managed-dispatch lifecycle.
 * Assignment history, quotation, job updates, feedback and complaints are
 * embedded because they are always read and written with their request and
 * are naturally bounded in size.
 */
@Schema({ timestamps: true })
export class MaintenanceRequest {
  @Prop({ required: true, trim: true })
  reference: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: MaintenanceContactSchema, required: true })
  contact: MaintenanceContact;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 3000 })
  description: string;

  @Prop({ type: String, enum: MAINTENANCE_CATEGORY_KEYS, required: true })
  category: string;

  @Prop({ type: String, enum: MAINTENANCE_PROPERTY_TYPES, required: true })
  propertyType: string;

  @Prop({ type: MaintenanceAddressSchema, required: true })
  address: MaintenanceAddress;

  @Prop({ type: Date })
  preferredVisitDate?: Date;

  @Prop({ type: String, enum: MAINTENANCE_TIME_SLOTS, default: 'anytime' })
  preferredTimeSlot: string;

  @Prop({ type: [MaintenanceImageSchema], default: [] })
  images: MaintenanceImage[];

  @Prop({ type: String, enum: MaintenanceStatus, default: MaintenanceStatus.PENDING })
  status: MaintenanceStatus;

  /** Currently responsible technician (null when unassigned). */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  technicianId?: Types.ObjectId | null;

  @Prop({ type: Date })
  scheduledVisitAt?: Date;

  @Prop({ type: [MaintenanceAssignmentSchema], default: [] })
  assignments: MaintenanceAssignment[];

  @Prop({ type: MaintenanceQuotationSchema, default: null })
  quotation?: MaintenanceQuotation | null;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Prop({ type: [PaymentTransactionSchema], default: [] })
  payments: PaymentTransaction[];

  @Prop({ type: [MaintenanceWorkNoteSchema], default: [] })
  workNotes: MaintenanceWorkNote[];

  @Prop({ type: CompletionReportSchema, default: null })
  completionReport?: CompletionReport | null;

  @Prop({ type: [MaintenanceTimelineEventSchema], default: [] })
  timeline: MaintenanceTimelineEvent[];

  @Prop({ type: MaintenanceFeedbackSchema, default: null })
  feedback?: MaintenanceFeedback | null;

  @Prop({ type: [MaintenanceComplaintSchema], default: [] })
  complaints: MaintenanceComplaint[];

  @Prop({ default: false })
  hasOpenComplaint: boolean;

  @Prop({ type: String, maxlength: 1000 })
  cancellationReason?: string;

  @Prop({ type: Date })
  completedAt?: Date;

  /**
   * Optimistic-concurrency counter. Every workflow mutation is conditioned on
   * the revision it read, so concurrent admin/technician/customer actions can
   * never silently overwrite each other.
   */
  @Prop({ default: 0 })
  revision: number;
}

export const MaintenanceRequestSchema = SchemaFactory.createForClass(MaintenanceRequest);
MaintenanceRequestSchema.index(
  { reference: 1 },
  { unique: true, name: 'unique_maintenance_reference' },
);
MaintenanceRequestSchema.index({ customerId: 1, createdAt: -1 });
MaintenanceRequestSchema.index({ technicianId: 1, status: 1, updatedAt: -1 });
MaintenanceRequestSchema.index({ 'assignments.technicianId': 1, updatedAt: -1 });
MaintenanceRequestSchema.index({ status: 1, category: 1, createdAt: -1 });
MaintenanceRequestSchema.index({ hasOpenComplaint: 1, updatedAt: -1 });
