import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PropertyAdvertisementStatus } from '../../properties/schemas/property-advertisement.schema';

export class AdminAdsQueryDto {
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
  limit = 30;

  @IsOptional()
  @IsEnum(PropertyAdvertisementStatus)
  status?: PropertyAdvertisementStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
