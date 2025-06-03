// src/modules/questions/dto/create-question.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DifficultyLevel } from 'src/database/entities/Questions';

export class CreateAnswerDto {
  @IsString()
  answerText: string;

  @IsOptional()
  isCorrect?: boolean;
}

export class CreateQuestionDto {
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  passageText?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateAnswerDto)
  answers: CreateAnswerDto[];

  @IsNotEmpty()
  subjectId: number;
}
