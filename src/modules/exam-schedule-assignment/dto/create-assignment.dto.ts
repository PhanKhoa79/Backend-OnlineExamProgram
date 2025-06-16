import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
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

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Số người tham gia tối thiểu là 1' })
  @Max(100, { message: 'Số người tham gia tối đa là 100' })
  maxParticipants?: number;
}

// 🔥 THÊM: DTO cho bulk create với phân phối đề thi ngẫu nhiên
export class BulkCreateExamScheduleAssignmentDto {
  @IsNumber()
  @IsNotEmpty()
  examScheduleId: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 đề thi' })
  @IsNumber({}, { each: true })
  examIds: number[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 lớp học' })
  @IsNumber({}, { each: true })
  classIds: number[];

  @IsBoolean()
  @IsOptional()
  randomizeOrder?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Số người tham gia tối thiểu là 1' })
  @Max(100, { message: 'Số người tham gia tối đa là 100' })
  maxParticipants?: number;
}
