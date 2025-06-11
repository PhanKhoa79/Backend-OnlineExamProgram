import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class CreateExamScheduleAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

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
  @IsNotEmpty()
  examId: number;

  @IsNumber()
  @IsNotEmpty()
  examScheduleId: number;

  @IsNumber()
  @IsNotEmpty()
  classId: number;
}
