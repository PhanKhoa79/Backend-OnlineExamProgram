import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  studentCode: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsEnum(['Nam', 'Nữ', 'Khác'])
  gender: 'Nam' | 'Nữ' | 'Khác';

  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string;

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

  @IsNotEmpty()
  classId: number;
}
