import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ArrayUnique,
  IsUUID,
} from 'class-validator';
import {
  PROMO_LIMITS,
  PROMO_PROPERTY_TYPES,
  PROMO_PURPOSES,
  PromoCampaignStatus,
  PromoDevice,
  PromoEventType,
  PromoMediaKind,
  PromoPackage,
  PromoPlacement,
} from '../promotion.constants';

const URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: true,
  disallow_auth: true,
};

export class PromoMediaDto {
  @IsEnum(PromoMediaKind)
  kind: PromoMediaKind;

  @IsString()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  posterUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;
}

export class PromoTargetingDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  cities?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PROMO_PROPERTY_TYPES as unknown as string[], { each: true })
  propertyTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PROMO_PURPOSES as unknown as string[], { each: true })
  purposes?: string[];
}

export class PromoCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  @IsArray()
  @ArrayMaxSize(PROMO_LIMITS.maxMediaPerCampaign)
  @ValidateNested({ each: true })
  @Type(() => PromoMediaDto)
  media: PromoMediaDto[];

  @IsUrl(URL_OPTIONS, { message: 'Destination must be a valid http(s) URL.' })
  @MaxLength(2048)
  destinationUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ctaText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsEnum(PromoCampaignStatus)
  status?: PromoCampaignStatus;

  @IsArray()
  @ArrayUnique()
  @IsEnum(PromoDevice, { each: true })
  devices: PromoDevice[];

  @IsArray()
  @ArrayUnique()
  @IsEnum(PromoPlacement, { each: true })
  placements: PromoPlacement[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PromoTargetingDto)
  targeting?: PromoTargetingDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(300)
  videoMaxSeconds?: number;

  @IsOptional()
  @IsEnum(PromoPackage)
  package?: PromoPackage | null;
}

export class PromoStatusDto {
  @IsEnum(PromoCampaignStatus)
  status: PromoCampaignStatus;
}

export class PromoListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['all', 'live', 'scheduled', 'expired', ...Object.values(PromoCampaignStatus)])
  status?: string;

  @IsOptional()
  @IsEnum(PromoPlacement)
  placement?: PromoPlacement;
}

export class PromoServeQueryDto {
  @IsEnum(PromoPlacement)
  placement: PromoPlacement;

  @IsOptional()
  @IsEnum(PromoDevice)
  device?: PromoDevice;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsIn(PROMO_PROPERTY_TYPES as unknown as string[])
  propertyType?: string;

  @IsOptional()
  @IsIn(PROMO_PURPOSES as unknown as string[])
  purpose?: string;
}

export class PromoEventDto {
  @IsString()
  @MinLength(24)
  @MaxLength(24)
  campaignId: string;

  @IsEnum(PromoEventType)
  type: PromoEventType;

  @IsEnum(PromoPlacement)
  placement: PromoPlacement;

  @IsEnum(PromoDevice)
  device: PromoDevice;

  @IsUUID('4')
  visitorId: string;
}

export class PromoAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(24)
  @MaxLength(24)
  campaignId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

export class PromoSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(20)
  listingsInterval: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  listingsMaxPerPage: number;

  @IsArray()
  @ArrayUnique()
  @IsEnum(PromoPlacement, { each: true })
  enabledPlacements: PromoPlacement[];
}
