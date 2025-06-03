import { Subjects } from 'src/database/entities/Subjects';
import { SubjectResponseDto } from '../dto/subject.dto';


export class SubjectMapper {
  static toResponseDto(entity: Subjects): SubjectResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toResponseList(entities: Subjects[]): SubjectResponseDto[] {
    return entities.map(this.toResponseDto);
  }
}
