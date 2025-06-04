import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DifficultyLevel } from 'src/database/entities/Questions';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  questionText?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  passageText?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  answers?: {
    id?: number; 
    answerText: string;
    isCorrect: boolean;
  }[];

  @IsOptional()
  subjectId?: number;
}
