import { IsEmail, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  UserReportCategory,
  UserReportStatus,
  UserReportTargetType,
} from '../schemas/user-report.schema';

export class CreateUserReportDto {
  @IsEnum(UserReportTargetType)
  targetType: UserReportTargetType;

  @IsMongoId()
  @IsNotEmpty()
  targetId: string;

  @IsEnum(UserReportCategory)
  category: UserReportCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  details: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reporterName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  reporterEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  reporterPhone?: string;
}

export class UpdateUserReportDto {
  @IsEnum(UserReportStatus)
  status: UserReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionDetails?: string;
}
