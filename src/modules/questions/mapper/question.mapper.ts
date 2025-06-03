// src/modules/questions/mapper/question.mapper.ts

import { Questions } from 'src/database/entities/Questions';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import { Answers } from 'src/database/entities/Answers';
import { QuestionDto } from '../dto/question.dto';

export class QuestionMapper {
  static toDto(entity: Questions): QuestionDto {
    return {
      id: entity.id,
      questionText: entity.questionText,
      imageUrl: entity.imageUrl,
      audioUrl: entity.audioUrl,
      passageText: entity.passageText,
      difficultyLevel: entity.difficultyLevel,
      subjectId: entity.subject?.id ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      answers:
        entity.answers?.map((a) => ({
          id: a.id,
          answerText: a.answerText,
          isCorrect: a.isCorrect ?? false,
        })) ?? [],
    };
  }

  static toEntity(dto: CreateQuestionDto): Questions {
    const question = new Questions();
    question.questionText = dto.questionText;
    question.imageUrl = dto.imageUrl;
    question.audioUrl = dto.audioUrl;
    question.passageText = dto.passageText;
    question.difficultyLevel = dto.difficultyLevel;

    if (dto.answers && Array.isArray(dto.answers)) {
      question.answers = dto.answers.map((a) => {
        const ans = new Answers();
        ans.answerText = a.answerText;
        ans.isCorrect = a.isCorrect ?? false;
        return ans;
      });
    }

    return question;
  }

  static updateEntity(entity: Questions, dto: UpdateQuestionDto): Questions {
    if (dto.questionText !== undefined) entity.questionText = dto.questionText;
    if (dto.imageUrl !== undefined) entity.imageUrl = dto.imageUrl;
    if (dto.audioUrl !== undefined) entity.audioUrl = dto.audioUrl;
    if (dto.passageText !== undefined) entity.passageText = dto.passageText;
    if (dto.difficultyLevel !== undefined)
      entity.difficultyLevel = dto.difficultyLevel;

    return entity;
  }
}
