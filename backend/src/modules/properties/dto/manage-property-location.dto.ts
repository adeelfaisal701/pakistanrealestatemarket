import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export class ManagePropertyLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}

export class CreatePropertyLocationShareDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  recipientEmail: string;
}

export class AccessPropertyLocationDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token: string;
}
