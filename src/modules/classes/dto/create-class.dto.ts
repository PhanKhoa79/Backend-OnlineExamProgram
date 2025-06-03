import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;
}
