import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AnalyticsCacheService } from './analytics-cache.service';
import { StudentExams } from '../../database/entities/StudentExams';
import { Exams } from '../../database/entities/Exams';
import { Students } from '../../database/entities/Students';
import { Classes } from '../../database/entities/Classes';
import { StudentAnswers } from '../../database/entities/StudentAnswers';
import { Questions } from '../../database/entities/Questions';
import { Subjects } from '../../database/entities/Subjects';
import { Answers } from '../../database/entities/Answers';
import {
  AnalyticsSummaryQueryDto,
  ScoreTrendsQueryDto,
  SubjectPerformanceQueryDto,
  ScoreDistributionQueryDto,
  ExamTypeEnum,
  PeriodEnum,
  SortOrderEnum,
  ExamVolumeQueryDto,
  ScoreStatisticsQueryDto,
  TopStudentsQueryDto,
  FailingStudentsQueryDto,
  FailureLevelEnum,
} from './dto/analytics.dto';
import {
  AnalyticsSummaryResponse,
  ScoreTrendsResponse,
  SubjectPerformanceResponse,
  ScoreDistributionResponse,
  ExamVolumeResponseDto,
  ExamVolumeSummary,
  ExamVolumeDataPoint,
  ScoreStatisticsResponseDto,
  ScoreStatisticsSummary,
  ScoreStatisticsDataPoint,
  TopStudentsResponseDto,
  TopStudentItem,
  FailingStudentsResponseDto,
  FailingStudentItem,
} from './dto/analytics-response.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(StudentExams)
    private studentExamsRepository: Repository<StudentExams>,
    @InjectRepository(Exams)
    private examsRepository: Repository<Exams>,
    @InjectRepository(Students)
    private studentsRepository: Repository<Students>,
    @InjectRepository(Classes)
    private classesRepository: Repository<Classes>,
    @InjectRepository(StudentAnswers)
    private studentAnswersRepository: Repository<StudentAnswers>,
    @InjectRepository(Questions)
    private questionsRepository: Repository<Questions>,
    @InjectRepository(Subjects)
    private subjectsRepository: Repository<Subjects>,
    @InjectRepository(Answers)
    private answersRepository: Repository<Answers>,
    private analyticsCacheService: AnalyticsCacheService,
  ) {}

  // Utility method để build where conditions chung
  private buildBaseWhereConditions(query: {
    startDate?: string;
    endDate?: string;
    examType?: ExamTypeEnum;
  }) {
    const where: Record<string, any> = {};
    const relations = ['exam', 'exam.subject', 'student', 'student.class'];

    if (query.startDate || query.endDate) {
      const dateConditions: { gte?: Date; lte?: Date } = {};
      if (query.startDate) {
        dateConditions.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateConditions.lte = endDate;
      }
      if (dateConditions.gte || dateConditions.lte) {
        where.submittedAt = Between(
          dateConditions.gte || new Date(0),
          dateConditions.lte || new Date(),
        );
      }
    }

    if (query.examType && query.examType !== ExamTypeEnum.ALL) {
      where.exam = { examType: query.examType };
    }

    return { where, relations };
  }

  // 1. Analytics Summary Service
  async getAnalyticsSummary(
    query: AnalyticsSummaryQueryDto,
  ): Promise<AnalyticsSummaryResponse> {
    // Check cache first
    const cachedResult = await this.analyticsCacheService.getCachedSummary(query);
    if (cachedResult) {
      this.logger.log('Returning cached analytics summary');
      return cachedResult;
    }

    this.logger.log('Computing analytics summary from database');
    const { where, relations } = this.buildBaseWhereConditions(query);

    // Add specific filters
    if (query.classIds?.length) {
      where.student = { ...where.student, class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { ...where.exam, subject: { id: In(query.subjectIds) } };
    }
    if (query.studentIds?.length) {
      where.student = { ...where.student, id: In(query.studentIds) };
    }

    // Get submitted exams only
    where.isSubmitted = true;

    this.logger.log('Summary where conditions:', JSON.stringify(where, null, 2));
    this.logger.log('Summary relations:', JSON.stringify(relations));

    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    this.logger.log(`Found ${studentExams.length} completed exams in summary`);

    // Calculate metrics
    const totalExams = studentExams.length;
    const totalStudents = new Set(studentExams.map(se => se.student.id)).size;
    const scores = studentExams.map(se => se.score || 0);
    const averageScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Calculate pass rate with dynamic threshold
    const maxScore = Math.max(...scores, 0);
    const passThreshold = maxScore > 10 ? 50.0 : 5.0; // 50/100 or 5/10
    const passedExams = scores.filter((score) => score >= passThreshold).length;
    const passRate = totalExams ? (passedExams / totalExams) * 100 : 0;

    // Calculate completion rate (submitted vs total exam attempts)
    const allExamAttempts = await this.studentExamsRepository.count({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { ...where, isSubmitted: undefined },
      relations,
    });
    const completionRate = allExamAttempts
      ? (totalExams / allExamAttempts) * 100
      : 0;

    // Calculate weekly growth (compare current week with previous week)
    const now = new Date();
    const currentWeekStart = new Date();
    currentWeekStart.setDate(now.getDate() - 7); // Last 7 days

    const previousWeekStart = new Date();
    previousWeekStart.setDate(now.getDate() - 14); // 14-7 days ago

    const previousWeekEnd = new Date();
    previousWeekEnd.setDate(now.getDate() - 7); // 7 days ago

    // Current week data (last 7 days)
    const currentWeekWhere = { ...where };
    currentWeekWhere.submittedAt = Between(currentWeekStart, now);

    const currentWeekExams = await this.studentExamsRepository.find({
      where: currentWeekWhere,
      relations,
    });

    // Previous week data (14-7 days ago)
    const previousWeekWhere = { ...where };
    previousWeekWhere.submittedAt = Between(previousWeekStart, previousWeekEnd);

    const previousWeekExams = await this.studentExamsRepository.find({
      where: previousWeekWhere,
      relations,
    });

    const currentWeekTotalExams = currentWeekExams.length;
    const currentWeekTotalStudents = new Set(currentWeekExams.map(se => se.student.id)).size;
    const currentWeekScores = currentWeekExams.map(se => se.score || 0);
    const currentWeekAverageScore = currentWeekScores.length 
      ? currentWeekScores.reduce((a, b) => a + b, 0) / currentWeekScores.length 
      : 0;

    const prevTotalExams = previousWeekExams.length;
    const prevTotalStudents = new Set(previousWeekExams.map(se => se.student.id)).size;
    const prevScores = previousWeekExams.map(se => se.score || 0);
    const prevAverageScore = prevScores.length 
      ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length 
      : 0;

    const result = {
      totalExams,
      totalStudents,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      weeklyGrowth: {
        exams: prevTotalExams
          ? Math.round(((currentWeekTotalExams - prevTotalExams) / prevTotalExams) * 100)
          : 0,
        score: prevAverageScore
          ? Math.round(
              ((currentWeekAverageScore - prevAverageScore) / prevAverageScore) * 100,
            )
          : 0,
        students: prevTotalStudents
          ? Math.round(
              ((currentWeekTotalStudents - prevTotalStudents) / prevTotalStudents) * 100,
            )
          : 0,
      },
    };

    // Cache the result
    await this.analyticsCacheService.setCachedSummary(query, result);
    this.logger.log('Analytics summary cached successfully');

    return result;
  }

  // 2. Score Trends Analytics
  async getScoreTrends(
    query: ScoreTrendsQueryDto,
  ): Promise<ScoreTrendsResponse> {
    // Check cache first
    const cachedResult = await this.analyticsCacheService.getCachedScoreTrends(query);
    if (cachedResult) {
      this.logger.log('Returning cached score trends');
      return cachedResult;
    }

    this.logger.log('Computing score trends from database');
    const period = query.period || PeriodEnum.WEEKLY;
    const range =
      query.range ||
      (period === PeriodEnum.DAILY
        ? 30
        : period === PeriodEnum.WEEKLY
          ? 12
          : 6);

    const where: any = { isSubmitted: true };
    const relations = ['exam', 'exam.subject', 'student', 'student.class'];

    if (query.classIds?.length) {
      where.student = { class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { subject: { id: In(query.subjectIds) } };
    }
    if (query.examType && query.examType !== ExamTypeEnum.ALL) {
      where.exam = { ...where.exam, examType: query.examType };
    }

    // Calculate date range - get the most recent periods
    const endDate = new Date();
    const startDate = new Date();

    if (period === PeriodEnum.DAILY) {
      startDate.setDate(startDate.getDate() - range + 1); // +1 to include today
    } else if (period === PeriodEnum.WEEKLY) {
      startDate.setDate(startDate.getDate() - range * 7 + 1);
    } else {
      startDate.setMonth(startDate.getMonth() - range + 1);
    }

    where.submittedAt = Between(startDate, endDate);

    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    // Group data by time periods - start from most recent and go backwards
    const labels: string[] = [];
    const averageScores: number[] = [];
    const practiceScores: number[] = [];
    const officialScores: number[] = [];
    const passRates: number[] = [];

    // Create periods starting from most recent (endDate) going backwards
    for (let i = range - 1; i >= 0; i--) {
      let periodStart: Date;
      let periodEnd: Date;

      if (period === PeriodEnum.DAILY) {
        periodEnd = new Date(endDate);
        periodEnd.setDate(endDate.getDate() - i);
        periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 1);
        labels.push(periodStart.toISOString().split('T')[0]);
      } else if (period === PeriodEnum.WEEKLY) {
        periodEnd = new Date(endDate);
        periodEnd.setDate(endDate.getDate() - (i * 7));
        periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 7);
        labels.push(`Week ${range - i}`);
      } else {
        // For monthly: start from current month and go backwards
        periodStart = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        periodEnd = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 1);
        
        // For the current month (i=0), include up to current date
        if (i === 0) {
          periodEnd = new Date(endDate);
        }
        
        labels.push(
          periodStart.toLocaleDateString('vi-VN', {
            month: 'short',
            year: 'numeric',
          }),
        );
      }

      const periodExams = studentExams.filter(
        (se) =>
          se.submittedAt &&
          se.submittedAt >= periodStart &&
          se.submittedAt < periodEnd,
      );

      const periodScores = periodExams.map((se) => se.score || 0);
      const avgScore = periodScores.length
        ? periodScores.reduce((a, b) => a + b, 0) / periodScores.length
        : 0;
      averageScores.push(Math.round(avgScore * 100) / 100);

      const practiceExams = periodExams.filter(
        (se) => se.exam.examType === 'practice',
      );
      const practiceScoresList = practiceExams.map((se) => se.score || 0);
      const avgPracticeScore = practiceScoresList.length
        ? practiceScoresList.reduce((a, b) => a + b, 0) /
          practiceScoresList.length
        : 0;
      practiceScores.push(Math.round(avgPracticeScore * 100) / 100);

      const officialExams = periodExams.filter(
        (se) => se.exam.examType === 'official',
      );
      const officialScoresList = officialExams.map(se => se.score || 0);
      const avgOfficialScore = officialScoresList.length
        ? officialScoresList.reduce((a, b) => a + b, 0) /
          officialScoresList.length
        : 0;
      officialScores.push(Math.round(avgOfficialScore * 100) / 100);

      // Determine pass threshold based on score scale
      const maxScoreInPeriod = Math.max(...periodScores, 0);
      const passThreshold = maxScoreInPeriod > 10 ? 50.0 : 5.0; // 50/100 or 5/10

      const passedExams = periodScores.filter(
        (score) => score >= passThreshold,
      ).length;
      const passRate = periodScores.length
        ? (passedExams / periodScores.length) * 100
        : 0;
      passRates.push(Math.round(passRate * 100) / 100);
    }

    // Reverse arrays to show chronological order (oldest to newest)
    const result = {
      labels: labels.reverse(),
      datasets: {
        averageScores: averageScores.reverse(),
        practiceScores: practiceScores.reverse(),
        officialScores: officialScores.reverse(),
        passRates: passRates.reverse(),
      },
    };

    // Cache the result
    await this.analyticsCacheService.setCachedScoreTrends(query, result);
    this.logger.log('Score trends cached successfully');

    return result;
  }

  // 3. Subject Performance Analytics
  async getSubjectPerformance(
    query: SubjectPerformanceQueryDto,
  ): Promise<SubjectPerformanceResponse> {
    // Check cache first
    const cachedResult = await this.analyticsCacheService.getCachedSubjectPerformance(query);
    if (cachedResult) {
      this.logger.log('Returning cached subject performance');
      return cachedResult;
    }

    this.logger.log('Computing subject performance from database');
    const where: any = { isSubmitted: true };
    const relations = ['exam', 'exam.subject', 'student', 'student.class'];

    if (query.classIds?.length) {
      where.student = { class: { id: In(query.classIds) } };
    }
    if (query.examType && query.examType !== ExamTypeEnum.ALL) {
      where.exam = { examType: query.examType };
    }
    if (query.startDate || query.endDate) {
      const dateConditions: any = {};
      if (query.startDate) dateConditions.gte = new Date(query.startDate);
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateConditions.lte = endDate;
      }
      where.submittedAt = Between(dateConditions.gte, dateConditions.lte);
    }

    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    // Group by subject
    const subjectMap = new Map<
      number,
      {
        id: number;
        name: string;
        scores: number[];
        totalExams: number;
        students: Set<number>;
      }
    >();

    studentExams.forEach((se) => {
      const subjectId = se.exam.subject.id;
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          id: subjectId,
          name: se.exam.subject.name,
          scores: [],
          totalExams: 0,
          students: new Set(),
        });
      }

      const subjectData = subjectMap.get(subjectId)!;
      subjectData.scores.push(se.score || 0);
      subjectData.totalExams++;
      subjectData.students.add(se.student.id);
    });

    // Calculate metrics for each subject
    const subjects = Array.from(subjectMap.values()).map((subjectData) => {
      const averageScore =
        subjectData.scores.reduce((a, b) => a + b, 0) /
        subjectData.scores.length;

      // Determine pass threshold based on score scale
      const maxScore = Math.max(...subjectData.scores, 0);
      const passThreshold = maxScore > 10 ? 50.0 : 5.0; // 50/100 or 5/10

      const passedExams = subjectData.scores.filter(
        (score) => score >= passThreshold,
      ).length;
      const passRate = (passedExams / subjectData.scores.length) * 100;

      let difficulty: 'easy' | 'medium' | 'hard';
      if (passRate >= 80) difficulty = 'easy';
      else if (passRate >= 60) difficulty = 'medium';
      else difficulty = 'hard';

      // For trend calculation, we'll use a simple logic (you can enhance this)
      const trend: 'up' | 'down' | 'stable' = 'stable';

      return {
        id: subjectData.id,
        name: subjectData.name,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        totalExams: subjectData.totalExams,
        totalStudents: subjectData.students.size,
        difficulty,
        trend,
      };
    });

    // Sort subjects
    const sortBy = query.sortBy || 'score';
    const sortOrder = query.sortOrder || SortOrderEnum.DESC;

    subjects.sort((a, b) => {
      let valueA: number, valueB: number;

      switch (sortBy) {
        case 'passRate':
          valueA = a.passRate;
          valueB = b.passRate;
          break;
        case 'examCount':
          valueA = a.totalExams;
          valueB = b.totalExams;
          break;
        default: // score
          valueA = a.averageScore;
          valueB = b.averageScore;
      }

      return sortOrder === SortOrderEnum.ASC
        ? valueA - valueB
        : valueB - valueA;
    });

    const result = { subjects };

    // Cache the result
    await this.analyticsCacheService.setCachedSubjectPerformance(query, result);
    this.logger.log('Subject performance cached successfully');

    return result;
  }

  // 4. Score Distribution Analytics
  async getScoreDistribution(
    query: ScoreDistributionQueryDto,
  ): Promise<ScoreDistributionResponse> {
    // Check cache first
    const cachedResult = await this.analyticsCacheService.getCachedScoreDistribution(query);
    if (cachedResult) {
      this.logger.log('Returning cached score distribution');
      return cachedResult;
    }

    const { where, relations } = this.buildBaseWhereConditions(query);

    if (query.classIds?.length) {
      where.student = { ...where.student, class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { ...where.exam, subject: { id: In(query.subjectIds) } };
    }
    if (query.studentIds?.length) {
      where.student = { ...where.student, id: In(query.studentIds) };
    }

    where.isSubmitted = true;

    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    const scores = studentExams.map((se) => se.score || 0);
    const binSize = query.binSize || 1;

    // Determine score scale dynamically
    const maxScore = Math.max(...scores, 0);
    const isScaleOf100 = maxScore > 10;
    const scaleMax = isScaleOf100 ? 100 : 10;
    const actualBinSize = isScaleOf100 ? binSize * 10 : binSize;

    // Create histogram
    const histogram: {
      range: string;
      count: number;
      percentage: number;
      color: string;
    }[] = [];
    const colors = [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#22c55e',
      '#3b82f6',
      '#8b5cf6',
    ];

    const numberOfBins = Math.ceil(scaleMax / actualBinSize);
    for (let i = 0; i < numberOfBins; i++) {
      const min = i * actualBinSize;
      const max = Math.min((i + 1) * actualBinSize, scaleMax);
      const count = scores.filter(
        (score) => score >= min && (i === numberOfBins - 1 ? score <= max : score < max),
      ).length;
      const percentage = scores.length ? (count / scores.length) * 100 : 0;

      histogram.push({
        range: `${min}-${max}`,
        count,
        percentage: Math.round(percentage * 100) / 100,
        color: colors[i % colors.length],
      });
    }

    // Calculate statistics
    const sortedScores = [...scores].sort((a, b) => a - b);
    const mean = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const median = sortedScores.length
      ? sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    // Mode calculation
    const frequency = new Map<number, number>();
    scores.forEach(score => {
      const rounded = Math.round(score);
      frequency.set(rounded, (frequency.get(rounded) || 0) + 1);
    });
    const mode = Array.from(frequency.entries()).reduce(
      (a, b) => (a[1] > b[1] ? a : b),
      [0, 0],
    )[0];

    // Standard deviation
    const variance = scores.length
      ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
        scores.length
      : 0;
    const standardDeviation = Math.sqrt(variance);

    // Quartiles
    const q1 = sortedScores.length
      ? sortedScores[Math.floor(sortedScores.length * 0.25)]
      : 0;
    const q3 = sortedScores.length
      ? sortedScores[Math.floor(sortedScores.length * 0.75)]
      : 0;
    const iqr = q3 - q1;

    // Outliers
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const lowerOutliers = scores.filter((score) => score < lowerBound);
    const upperOutliers = scores.filter((score) => score > upperBound);

    const result = {
      histogram,
      statistics: {
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        mode: Math.round(mode * 100) / 100,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        skewness: 0, // Simplified - can be calculated properly if needed
        kurtosis: 0, // Simplified - can be calculated properly if needed
      },
      quartiles: {
        q1: Math.round(q1 * 100) / 100,
        q2: Math.round(median * 100) / 100,
        q3: Math.round(q3 * 100) / 100,
        iqr: Math.round(iqr * 100) / 100,
      },
      outliers: {
        lower: lowerOutliers.map((score) => Math.round(score * 100) / 100),
        upper: upperOutliers.map((score) => Math.round(score * 100) / 100),
      },
    };

    // Cache the result
    await this.analyticsCacheService.setCachedScoreDistribution(query, result);
    this.logger.log('Score distribution cached successfully');

    return result;
  }

  // 10. Exam Volume Analysis
  async getExamVolume(
    query: ExamVolumeQueryDto,
  ): Promise<ExamVolumeResponseDto> {
    // Check cache first
    const cachedResult = await this.analyticsCacheService.getCachedExamVolume(query);
    if (cachedResult) {
      this.logger.log('Returning cached exam volume data');
      return cachedResult;
    }
    // 1. Determine date range
    const dateRange = this.getExamVolumeDateRange(query);
    const groupBy = query.groupBy || 'daily';

    // 2. Build base where conditions using the same method as summary
    const baseQuery = {
      startDate: dateRange.start,
      endDate: dateRange.end,
      examType: undefined, // Don't filter by examType in base query
    };

    const { where, relations } = this.buildBaseWhereConditions(baseQuery);

    // 3. Add specific filters like in getAnalyticsSummary
    if (query.classIds?.length) {
      where.student = { ...where.student, class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { ...where.exam, subject: { id: In(query.subjectIds) } };
    }
    if (query.studentIds?.length) {
      where.student = { ...where.student, id: In(query.studentIds) };
    }

    // 4. Get submitted exams only (same as summary)
    where.isSubmitted = true;

    // 5. Handle specific date override
    if (query.specificDate) {
      const startOfDay = new Date(query.specificDate);
      const endOfDay = new Date(query.specificDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.submittedAt = Between(startOfDay, endOfDay);
    }

    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    // 7. Filter by exam type after query (like summary does)
    const filteredExams =
      query.examType === 'all' || !query.examType
        ? studentExams
        : studentExams.filter((se) => se.exam.examType === query.examType);

    // 8. Group data by time periods (only if date range is specified)
    const dataPoints =
      dateRange.start && dateRange.end
        ? this.groupExamVolumeByTime(
            filteredExams,
            groupBy,
            dateRange as { start: string; end: string },
          )
        : [];

    // 9. Calculate summary
    const practiceExams = filteredExams.filter(
      (se) => se.exam.examType === 'practice',
    );
    const officialExams = filteredExams.filter(
      (se) => se.exam.examType === 'official',
    );

    // Calculate days only if date range is specified
    const totalDays =
      dateRange.start && dateRange.end
        ? this.calculateDaysBetween(dateRange.start, dateRange.end) + 1
        : 1;
    const summary: ExamVolumeSummary = {
      totalPractice: practiceExams.length,
      totalOfficial: officialExams.length,
      totalExams: filteredExams.length,
      averagePerDay: Math.round((filteredExams.length / totalDays) * 100) / 100,
    };

    const result = {
      success: true,
      summary,
      data: dataPoints,
      filters: {
        examType: query.examType || 'all',
        dateRange: {
          startDate: dateRange.start || 'all-time',
          endDate: dateRange.end || 'all-time',
        },
        classIds: query.classIds,
        subjectIds: query.subjectIds,
        studentIds: query.studentIds,
        groupBy,
      },
    };

    // Cache the result
    await this.analyticsCacheService.setCachedExamVolume(query, result);
    this.logger.log('Exam volume data cached successfully');

    return result;
  }

  // 11. Score Statistics Analysis
  async getScoreStatistics(
    query: ScoreStatisticsQueryDto,
  ): Promise<ScoreStatisticsResponseDto> {
    // Check cache first
    const cachedResult = await this.analyticsCacheService.getCachedScoreStatistics(query);
    if (cachedResult) {
      this.logger.log('Returning cached score statistics data');
      return cachedResult;
    }

    this.logger.log('Computing score statistics from database');

    // 1. Determine date range (reuse exam volume logic)
    const dateRange = this.getExamVolumeDateRange(query);
    const groupBy = query.groupBy || 'daily';

    // 2. Build base where conditions
    const baseQuery = {
      startDate: dateRange.start,
      endDate: dateRange.end,
      examType: undefined,
    };

    const { where, relations } = this.buildBaseWhereConditions(baseQuery);

    // 3. Add specific filters
    if (query.classIds?.length) {
      where.student = { ...where.student, class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { ...where.exam, subject: { id: In(query.subjectIds) } };
    }
    if (query.studentIds?.length) {
      where.student = { ...where.student, id: In(query.studentIds) };
    }

    // 4. Get submitted exams only
    where.isSubmitted = true;

    // 5. Handle specific date override
    if (query.specificDate) {
      const startOfDay = new Date(query.specificDate);
      const endOfDay = new Date(query.specificDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.submittedAt = Between(startOfDay, endOfDay);
    }

    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    // 6. Filter by exam type after query
    const filteredExams =
      query.examType === 'all' || !query.examType
        ? studentExams
        : studentExams.filter((se) => se.exam.examType === query.examType);

    // 7. Group data by time periods for score statistics
    const dataPoints =
      dateRange.start && dateRange.end
        ? this.groupScoreStatisticsByTime(
            filteredExams,
            groupBy,
            dateRange as { start: string; end: string },
          )
        : [];

    // 8. Calculate summary statistics
    const summary = this.calculateScoreStatisticsSummary(filteredExams);

    // 9. Generate insights
    const insights = this.generateScoreStatisticsInsights(filteredExams, summary);

    const result = {
      success: true,
      summary,
      data: dataPoints,
      filters: {
        examType: query.examType || 'all',
        dateRange: {
          startDate: dateRange.start || 'all-time',
          endDate: dateRange.end || 'all-time',
        },
        classIds: query.classIds,
        subjectIds: query.subjectIds,
        studentIds: query.studentIds,
        groupBy: groupBy,
      },
      insights,
    };

    // Cache the result
    await this.analyticsCacheService.setCachedScoreStatistics(query, result);

    return result;
  }

  // 12. Top Students Analysis
  async getTopStudents(
    query: TopStudentsQueryDto,
  ): Promise<TopStudentsResponseDto> {
    // Check cache first
    const cachedResult =
      await this.analyticsCacheService.getCachedTopStudents(query);
    if (cachedResult) {
      this.logger.log('Returning cached top students data');
      return cachedResult;
    }

    this.logger.log('Computing top students from database');

    // 1. Build base where conditions for official exams only
    const baseQuery = {
      startDate: query.startDate,
      endDate: query.endDate,
      examType: ExamTypeEnum.OFFICIAL, // Chỉ lấy đề thi chính thức
    };

    const { where, relations } = this.buildBaseWhereConditions(baseQuery);

    // 2. Add specific filters
    if (query.classIds?.length) {
      where.student = { ...where.student, class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { ...where.exam, subject: { id: In(query.subjectIds) } };
    }

    // 3. Get submitted official exams only
    where.isSubmitted = true;

    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    this.logger.log(
      `Found ${studentExams.length} official exams for top students analysis`,
    );

    // 4. Group by student and calculate statistics
    const studentStatsMap = new Map<
      string,
      {
        student: any;
        totalScore: number;
        examCount: number;
      }
    >();

    studentExams.forEach((se) => {
      const studentCode = se.student.studentCode; // Sử dụng studentCode thay vì studentId
      if (!studentStatsMap.has(studentCode)) {
        studentStatsMap.set(studentCode, {
          student: se.student,
          totalScore: 0,
          examCount: 0,
        });
      }

      const studentData = studentStatsMap.get(studentCode)!;
      studentData.totalScore += se.score || 0;
      studentData.examCount++;
    });

    // 5. Convert to TopStudentItem array and sort
    const allStudents: TopStudentItem[] = [];
    studentStatsMap.forEach((data, studentCode) => {
      const averageScore = data.totalScore / data.examCount;

      allStudents.push({
        rank: 0, // Will be set later
        studentId: studentCode,
        studentName: data.student.fullName, // Sử dụng fullName
        className: data.student.class?.name || 'N/A',
        averageScore: Math.round(averageScore * 100) / 100,
        examCount: data.examCount,
      });
    });

    // 6. Sort by average score and get top N
    const limit = query.limit || 10;
    const topStudents = allStudents
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
      }));

    const result = {
      success: true,
      data: topStudents,
    };

    // Cache the result
    await this.analyticsCacheService.setCachedTopStudents(query, result);
    this.logger.log('Top students data cached successfully');

    return result;
  }

  // =================== FAILING STUDENTS ===================

  async getFailingStudents(
    query: FailingStudentsQueryDto,
  ): Promise<FailingStudentsResponseDto> {
    // Check cache first
    const cachedResult = await this.analyticsCacheService.getCachedFailingStudents(query);
    if (cachedResult) {
      this.logger.log('Returning cached failing students data');
      return cachedResult;
    }

    this.logger.log('Computing failing students from database');

    // 1. Build base where conditions for official exams only
    const baseQuery = {
      startDate: query.startDate,
      endDate: query.endDate,
      examType: ExamTypeEnum.OFFICIAL, // Chỉ lấy đề thi chính thức
    };

    // Handle specific date
    if (query.specificDate) {
      baseQuery.startDate = query.specificDate;
      baseQuery.endDate = query.specificDate;
    }

    const { where, relations } = this.buildBaseWhereConditions(baseQuery);

    // 2. Add specific filters
    if (query.classIds?.length) {
      where.student = { ...where.student, class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { ...where.exam, subject: { id: In(query.subjectIds) } };
    }

    // 3. Get submitted official exams only
    where.isSubmitted = true;


    const studentExams = await this.studentExamsRepository.find({
      where,
      relations,
    });

    // 4. Filter failing students based on absolute score criteria
    const passingScore = 50; // Điểm tuyệt đối để đạt
    const severeFailureScore = 30; // Dưới 30 điểm là severe failure

    let failingExams = studentExams.filter((se) => {
      const score = se.score || 0;
      return score < passingScore;
    });

    const scoreDistribution = new Map<number, number>();
    failingExams.forEach(se => {
      const score = se.score || 0;
      scoreDistribution.set(score, (scoreDistribution.get(score) || 0) + 1);
    });

    // 5. Apply failure level filter
    if (query.failureLevel && query.failureLevel !== FailureLevelEnum.ALL) {
      if (query.failureLevel === FailureLevelEnum.SEVERE) {
        failingExams = failingExams.filter((se) => {
          const score = se.score || 0;
          return score < severeFailureScore;
        });
      } else if (query.failureLevel === FailureLevelEnum.MODERATE) {
        failingExams = failingExams.filter((se) => {
          const score = se.score || 0;
          return score >= severeFailureScore && score < passingScore;
        });
      }
    }

    // 6. Convert to FailingStudentItem array
    const failingStudents: FailingStudentItem[] = failingExams.map((se) => {
      const score = se.score || 0;
      const maxScore = Number(se.exam.maxScore) || 100;
      const failureLevel = score < severeFailureScore ? 'severe' : 'moderate';

      return {
        studentId: se.student.studentCode,
        studentName: se.student.fullName,
        className: se.student.class?.name || 'N/A',
        examName: se.exam.name,
        subject: se.exam.subject?.name || 'N/A',
        score,
        maxScore,
        examDate: se.submittedAt?.toISOString() || new Date().toISOString(),
        examType: se.exam.examType as 'practice' | 'official',
        failureLevel: failureLevel as 'severe' | 'moderate',
      };
    });

    // 7. Sort by score (optional)
    if (query.sortByScore) {
      failingStudents.sort((a, b) => {
        if (query.sortByScore === 'asc') {
          return a.score - b.score; // Worst scores first
        }
        return b.score - a.score; // Highest failing scores first
      });
    }
    // No sorting by default - return in original order

    // 8. Pagination
    const page = query.page || 1;
    const limit = query.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = failingStudents.slice(startIndex, endIndex);

    // 9. Calculate summary statistics
    const totalFailingStudents = failingStudents.length;
    const severeFailures = failingStudents.filter(fs => fs.failureLevel === 'severe').length;
    const moderateFailures = failingStudents.filter(fs => fs.failureLevel === 'moderate').length;
    const averageFailingScore =
      totalFailingStudents > 0
        ? failingStudents.reduce((sum, fs) => sum + fs.score, 0) /
          totalFailingStudents
        : 0;

    // Most failed subject
    const subjectFailureCounts = new Map<string, number>();
    failingStudents.forEach(fs => {
      const count = subjectFailureCounts.get(fs.subject) || 0;
      subjectFailureCounts.set(fs.subject, count + 1);
    });

    let mostFailedSubject = { name: 'N/A', failureCount: 0 };
    subjectFailureCounts.forEach((count, subject) => {
      if (count > mostFailedSubject.failureCount) {
        mostFailedSubject = { name: subject, failureCount: count };
      }
    });

    // Most failed class
    const classFailureCounts = new Map<string, number>();
    failingStudents.forEach(fs => {
      const count = classFailureCounts.get(fs.className) || 0;
      classFailureCounts.set(fs.className, count + 1);
    });

    let mostFailedClass = { name: 'N/A', failureCount: 0 };
    classFailureCounts.forEach((count, className) => {
      if (count > mostFailedClass.failureCount) {
        mostFailedClass = { name: className, failureCount: count };
      }
    });

    const result: FailingStudentsResponseDto = {
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFailingStudents / limit),
        totalItems: totalFailingStudents,
        itemsPerPage: limit,
      },
      summary: {
        totalFailingStudents,
        severeFailures,
        moderateFailures,
      },
      filters: {
        classIds: query.classIds,
        subjectIds: query.subjectIds,
        specificDate: query.specificDate,
        startDate: query.startDate,
        endDate: query.endDate,
        failureLevel: query.failureLevel,
      },
    };

    // Cache the result
    await this.analyticsCacheService.setCachedFailingStudents(query, result);

    return result;
  }

  // =================== HELPER METHODS FOR EXAM VOLUME ===================

  private getExamVolumeDateRange(query: ExamVolumeQueryDto): {
    start: string | undefined;
    end: string | undefined;
  } {
    if (query.specificDate) {
      return { start: query.specificDate, end: query.specificDate };
    }
    if (query.startDate && query.endDate) {
      return { start: query.startDate, end: query.endDate };
    }
    // No default date range - return undefined to match summary behavior
    return { start: undefined, end: undefined };
  }

  private groupExamVolumeByTime(
    studentExams: any[],
    groupBy: 'daily' | 'weekly' | 'monthly',
    dateRange: { start: string; end: string },
  ): ExamVolumeDataPoint[] {
    const dataPoints: ExamVolumeDataPoint[] = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    // Generate time slots
    const timeSlots = this.generateTimeSlots(start, end, groupBy);

    timeSlots.forEach((slot) => {
      const slotExams = studentExams.filter(exam => {
        const examDate = new Date(exam.submittedAt);
        return examDate >= slot.start && examDate <= slot.end;
      });

      const practiceCount = slotExams.filter(se => se.exam.examType === 'practice').length;
      const officialCount = slotExams.filter(se => se.exam.examType === 'official').length;
      const totalCount = slotExams.length;

      dataPoints.push({
        date: slot.label,
        practiceCount,
        officialCount,
        totalCount,
      });
    });

    return dataPoints;
  }

  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private groupExamsByTimeAndType(
    studentExams: any[],
    granularity: string,
    dateRange: { start: string; end: string },
  ) {
    const labels: string[] = [];
    const practiceExams: number[] = [];
    const officialExams: number[] = [];
    const totalExams: number[] = [];
    const practicePercentage: number[] = [];
    const officialPercentage: number[] = [];

    // Generate time labels based on granularity
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    const timeSlots = this.generateTimeSlots(start, end, granularity);

    timeSlots.forEach((slot) => {
      const slotExams = studentExams.filter((exam) => {
        const examDate = new Date(exam.submittedAt);
        return examDate >= slot.start && examDate <= slot.end;
      });

      const practiceCount = slotExams.filter(
        (exam) => exam.exam.examType === 'practice',
      ).length;
      const officialCount = slotExams.filter(
        (exam) => exam.exam.examType === 'official',
      ).length;
      const total = practiceCount + officialCount;

      labels.push(slot.label);
      practiceExams.push(practiceCount);
      officialExams.push(officialCount);
      totalExams.push(total);
      practicePercentage.push(total > 0 ? (practiceCount / total) * 100 : 0);
      officialPercentage.push(total > 0 ? (officialCount / total) * 100 : 0);
    });

    return {
      labels,
      practiceExams,
      officialExams,
      totalExams,
      practicePercentage,
      officialPercentage,
    };
  }

  private generateTimeSlots(
    start: Date,
    end: Date,
    granularity: string,
  ): Array<{
    start: Date;
    end: Date;
    label: string;
  }> {
    const slots: Array<{ start: Date; end: Date; label: string }> = [];
    const current = new Date(start);

    while (current <= end) {
      const slotStart = new Date(current);
      let slotEnd: Date;
      let label: string;

      switch (granularity) {
        case 'daily':
          slotEnd = new Date(current);
          slotEnd.setHours(23, 59, 59, 999);
          label = current.toLocaleDateString('vi-VN');
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          slotEnd = new Date(current);
          slotEnd.setDate(current.getDate() + 6);
          slotEnd.setHours(23, 59, 59, 999);
          label = `Tuần ${this.getWeekNumber(current)}`;
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          // For monthly, we need to handle partial months correctly
          slotEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          slotEnd.setHours(23, 59, 59, 999);

          // If this is the last month and endDate is before month end, use endDate
          if (slotEnd > end) {
            slotEnd = new Date(end);
            slotEnd.setHours(23, 59, 59, 999);
          }

          label = `${current.getMonth() + 1}/${current.getFullYear()}`;

          // Move to first day of next month
          current.setMonth(current.getMonth() + 1);
          current.setDate(1);
          break;
        default:
          slotEnd = new Date(current);
          label = current.toLocaleDateString('vi-VN');
          current.setDate(current.getDate() + 1);
      }

      slots.push({ start: slotStart, end: slotEnd, label });
    }

    return slots;
  }

  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  private async getExamVolumeComparison(
    query: ExamVolumeQueryDto,
    currentRange: { start: string; end: string },
    granularity: string,
  ) {
    // Calculate previous period
    const start = new Date(currentRange.start);
    const end = new Date(currentRange.end);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - diffDays);

    // Get previous period data
    const prevQuery = {
      ...query,
      startDate: prevStart.toISOString().split('T')[0],
      endDate: prevEnd.toISOString().split('T')[0],
    };

    const prevDateRange = { 
      start: prevStart.toISOString().split('T')[0], 
      end: prevEnd.toISOString().split('T')[0] 
    };

    // Build where conditions for previous period
    const where: any = { isSubmitted: true };
    where.submittedAt = Between(prevStart, prevEnd);

    if (query.classIds?.length) {
      where.student = { class: { id: In(query.classIds) } };
    }
    if (query.subjectIds?.length) {
      where.exam = { subject: { id: In(query.subjectIds) } };
    }
    if (query.studentIds?.length) {
      where.student = { ...where.student, id: In(query.studentIds) };
    }

    const prevStudentExams = await this.studentExamsRepository.find({
      where,
      relations: ['exam', 'exam.subject', 'student', 'student.class'],
    });

    const prevGroupedData = this.groupExamsByTimeAndType(
      prevStudentExams,
      granularity,
      prevDateRange,
    );

    // Calculate changes
    const currentTotal = prevGroupedData.totalExams.reduce((a, b) => a + b, 0);
    const prevTotal = prevGroupedData.totalExams.reduce((a, b) => a + b, 0);
    const currentPractice = prevGroupedData.practiceExams.reduce(
      (a, b) => a + b,
      0,
    );
    const prevPractice = prevGroupedData.practiceExams.reduce(
      (a, b) => a + b,
      0,
    );
    const currentOfficial = prevGroupedData.officialExams.reduce(
      (a, b) => a + b,
      0,
    );
    const prevOfficial = prevGroupedData.officialExams.reduce(
      (a, b) => a + b,
      0,
    );

    return {
      ...prevGroupedData,
      changes: {
        practiceChange:
          prevPractice > 0
            ? ((currentPractice - prevPractice) / prevPractice) * 100
            : 0,
        officialChange:
          prevOfficial > 0
            ? ((currentOfficial - prevOfficial) / prevOfficial) * 100
            : 0,
        totalChange: prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0,
        },
    };
  }

  private calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid);
    const secondHalf = data.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.1) return 'increasing';
    if (secondAvg < firstAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  // =================== HELPER METHODS FOR SCORE STATISTICS ===================

  private groupScoreStatisticsByTime(
    studentExams: any[],
    groupBy: 'daily' | 'weekly' | 'monthly',
    dateRange: { start: string; end: string },
  ): ScoreStatisticsDataPoint[] {
    const dataPoints: ScoreStatisticsDataPoint[] = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    // Generate time slots (reuse existing method)
    const timeSlots = this.generateTimeSlots(start, end, groupBy);

    timeSlots.forEach((slot) => {
      const slotExams = studentExams.filter(exam => {
        const examDate = new Date(exam.submittedAt);
        return examDate >= slot.start && examDate <= slot.end;
      });

      // Separate by exam type
      const practiceExams = slotExams.filter(se => se.exam.examType === 'practice');
      const officialExams = slotExams.filter(se => se.exam.examType === 'official');
      
      // Calculate statistics for practice exams
      const practiceStats = this.calculateStatsForExams(practiceExams);
      
      // Calculate statistics for official exams
      const officialStats = this.calculateStatsForExams(officialExams);
      
      // Calculate overall statistics
      const overallStats = this.calculateStatsForExams(slotExams);

      dataPoints.push({
        date: slot.label,
        practiceStats,
        officialStats,
        overallStats,
      });
    });

    return dataPoints;
  }

  private calculateStatsForExams(exams: any[]): {
    averageScore: number;
    minScore: number;
    maxScore: number;
    count: number;
    standardDeviation: number;
  } {
    if (exams.length === 0) {
      return {
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        count: 0,
        standardDeviation: 0,
      };
    }

    const scores = exams.map(exam => exam.score || 0);
    const count = scores.length;
    const averageScore = scores.reduce((a, b) => a + b, 0) / count;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    
    // Calculate standard deviation
    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score - averageScore, 2);
    }, 0) / count;
    const standardDeviation = Math.sqrt(variance);

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      minScore,
      maxScore,
      count,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
    };
  }

  private calculateScoreDistribution(scores: number[]): {
    excellent: number;
    good: number;
    average: number;
    belowAverage: number;
    poor: number;
  } {
    if (scores.length === 0) {
      return { excellent: 0, good: 0, average: 0, belowAverage: 0, poor: 0 };
    }

    const excellent = scores.filter(s => s >= 90).length;
    const good = scores.filter(s => s >= 80 && s < 90).length;
    const average = scores.filter(s => s >= 70 && s < 80).length;
    const belowAverage = scores.filter(s => s >= 60 && s < 70).length;
    const poor = scores.filter(s => s < 60).length;

    return { excellent, good, average, belowAverage, poor };
  }

  private calculateScoreStatisticsSummary(studentExams: any[]): ScoreStatisticsSummary {
    // Separate by exam type
    const practiceExams = studentExams.filter(se => se.exam.examType === 'practice');
    const officialExams = studentExams.filter(se => se.exam.examType === 'official');

    // Calculate practice exam statistics
    const practiceStats = this.calculateStatsForExams(practiceExams);
    const practiceScores = practiceExams.map(exam => exam.score || 0);
    const practiceDistribution = this.calculateScoreDistribution(practiceScores);

    // Calculate official exam statistics
    const officialStats = this.calculateStatsForExams(officialExams);
    const officialScores = officialExams.map(exam => exam.score || 0);
    const officialDistribution = this.calculateScoreDistribution(officialScores);

    // Calculate comparison
    const averageScoreDifference = practiceStats.averageScore - officialStats.averageScore;
    
    let performanceTrend: 'practice_better' | 'official_better' | 'similar';
    if (Math.abs(averageScoreDifference) < 2) {
      performanceTrend = 'similar';
    } else if (averageScoreDifference > 0) {
      performanceTrend = 'practice_better';
    } else {
      performanceTrend = 'official_better';
    }

    let consistencyComparison: 'practice_more_consistent' | 'official_more_consistent' | 'similar';
    const consistencyDiff = practiceStats.standardDeviation - officialStats.standardDeviation;
    if (Math.abs(consistencyDiff) < 1) {
      consistencyComparison = 'similar';
    } else if (consistencyDiff < 0) {
      consistencyComparison = 'practice_more_consistent';
    } else {
      consistencyComparison = 'official_more_consistent';
    }

    return {
      practiceExams: {
        totalCount: practiceStats.count,
        averageScore: practiceStats.averageScore,
        minScore: practiceStats.minScore,
        maxScore: practiceStats.maxScore,
        standardDeviation: practiceStats.standardDeviation,
        scoreDistribution: practiceDistribution,
      },
      officialExams: {
        totalCount: officialStats.count,
        averageScore: officialStats.averageScore,
        minScore: officialStats.minScore,
        maxScore: officialStats.maxScore,
        standardDeviation: officialStats.standardDeviation,
        scoreDistribution: officialDistribution,
      },
      comparison: {
        averageScoreDifference: Math.round(averageScoreDifference * 100) / 100,
        performanceTrend,
        consistencyComparison,
      },
    };
  }

  private generateScoreStatisticsInsights(studentExams: any[], summary: ScoreStatisticsSummary): {
    scoreImprovement: string;
    consistencyAnalysis: string;
    recommendations: string[];
  } {
    const insights = {
      scoreImprovement: '',
      consistencyAnalysis: '',
      recommendations: [] as string[],
    };

    // Score improvement analysis
    if (summary.comparison.performanceTrend === 'practice_better') {
      insights.scoreImprovement = `Học sinh có điểm số tốt hơn ở bài luyện tập (${summary.practiceExams.averageScore.toFixed(1)}) so với bài chính thức (${summary.officialExams.averageScore.toFixed(1)})`;
    } else if (summary.comparison.performanceTrend === 'official_better') {
      insights.scoreImprovement = `Học sinh có điểm số tốt hơn ở bài chính thức (${summary.officialExams.averageScore.toFixed(1)}) so với bài luyện tập (${summary.practiceExams.averageScore.toFixed(1)})`;
    } else {
      insights.scoreImprovement = `Điểm số giữa bài luyện tập và chính thức khá tương đương (chênh lệch ${Math.abs(summary.comparison.averageScoreDifference).toFixed(1)} điểm)`;
    }

    // Consistency analysis
    if (summary.comparison.consistencyComparison === 'practice_more_consistent') {
      insights.consistencyAnalysis = `Học sinh có độ ổn định cao hơn ở bài luyện tập (độ lệch chuẩn: ${summary.practiceExams.standardDeviation}) so với bài chính thức (${summary.officialExams.standardDeviation})`;
    } else if (summary.comparison.consistencyComparison === 'official_more_consistent') {
      insights.consistencyAnalysis = `Học sinh có độ ổn định cao hơn ở bài chính thức (độ lệch chuẩn: ${summary.officialExams.standardDeviation}) so với bài luyện tập (${summary.practiceExams.standardDeviation})`;
    } else {
      insights.consistencyAnalysis = `Độ ổn định điểm số giữa bài luyện tập và chính thức khá tương đương`;
    }

    // Recommendations
    if (summary.comparison.performanceTrend === 'practice_better') {
      insights.recommendations.push(
        'Cần tăng cường độ khó của bài luyện tập để chuẩn bị tốt hơn cho bài chính thức',
      );
    }

    if (summary.comparison.performanceTrend === 'official_better') {
      insights.recommendations.push(
        'Khuyến khích học sinh luyện tập nhiều hơn để cải thiện hiệu suất',
      );
    }

    if (summary.practiceExams.standardDeviation > 15) {
      insights.recommendations.push(
        'Điểm số bài luyện tập có độ phân tán cao, cần hỗ trợ học sinh yếu hơn',
      );
    }

    if (summary.officialExams.standardDeviation > 15) {
      insights.recommendations.push(
        'Điểm số bài chính thức có độ phân tán cao, cần đánh giá lại độ khó của đề thi',
      );
    }

    if (summary.practiceExams.averageScore < 70) {
      insights.recommendations.push(
        'Điểm trung bình bài luyện tập thấp, cần xem xét chất lượng nội dung và phương pháp giảng dạy',
      );
    }

    return insights;
  }


}
