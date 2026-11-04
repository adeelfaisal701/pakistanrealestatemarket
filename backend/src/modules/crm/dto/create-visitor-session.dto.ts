import { IsMongoId } from 'class-validator';

export class CreateVisitorSessionDto {
  @IsMongoId()
  propertyId: string;
}
