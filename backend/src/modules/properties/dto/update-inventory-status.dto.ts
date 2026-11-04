import { IsIn } from 'class-validator';

export class UpdateInventoryStatusDto {
  @IsIn(['available', 'sold', 'rented', 'reserved', 'unavailable'])
  status: 'available' | 'sold' | 'rented' | 'reserved' | 'unavailable';
}
