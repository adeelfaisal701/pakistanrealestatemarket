import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CompleteAgentProfileDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'agencyAddress must not be blank.' })
  @MaxLength(500)
  agencyAddress: string;
}
