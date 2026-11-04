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
 * `role` is deliberately limited to non-privileged roles. Admin accounts must
 * never be created through the public register endpoint (create them via a
 * seed script / admin tooling instead).
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

  @IsOptional()
  @IsIn([UserRole.BUYER, UserRole.AGENT])
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  agencyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
