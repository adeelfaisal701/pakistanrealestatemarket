import { IsIn } from 'class-validator';
import { PropertyAdvertisementStatus } from '../schemas/property-advertisement.schema';

export class UpdateAdvertisementStatusDto {
  @IsIn([
    PropertyAdvertisementStatus.PAUSED,
    PropertyAdvertisementStatus.ENDED,
    PropertyAdvertisementStatus.PUBLISHED,
  ])
  status: PropertyAdvertisementStatus;
}
