import { IsOptional, IsUUID } from 'class-validator';

export class TrackPropertyEventDto {
  @IsUUID('4')
  visitorId: string;

  @IsOptional()
  @IsUUID('4')
  viewId?: string;
}
