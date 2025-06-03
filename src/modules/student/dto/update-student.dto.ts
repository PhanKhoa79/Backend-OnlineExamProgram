import {
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsDateString,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsEnum(['Nam', 'Nữ', 'Khác'])
  gender?: 'Nam' | 'Nữ' | 'Khác';

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  classId?: number;

  @IsOptional()
  @IsNumber()
  accountId?: number;
}
