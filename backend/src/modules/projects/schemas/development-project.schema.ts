import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DevelopmentProjectDocument = DevelopmentProject & Document;

export enum DevelopmentProjectStatus {
  COMING_SOON = 'Coming Soon',
  LAUNCHED = 'Launched',
  AVAILABLE = 'Available',
  COMPLETED = 'Completed',
}

@Schema({ _id: false })
export class ProjectPaymentMilestone {
  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ trim: true, maxlength: 80 })
  dueAfter?: string;
}

export const ProjectPaymentMilestoneSchema =
  SchemaFactory.createForClass(ProjectPaymentMilestone);

@Schema({ _id: false })
export class ProjectPaymentPlan {
  @Prop({ default: true })
  enabled: boolean;

  @Prop({ trim: true, maxlength: 160 })
  title?: string;

  @Prop({ min: 0 })
  totalPrice?: number;

  @Prop({ min: 0 })
  bookingAmount?: number;

  @Prop({ min: 0 })
  confirmationAmount?: number;

  @Prop({ min: 0 })
  downPaymentAmount?: number;

  @Prop({ min: 0, max: 100 })
  downPaymentPercentage?: number;

  @Prop({ trim: true, maxlength: 100 })
  installmentDuration?: string;

  @Prop({ trim: true, maxlength: 80 })
  installmentFrequency?: string;

  @Prop({ type: [ProjectPaymentMilestoneSchema], default: [] })
  milestones: ProjectPaymentMilestone[];

  @Prop({ min: 0 })
  possessionAmount?: number;

  @Prop({ trim: true, maxlength: 3000 })
  notes?: string;

  @Prop({ trim: true })
  documentUrl?: string;
}

export const ProjectPaymentPlanSchema =
  SchemaFactory.createForClass(ProjectPaymentPlan);

@Schema({ timestamps: true, collection: 'development_projects' })
export class DevelopmentProject {
  @Prop({ required: true, trim: true, maxlength: 160 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 160 })
  developer: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  })
  slug: string;

  @Prop({ required: true, trim: true, maxlength: 300 })
  shortDescription: string;

  @Prop({ required: true, trim: true, maxlength: 12000 })
  description: string;

  @Prop({ required: true, trim: true, maxlength: 200 })
  location: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  projectType: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ trim: true, maxlength: 160 })
  priceRange?: string;

  @Prop({ type: String, enum: DevelopmentProjectStatus, required: true })
  status: DevelopmentProjectStatus;

  @Prop({ trim: true })
  coverImage?: string;

  @Prop({ type: [String], default: [] })
  gallery: string[];

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ type: Map, of: String, default: {} })
  additionalInformation: Map<string, string>;

  @Prop({ type: ProjectPaymentPlanSchema, default: () => ({ enabled: false }) })
  paymentPlan: ProjectPaymentPlan;

  @Prop({ default: false, index: true })
  isPublished: boolean;

  @Prop({ default: false, index: true })
  isFeatured: boolean;

  @Prop({ default: 0, index: true })
  displayOrder: number;
}

export const DevelopmentProjectSchema =
  SchemaFactory.createForClass(DevelopmentProject);

DevelopmentProjectSchema.index({ slug: 1 }, { unique: true });
DevelopmentProjectSchema.index({ isPublished: 1, isFeatured: 1, displayOrder: 1 });
