import { IsBoolean, ValidateIf } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  inApp?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  email?: boolean;
}
