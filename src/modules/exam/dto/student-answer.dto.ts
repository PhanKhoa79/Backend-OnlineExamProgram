import { IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class SaveStudentAnswerDto {
  @IsNotEmpty()
  @IsNumber()
  studentExamId: number;

  @IsNotEmpty()
  @IsNumber()
  questionId: number;

  @IsOptional()
  @IsNumber()
  answerId?: number | null;

  @IsOptional()
  @IsBoolean()
  isMarked?: boolean;
}

export class StudentAnswerResponseDto {
  studentExamId: number;
  questionId: number;
  answerId: number | null;
  answeredAt: Date | null;
  isMarked: boolean;
}

export class StartExamDto {
  @IsNotEmpty()
  @IsNumber()
  examId: number;

  @IsNotEmpty()
  @IsNumber()
  studentId: number;

  @IsOptional()
  @IsNumber()
  assignmentId?: number;
}

export class StartExamResponseDto {
  studentExamId: number;
  examId: number;
  studentId: number;
  assignmentId: number | null;
  startedAt: Date | null;
  questions: any[];
  existingAnswers: StudentAnswerResponseDto[];
  examDuration: number;
  examDurationSeconds: number;
  timeElapsed: number;
  timeElapsedSeconds: number;
  timeRemaining: number;
  timeRemainingSeconds: number;
  timeRemainingFormatted: string;
  isResumed: boolean;
  examType: 'practice' | 'official';
}
