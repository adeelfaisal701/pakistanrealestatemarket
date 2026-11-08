import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateAgencyProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'name must not be blank.' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  agencyType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  officeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @ValidateIf((_object, value) => typeof value !== 'string' || value.trim() !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @ValidateIf((_object, value) => typeof value !== 'string' || value.trim() !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  website?: string;

  @IsOptional()
  @IsString()
  galleryUrls?: string;
}
