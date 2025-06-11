import { Exams } from 'src/database/entities/Exams';
import { CreateExamDto } from '../dto/create-exam.dto';
import { UpdateExamDto } from '../dto/update-exam.dto';

export class ExamMapper {
  static toEntity(dto: CreateExamDto): Partial<Exams> {
    return {
      name: dto.name,
      duration: dto.duration ?? null,
      examType: dto.examType,
      totalQuestions: dto.totalQuestions ?? null,
      subject: { id: dto.subjectId } as any,
    };
  }

  static merge(entity: Exams, dto: UpdateExamDto): Exams {
    if (dto.name) entity.name = dto.name;
    if (dto.duration !== undefined) entity.duration = dto.duration;
    if (dto.examType) entity.examType = dto.examType;
    if (dto.totalQuestions !== undefined)
      entity.totalQuestions = dto.totalQuestions;
    if (dto.subjectId) entity.subject = { id: dto.subjectId } as any;
    return entity;
  }
}
