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
export class UpdateExamDto {
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  name: string;
  
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  duration: number;
  
  @IsEnum(['practice', 'official'])
  @IsOptional()
  examType: 'practice' | 'official';
  
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  totalQuestions: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  subjectId: number;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @Type(() => Number)
  questionIds: number[];
}
