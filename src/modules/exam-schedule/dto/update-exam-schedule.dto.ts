import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
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
}
