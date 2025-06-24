import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  duration: number;

  @IsEnum(['practice', 'official'])
  examType: 'practice' | 'official';

  @IsNumber()
  @Type(() => Number)
  totalQuestions: number;

  @IsNumber()
  @Type(() => Number)
  subjectId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxScore?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  questionIds?: number[];
}
