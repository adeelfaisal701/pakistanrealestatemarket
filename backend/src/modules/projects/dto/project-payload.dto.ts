import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DevelopmentProjectStatus } from '../schemas/development-project.schema';

export class ProjectPaymentMilestoneDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  dueAfter?: string;
}

export class ProjectPaymentPlanDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bookingAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  confirmationAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  downPaymentAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  downPaymentPercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  installmentDuration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  installmentFrequency?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectPaymentMilestoneDto)
  milestones: ProjectPaymentMilestoneDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  possessionAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentUrl?: string;
}

export class ProjectPayloadDto {
  @IsString()
  @MaxLength(160)
  name: string;

  @IsString()
  @MaxLength(160)
  developer: string;

  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @IsString()
  @MaxLength(300)
  shortDescription: string;

  @IsString()
  @MaxLength(12000)
  description: string;

  @IsString()
  @MaxLength(200)
  location: string;

  @IsString()
  @MaxLength(100)
  projectType: string;

  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  priceRange?: string;

  @IsEnum(DevelopmentProjectStatus)
  status: DevelopmentProjectStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsArray()
  @IsString({ each: true })
  gallery: string[];

  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @IsObject()
  additionalInformation: Record<string, string>;

  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectPaymentPlanDto)
  paymentPlan: ProjectPaymentPlanDto;

  @IsBoolean()
  isPublished: boolean;

  @IsBoolean()
  isFeatured: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder: number;
}
