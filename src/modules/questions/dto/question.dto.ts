// src/modules/questions/dto/question.dto.ts
import { DifficultyLevel } from 'src/database/entities/Questions';

export interface AnswerDto {
  id: number;
  answerText: string;
  isCorrect: boolean;
}

export class QuestionDto {
  id: number;
  questionText: string;
  imageUrl?: string;
  audioUrl?: string;
  passageText?: string;
  difficultyLevel?: DifficultyLevel;
  subjectId: number | null;
  createdAt: Date;
  updatedAt: Date;
  answers: AnswerDto[];
}
