import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsArray,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';

export class CreateExamScheduleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsEnum(['active', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'active' | 'completed' | 'cancelled';

  @IsString()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  subjectId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 lớp học' })
  @IsOptional()
  classIds?: number[];
}
