import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  IsBoolean,
  Matches,
  ValidateIf,
  IsObject,
} from 'class-validator';
import {
  PropertyPurpose,
  PropertyType,
} from '../../properties/schemas/property.schema';

export class BuyerProfileNotificationsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  inApp?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  email?: boolean;
}

export class BuyerPreferencesDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  preferredCity?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  preferredLocations?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  propertyTypes?: PropertyType[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsEnum(PropertyPurpose, { each: true })
  purposes?: PropertyPurpose[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => BuyerProfileNotificationsDto)
  notifications?: BuyerProfileNotificationsDto;
}

export class UpdateBuyerProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  @MaxLength(30)
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => BuyerPreferencesDto)
  preferences?: BuyerPreferencesDto;
}
