import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class CreateBulkStudentDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách sinh viên không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  students: CreateStudentDto[];
}

export class BulkCreateResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    studentCode?: string;
    error: string;
  }>;
  createdStudents: Array<{
    id: number;
    studentCode: string;
    fullName: string;
    email: string;
    address: string;
    dateOfBirth: string;
    phoneNumber: string;
    classId: number;
    gender: 'Nam' | 'Nữ' | 'Khác'
  }>;
} 