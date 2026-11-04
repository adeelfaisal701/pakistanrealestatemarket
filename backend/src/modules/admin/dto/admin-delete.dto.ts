import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminDeleteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  confirmation: string;
}
