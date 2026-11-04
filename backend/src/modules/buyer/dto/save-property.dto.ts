import { IsMongoId } from 'class-validator';

export class SavePropertyDto {
  @IsMongoId()
  propertyId: string;
}
