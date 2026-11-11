import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../users/schemas/user.schema';

/**
 * Public self-registration payload.
 *
 * `role` is deliberately limited to BUYER only. Agent, agency, and dealer
 * accounts must be created by an authenticated admin through the admin API.
 * Admin accounts must never be created through the public register endpoint.
 */
export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'phone must be 10-15 digits, optionally starting with +',
  })
  phone: string;

  // bcrypt only uses the first 72 bytes, so cap the length.
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;

  /**
   * Only BUYER is accepted for public self-registration.
   * Omitting the field also defaults to BUYER in the user schema.
   */
  @IsOptional()
  @IsIn([UserRole.BUYER])
  role?: UserRole.BUYER;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
