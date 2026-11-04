import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SavedSearchFrequency } from '../schemas/saved-search.schema';

export class CreateSavedSearchDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsObject()
  filters: Record<string, string>;

  @IsOptional()
  @IsEnum(SavedSearchFrequency)
  frequency?: SavedSearchFrequency;
}
