import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ComplaintStatus,
  MAINTENANCE_CATEGORY_KEYS,
  MAINTENANCE_PROPERTY_TYPES,
  MAINTENANCE_STATUS_VALUES,
  MAINTENANCE_TIME_SLOTS,
  MaintenanceStatus,
  PAYMENT_METHODS,
  TechnicianAvailability,
} from '../maintenance.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

// ───────────────────────────── Customer ─────────────────────────────

export class MaintenanceAddressDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  line: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  area: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;
}

export class CreateMaintenanceRequestDto {
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @Transform(trim)
  @IsString()
  @MinLength(15)
  @MaxLength(3000)
  description: string;

  @IsIn(MAINTENANCE_CATEGORY_KEYS)
  category: string;

  @IsIn(MAINTENANCE_PROPERTY_TYPES as unknown as string[])
  propertyType: string;

  @ValidateNested()
  @Type(() => MaintenanceAddressDto)
  address: MaintenanceAddressDto;

  @IsOptional()
  @IsDateString()
  preferredVisitDate?: string;

  @IsOptional()
  @IsIn(MAINTENANCE_TIME_SLOTS as unknown as string[])
  preferredTimeSlot?: string;

  /** Optional override; defaults to the authenticated account's details. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Matches(PHONE_PATTERN, { message: 'contactPhone must be 10-15 digits, optionally starting with +' })
  contactPhone?: string;
}

export class CustomerRequestsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsIn(['all', 'active', 'completed', 'cancelled'])
  scope?: string;
}

export class ReasonDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class QuotationResponseDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class FeedbackDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1500)
  comment?: string;
}

export class ComplaintDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;
}

// ───────────────────────────── Technician ─────────────────────────────

export class TechnicianJobsQueryDto {
  @IsOptional()
  @IsIn(['new', 'accepted', 'in_progress', 'completed', 'rejected', 'all'])
  bucket?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class RejectJobDto {
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason: string;
}

export class TechnicianStatusDto {
  @IsIn([MaintenanceStatus.ON_THE_WAY, MaintenanceStatus.IN_PROGRESS])
  status: MaintenanceStatus.ON_THE_WAY | MaintenanceStatus.IN_PROGRESS;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class WorkNoteDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  note: string;
}

export class PhotoKindQueryDto {
  @IsIn(['before', 'after'])
  kind: 'before' | 'after';
}

export class ChecklistItemDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  label: string;

  @IsBoolean()
  done: boolean;
}

export class CompleteJobDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist: ChecklistItemDto[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  summary?: string;
}

// ───────────────────────────── Admin ─────────────────────────────

export class AdminMaintenanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsIn(['all', ...MAINTENANCE_STATUS_VALUES])
  status?: string;

  @IsOptional()
  @IsIn(['all', ...MAINTENANCE_CATEGORY_KEYS])
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  openComplaints?: string;
}

export class AdminStatusUpdateDto {
  @IsIn(MAINTENANCE_STATUS_VALUES)
  status: MaintenanceStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AssignTechnicianDto {
  @IsMongoId()
  technicianId: string;

  @IsDateString()
  scheduledVisitAt: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /** Required when replacing an existing technician. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class QuotationLineDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  amount: number;
}

export class UpsertQuotationDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  inspectionCharge: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  laborCharge: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  materialCharge: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineDto)
  additionalCharges?: QuotationLineDto[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /** When true, the quotation is sent to the customer for approval. */
  @IsOptional()
  @IsBoolean()
  send?: boolean;

  /** Required when revising a quotation the customer already approved. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  revisionReason?: string;
}

export class RecordPaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10_000_000)
  amount: number;

  @IsIn(PAYMENT_METHODS as unknown as string[])
  method: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateComplaintDto {
  @IsIn([ComplaintStatus.IN_REVIEW, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
  status: ComplaintStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1500)
  resolutionNote?: string;
}

export class AdminNoteDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  note: string;
}

// ───────────────────── Admin technician management ─────────────────────

export class CreateTechnicianDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Matches(PHONE_PATTERN, { message: 'phone must be 10-15 digits, optionally starting with +' })
  phone: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAINTENANCE_CATEGORY_KEYS.length)
  @IsIn(MAINTENANCE_CATEGORY_KEYS, { each: true })
  categories: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  serviceAreas?: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsIn(Object.values(TechnicianAvailability))
  availability?: TechnicianAvailability;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;
}

export class UpdateTechnicianDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Matches(PHONE_PATTERN, { message: 'phone must be 10-15 digits, optionally starting with +' })
  phone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAINTENANCE_CATEGORY_KEYS.length)
  @IsIn(MAINTENANCE_CATEGORY_KEYS, { each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  serviceAreas?: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsIn(Object.values(TechnicianAvailability))
  availability?: TechnicianAvailability;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;
}

export class TechnicianActivationDto {
  @IsBoolean()
  active: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class TechniciansQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['all', ...MAINTENANCE_CATEGORY_KEYS])
  category?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  state?: string;

  @IsOptional()
  @IsIn(['all', ...Object.values(TechnicianAvailability)])
  availability?: string;
}
