import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsNumber,
  Min,
  Max,
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

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Số người tham gia tối thiểu là 1' })
  @Max(100, { message: 'Số người tham gia tối đa là 100' })
  maxParticipants?: number;
}
