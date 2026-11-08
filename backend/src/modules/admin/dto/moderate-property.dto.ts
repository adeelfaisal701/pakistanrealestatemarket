import { IsIn, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { PropertyStatus } from '../../properties/schemas/property.schema';

export class ModeratePropertyDto {
  /** Admins can only publish or reject; other statuses are set by the system/owner. */
  @IsNotEmpty()
  @IsIn([PropertyStatus.PUBLISHED, PropertyStatus.REJECTED])
  status: PropertyStatus;

  /** Required when rejecting, so the agent knows why. */
  @ValidateIf((o) => o.status === PropertyStatus.REJECTED || o.moderationNotes !== undefined)
  @IsNotEmpty({ message: 'moderationNotes is required when rejecting a listing' })
  @IsString()
  @MaxLength(1000)
  moderationNotes?: string;
}
