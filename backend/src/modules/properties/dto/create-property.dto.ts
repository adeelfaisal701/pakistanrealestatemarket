import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AreaUnit, PropertyPurpose, PropertyType } from '../schemas/property.schema';

export class LocationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  area: string;
}

export class FeaturesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  bathrooms?: number;

  @IsOptional()
  @IsBoolean()
  servantQuarter?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  parkingSpaces?: number;

  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @IsBoolean()
  electricityMeter?: boolean;

  @IsOptional()
  @IsBoolean()
  gasConnection?: boolean;

  @IsOptional()
  @IsBoolean()
  waterSupply?: boolean;

  @IsOptional()
  @IsObject()
  rooms?: Record<string, number>;

  @IsOptional()
  @IsObject()
  outdoor?: Record<string, number>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  interior?: string[];

  @IsOptional()
  @IsIn(['Furnished', 'Semi-furnished', 'Unfurnished'])
  furnishing?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  community?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  nearby?: string[];
}

export class CreatePropertyDto {
  @IsOptional()
  @IsIn(['inventory', 'advertise'])
  submissionMode?: 'inventory' | 'advertise';

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  description: string;

  @IsNotEmpty()
  @IsEnum(PropertyPurpose)
  purpose: PropertyPurpose;

  @IsNotEmpty()
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  /** Price in PKR. Must be a positive number. */
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(1_000_000_000_000)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(10_000_000)
  areaSize: number;

  @IsNotEmpty()
  @IsEnum(AreaUnit)
  areaUnit: AreaUnit;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeaturesDto)
  features?: FeaturesDto;

  /** Existing externally hosted HTTPS images remain supported for compatibility. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  images?: string[];
}
