import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminAgentActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AdminAccountStatusDto extends AdminAgentActionDto {
  @IsNotEmpty()
  @IsIn(['suspended', 'active', 'deactivated'])
  status: 'suspended' | 'active' | 'deactivated';
}

export class AdminPropertyActionDto {
  @IsNotEmpty()
  @IsIn(['approve', 'reject', 'hide', 'unpublish', 'restore', 'flag', 'remove'])
  action: 'approve' | 'reject' | 'hide' | 'unpublish' | 'restore' | 'flag' | 'remove';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AdminAdvertisementActionDto {
  @IsNotEmpty()
  @IsIn(['approve', 'reject', 'publish', 'unpublish', 'pause', 'resume', 'end', 'remove'])
  action: 'approve' | 'reject' | 'publish' | 'unpublish' | 'pause' | 'resume' | 'end' | 'remove';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
