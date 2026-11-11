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
 * Admin-only payload for creating a new agent account.
 * Only authenticated admins may call the endpoint that uses this DTO.
 * Password validation is intentionally looser than self-registration so admins
 * can set strong temporary passwords without the letter+number constraint.
 */
export class AdminCreateAccountDto {
  /** Account type — only privileged roles accepted here. */
  @IsNotEmpty()
  @IsIn([UserRole.AGENT])
  role: UserRole.AGENT;

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

  /** Plaintext password set by the admin; hashed before storage. */
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  /** Agency name — required for agent accounts. */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  agencyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
