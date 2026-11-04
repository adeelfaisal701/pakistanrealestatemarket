import { IsMongoId, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBuyerInquiryDto {
  @IsMongoId()
  propertyId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}
