import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRequirementOfferDto {
  @IsMongoId()
  propertyId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  message?: string;
}
