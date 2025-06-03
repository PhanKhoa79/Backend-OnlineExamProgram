import { Students } from 'src/database/entities/Students';
import { StudentDto } from '../dto/student.dto';

export class StudentMapper {
  static toResponseDto(entity: Students): StudentDto {
    return {
      id: entity.id,
      studentCode: entity.studentCode,
      fullName: entity.fullName,
      gender: entity.gender,
      dateOfBirth: entity.dateOfBirth,
      phoneNumber: entity.phoneNumber ?? null,
      email: entity.email ?? null,
      address: entity.address ?? null,
      classId: entity.class?.id,
      accountId: entity.account?.id,
    };
  }

  static toResponseList(entities: Students[]): StudentDto[] {
    return entities.map(this.toResponseDto);
  }
}
