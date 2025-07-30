import { IsOptional, IsNumber, IsString, IsIn, Matches } from 'class-validator';

export class StudentExamResultsFilterDto {
  @IsOptional()
  @IsNumber()
  classId?: number;

  @IsOptional()
  @IsNumber()
  subjectId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['practice', 'official'])
  examType?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'specificDate must be in format YYYY-MM-DD',
  })
  specificDate?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in format YYYY-MM-DD',
  })
  startDate?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in format YYYY-MM-DD',
  })
  endDate?: string; // Format: YYYY-MM-DD
}
