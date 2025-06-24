import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('overview')
  async getOverviewReport(
    @Query('examId') examId?: string,
    @Query('isPractice') isPractice?: string,
  ) {
    return this.reportService.getOverviewReport(
      examId ? parseInt(examId, 10) : undefined,
      isPractice !== undefined ? isPractice === 'true' : undefined,
    );
  }

  @Get('practice-vs-real')
  async getPracticeVsRealComparison() {
    return this.reportService.getPracticeVsRealComparison();
  }

  @Get('question-analysis')
  async getQuestionAnalysisReport(@Query('examId') examId: string) {
    return this.reportService.getQuestionAnalysisReport(parseInt(examId, 10));
  }

  @Get('low-scoring-students')
  async getLowScoringStudentsReport(
    @Query('examId') examId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.reportService.getLowScoringStudentsReport(
      parseInt(examId, 10),
      threshold ? parseFloat(threshold) : 5,
    );
  }

  @Get('class-comparison')
  async getClassComparisonReport(@Query('examId') examId?: string) {
    return this.reportService.getClassComparisonReport(
      examId ? parseInt(examId, 10) : undefined,
    );
  }

  @Get('basic-stats')
  async getBasicStatsReport(
    @Query('classId') classId?: string,
    @Query('isPractice') isPractice?: string,
  ) {
    return this.reportService.getBasicStatsReport(
      classId ? parseInt(classId, 10) : undefined,
      isPractice !== undefined ? isPractice === 'true' : undefined,
    );
  }

  /* @Get('trend-over-time')
  async getTrendOverTimeReport(@Query('classId') classId?: string) {
    return this.reportService.getTrendOverTimeReport(
      classId ? parseInt(classId, 10) : undefined,
    );
  } */

  @Get('exam-quality')
  async getExamQualityReport(@Query('examId') examId: string) {
    return this.reportService.getExamQualityReport(parseInt(examId, 10));
  }
}
