import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PropertyStatus } from '../../properties/schemas/property.schema';

export class ModeratePropertyDto {
  @IsNotEmpty()
  @IsEnum(PropertyStatus)
  status: PropertyStatus;

  @IsOptional()
  @IsString()
  moderationNotes?: string;
}
