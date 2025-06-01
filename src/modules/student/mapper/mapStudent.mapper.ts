import { StudentDto } from '../dto/student.dto';
import { Students } from 'src/database/entities/Students';
export function mapStudentToDto(student: Students): StudentDto {
  return {
    id: student.id,
    studentCode: student.studentCode,
    fullName: student.fullName,
    email: student.email,
    address: student.address ?? undefined, 
    dateOfBirth: student.dateOfBirth,
    phoneNumber: student.phoneNumber ?? undefined,
    gender: student.gender,
  };
}
