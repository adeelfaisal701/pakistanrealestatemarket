import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateRequirementDto {
  @IsIn(['suspend', 'restore', 'close'])
  action: 'suspend' | 'restore' | 'close';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
