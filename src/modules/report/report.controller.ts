import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import {
  AnalyticsSummaryQueryDto,
  ScoreTrendsQueryDto,
  SubjectPerformanceQueryDto,
  ScoreDistributionQueryDto,
  ExamVolumeQueryDto,
  ScoreStatisticsQueryDto,
  TopStudentsQueryDto,
  FailingStudentsQueryDto,
} from './dto/analytics.dto';
import {
  AnalyticsSummaryResponse,
  ScoreTrendsResponse,
  SubjectPerformanceResponse,
  ScoreDistributionResponse,
  ExamVolumeResponseDto,
  ScoreStatisticsResponseDto,
  TopStudentsResponseDto,
  FailingStudentsResponseDto,
} from './dto/analytics-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getAnalyticsSummary(
    @Query() query: AnalyticsSummaryQueryDto,
  ): Promise<AnalyticsSummaryResponse> {
    return this.reportService.getAnalyticsSummary(query);
  }

  @Get('score-trends')
  @UseGuards(JwtAuthGuard)
  async getScoreTrends(
    @Query() query: ScoreTrendsQueryDto,
  ): Promise<ScoreTrendsResponse> {
    return this.reportService.getScoreTrends(query);
  }

  @Get('subject-performance')
  @UseGuards(JwtAuthGuard)
  async getSubjectPerformance(
    @Query() query: SubjectPerformanceQueryDto,
  ): Promise<SubjectPerformanceResponse> {
    return this.reportService.getSubjectPerformance(query);
  }

  @Get('score-distribution')
  @UseGuards(JwtAuthGuard)
  async getScoreDistribution(
    @Query() query: ScoreDistributionQueryDto,
  ): Promise<ScoreDistributionResponse> {
    return this.reportService.getScoreDistribution(query);
  }

  @Get('exam-volume')
  @UseGuards(JwtAuthGuard)
  async getExamVolume(
    @Query() query: ExamVolumeQueryDto,
  ): Promise<ExamVolumeResponseDto> {
    return this.reportService.getExamVolume(query);
  }

  @Get('score-statistics')
  @UseGuards(JwtAuthGuard)
  async getScoreStatistics(
    @Query() query: ScoreStatisticsQueryDto,
  ): Promise<ScoreStatisticsResponseDto> {
    return this.reportService.getScoreStatistics(query);
  }

  @Get('top-students')
  @UseGuards(JwtAuthGuard)
  async getTopStudents(
    @Query() query: TopStudentsQueryDto,
  ): Promise<TopStudentsResponseDto> {
    return this.reportService.getTopStudents(query);
  }

  @Get('failing-students')
  @UseGuards(JwtAuthGuard)
  async getFailingStudents(
    @Query() query: FailingStudentsQueryDto,
  ): Promise<FailingStudentsResponseDto> {
    return this.reportService.getFailingStudents(query);
  }
}
