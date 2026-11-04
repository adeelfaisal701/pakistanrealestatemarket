import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SavedSearchFrequency } from '../schemas/saved-search.schema';

export class UpdateSavedSearchDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  filters?: Record<string, string>;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(SavedSearchFrequency)
  frequency?: SavedSearchFrequency;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  alertsEnabled?: boolean;
}
