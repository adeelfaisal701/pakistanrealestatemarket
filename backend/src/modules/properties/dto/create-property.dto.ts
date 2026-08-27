import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AreaUnit, PropertyPurpose, PropertyType } from '../schemas/property.schema';

export class LocationDto {
  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  area: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class FeaturesDto {
  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  servantQuarter?: boolean;

  @IsOptional()
  @IsNumber()
  parkingSpaces?: number;

  @IsOptional()
  furnished?: boolean;

  @IsOptional()
  electricityMeter?: boolean;

  @IsOptional()
  gasConnection?: boolean;

  @IsOptional()
  waterSupply?: boolean;
}

export class CreatePropertyDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(PropertyPurpose)
  purpose: PropertyPurpose;

  @IsNotEmpty()
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
