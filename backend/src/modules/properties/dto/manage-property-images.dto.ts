import { ArrayMaxSize, IsArray, IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class ReorderPropertyImagesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  images: string[];
}

export class RemovePropertyImageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;
}
