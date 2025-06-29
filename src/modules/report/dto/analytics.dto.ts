import {
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum ExamTypeEnum {
  PRACTICE = 'practice',
  OFFICIAL = 'official',
  ALL = 'all',
}

export enum PeriodEnum {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum SortByEnum {
  SCORE = 'score',
  PASS_RATE = 'passRate',
  EXAM_COUNT = 'examCount',
  IMPROVEMENT = 'improvement',
}

export enum SortOrderEnum {
  ASC = 'asc',
  DESC = 'desc',
}

export enum CompareByEnum {
  CLASS = 'class',
  SUBJECT = 'subject',
  EXAM_TYPE = 'examType',
  TIME_PERIOD = 'timePeriod',
}

export enum AlertTypeEnum {
  PERFORMANCE = 'performance',
  PARTICIPATION = 'participation',
  DIFFICULTY = 'difficulty',
  ANOMALY = 'anomaly',
}

export enum SeverityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Base Query DTO
export class BaseAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => Number(v));
    if (typeof value === 'string') return value.split(',').map(v => Number(v.trim()));
    return [Number(value)];
  })
  classIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => Number(v));
    if (typeof value === 'string') return value.split(',').map(v => Number(v.trim()));
    return [Number(value)];
  })
  subjectIds?: number[];

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => Number(v));
    if (typeof value === 'string') return value.split(',').map(v => Number(v.trim()));
    return [Number(value)];
  })
  studentIds?: number[];
}

// 1. Analytics Summary Query
export class AnalyticsSummaryQueryDto extends BaseAnalyticsQueryDto {}

// 2. Score Trends Query
export class ScoreTrendsQueryDto {
  @IsOptional()
  @IsEnum(PeriodEnum)
  period?: PeriodEnum = PeriodEnum.WEEKLY;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(52)
  range?: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => Number(v));
    if (typeof value === 'string') return value.split(',').map(v => Number(v.trim()));
    return [Number(value)];
  })
  classIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => Number(v));
    if (typeof value === 'string') return value.split(',').map(v => Number(v.trim()));
    return [Number(value)];
  })
  subjectIds?: number[];

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum;
}

// 3. Subject Performance Query
export class SubjectPerformanceQueryDto {
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => Number(v));
    if (typeof value === 'string') return value.split(',').map(v => Number(v.trim()));
    return [Number(value)];
  })
  classIds?: number[];

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SortByEnum)
  sortBy?: SortByEnum = SortByEnum.SCORE;

  @IsOptional()
  @IsEnum(SortOrderEnum)
  sortOrder?: SortOrderEnum = SortOrderEnum.DESC;
}

// 4. Class Performance Query
export class ClassPerformanceQueryDto {
  @IsOptional()
  @Transform(({ value }) => value?.split(',').map(Number))
  @IsNumber({}, { each: true })
  subjectIds?: number[];

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeStudentCount?: boolean;
}

// 5. Student Performance Query
export class StudentPerformanceQueryDto {
  @IsOptional()
  @Transform(({ value }) => value?.split(',').map(Number))
  @IsNumber({}, { each: true })
  classIds?: number[];

  @IsOptional()
  @Transform(({ value }) => value?.split(',').map(Number))
  @IsNumber({}, { each: true })
  subjectIds?: number[];

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// 6. Time Analysis Query
export class TimeAnalysisQueryDto {
  @IsOptional()
  @Transform(({ value }) => value?.split(',').map(Number))
  @IsNumber({}, { each: true })
  subjectIds?: number[];

  @IsOptional()
  @IsEnum(ExamTypeEnum)
  examType?: ExamTypeEnum;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// 7. Score Distribution Query
export class ScoreDistributionQueryDto extends BaseAnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(0.5)
  @Max(5)
  binSize?: number = 1;
}

// Exam Volume Statistics Query
export class ExamVolumeQueryDto {
  // Lọc theo thời gian
  @IsOptional()
  @IsDateString()
  specificDate?: string; // YYYY-MM-DD - cho ngày cụ thể

  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD - từ ngày

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD - đến ngày

  // Lọc theo loại đề thi
  @IsOptional()
  @IsEnum(['practice', 'official', 'all'])
  examType?: 'practice' | 'official' | 'all' = 'all';

  // Lọc theo lớp học
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  classIds?: number[];

  // Lọc theo môn học
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  subjectIds?: number[];

  // Lọc theo học sinh (tùy chọn)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  studentIds?: number[];

  // Nhóm dữ liệu theo thời gian
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  groupBy?: 'daily' | 'weekly' | 'monthly' = 'daily';
}

// Score Statistics Query - tương tự exam-volume nhưng thống kê điểm số
export class ScoreStatisticsQueryDto {
  // Lọc theo thời gian
  @IsOptional()
  @IsDateString()
  specificDate?: string; // YYYY-MM-DD - cho ngày cụ thể

  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD - từ ngày

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD - đến ngày

  // Lọc theo loại đề thi
  @IsOptional()
  @IsEnum(['practice', 'official', 'all'])
  examType?: 'practice' | 'official' | 'all' = 'all';

  // Lọc theo lớp học
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  classIds?: number[];

  // Lọc theo môn học
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  subjectIds?: number[];

  // Lọc theo học sinh (tùy chọn)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  studentIds?: number[];

  // Nhóm dữ liệu theo thời gian
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  groupBy?: 'daily' | 'weekly' | 'monthly' = 'daily';
}

// Top Students Query - top 10 sinh viên có điểm TB cao nhất
export class TopStudentsQueryDto {
  // Lọc theo lớp học (có thể chọn nhiều)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  classIds?: number[];
  // Lọc theo môn học (tùy chọn)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  subjectIds?: number[];
  // Số lượng top students cần lấy
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 10;
  // Lọc theo thời gian (tùy chọn)
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Failing Students Query - danh sách học sinh không đạt
export enum FailureLevelEnum {
  SEVERE = 'severe', // < 30 điểm
  MODERATE = 'moderate', // 30-49 điểm
  ALL = 'all', // tất cả học sinh không đạt
}

export class FailingStudentsQueryDto {
  // Lọc theo lớp học
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  classIds?: number[];

  // Lọc theo môn học
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  subjectIds?: number[];

  // Lọc theo ngày cụ thể
  @IsOptional()
  @IsDateString()
  specificDate?: string; // YYYY-MM-DD

  // Lọc theo khoảng thời gian
  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD

  // Lọc theo mức độ không đạt
  @IsOptional()
  @IsEnum(FailureLevelEnum)
  failureLevel?: FailureLevelEnum = FailureLevelEnum.ALL;

  // Số lượng kết quả trả về (pagination)
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(5000)
  limit?: number = 2000;

  // Trang hiện tại (pagination)
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  // Sắp xếp theo điểm số
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortByScore?: 'asc' | 'desc'; // không sắp xếp mặc định
} 