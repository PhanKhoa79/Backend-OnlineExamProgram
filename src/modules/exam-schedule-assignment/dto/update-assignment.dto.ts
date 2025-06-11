import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class UpdateExamScheduleAssignmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsBoolean()
  @IsOptional()
  randomizeOrder?: boolean;

  @IsEnum(['waiting', 'open', 'closed'])
  @IsOptional()
  status?: 'waiting' | 'open' | 'closed';

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  examId?: number;

  @IsNumber()
  @IsOptional()
  classId?: number;
}
