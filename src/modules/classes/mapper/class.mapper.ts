import { Classes } from 'src/database/entities/Classes';
import { ClassResponseDto } from '../dto/classes.dto';


export class ClassMapper {
  static toResponseDto(entity: Classes): ClassResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toResponseList(entities: Classes[]): ClassResponseDto[] {
    return entities.map(this.toResponseDto);
  }
}
