import { IsUUID } from 'class-validator';

export class TrackPropertyEventDto {
  @IsUUID('4')
  visitorId: string;
}
