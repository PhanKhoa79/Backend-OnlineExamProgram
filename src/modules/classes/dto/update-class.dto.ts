import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;
}
