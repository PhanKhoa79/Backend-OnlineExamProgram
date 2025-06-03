import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  description?: string;
}
