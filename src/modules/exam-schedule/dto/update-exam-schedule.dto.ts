import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
  IsArray,
  IsNumber,
} from 'class-validator';

export class UpdateExamScheduleDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsEnum(['active', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'active' | 'completed' | 'cancelled';

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  subjectId?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  classIds?: number[];
}
