import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentExams } from '../../database/entities/StudentExams';
import { Exams } from '../../database/entities/Exams';
import { Students } from '../../database/entities/Students';
import { Classes } from '../../database/entities/Classes';
import { StudentAnswers } from '../../database/entities/StudentAnswers';
import { Questions } from '../../database/entities/Questions';

@Injectable()
export class ReportService {
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
  ) {}

  // Báo cáo tổng quan cho quản lý/giảng viên
  async getOverviewReport(examId?: number, isPractice?: boolean) {
    const query = this.studentExamsRepository
      .createQueryBuilder('studentExams')
      .leftJoinAndSelect('studentExams.exam', 'exam')
      .leftJoinAndSelect('studentExams.student', 'student')
      .leftJoinAndSelect('student.class', 'class')
      .where('studentExams.isSubmitted = :isSubmitted', { isSubmitted: true });

    if (examId) {
      query.andWhere('studentExams.exam_id = :examId', { examId });
    }
    if (isPractice !== undefined) {
      query.andWhere('exam.isPractice = :isPractice', { isPractice });
    }

    const studentExams = await query.getMany();
    const totalStudents = studentExams.length;
    const scores = studentExams
      .map((se) => se.score)
      .filter((score) => score !== null);
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passingThreshold = 5; // Có thể điều chỉnh
    const passingStudents = scores.filter(
      (score) => score >= passingThreshold,
    ).length;
    const passingRate =
      scores.length > 0 ? (passingStudents / scores.length) * 100 : 0;
    const standardDeviation = this.calculateStandardDeviation(scores);
    const scoreDistribution = this.calculateScoreDistribution(scores);

    return {
      totalStudents,
      averageScore,
      highestScore,
      lowestScore,
      passingRate,
      passingThreshold,
      standardDeviation,
      scoreDistribution, // Dữ liệu để vẽ histogram hoặc boxplot
    };
  }

  // So sánh đề thi thử và đề thi thật
  async getPracticeVsRealComparison() {
    const practiceReport = await this.getOverviewReport(undefined, true);
    const realReport = await this.getOverviewReport(undefined, false);

    return {
      practice: practiceReport,
      real: realReport,
      comparison: {
        averageScoreDifference: realReport.averageScore - practiceReport.averageScore,
        passingRateDifference: realReport.passingRate - practiceReport.passingRate,
      },
    };
  }

  // Báo cáo chi tiết cho giảng viên - Phân tích từng câu hỏi
  async getQuestionAnalysisReport(examId: number) {
    const studentAnswers = await this.studentAnswersRepository
      .createQueryBuilder('studentAnswers')
      .leftJoinAndSelect('studentAnswers.question', 'question')
      .leftJoinAndSelect('studentAnswers.studentExamGRA', 'studentExam')
      .leftJoinAndSelect('studentExam.exam', 'exam')
      .where('exam.id = :examId', { examId })
      .getMany();

    const questionMap = new Map<
      number,
      { correct: number; total: number; questionId: number }
    >();
    studentAnswers.forEach((answer) => {
      if (!answer.question) return;
      const questionId = answer.question.id;
      const current = questionMap.get(questionId) || {
        correct: 0,
        total: 0,
        questionId,
      };
      current.total += 1;
      if (answer['is_correct']) {
        current.correct += 1;
      }
      questionMap.set(questionId, current);
    });

    const questionAnalysis = Array.from(questionMap.values()).map((q) => {
      const correctRate = q.total > 0 ? (q.correct / q.total) * 100 : 0;
      const difficulty =
        correctRate > 80 ? 'Dễ' : correctRate < 30 ? 'Khó' : 'Trung bình';
      return {
        questionId: q.questionId,
        correctRate,
        difficulty,
        totalAnswers: q.total,
        correctAnswers: q.correct,
      };
    });

    // Tính độ phân biệt (Discrimination Index) - so sánh nhóm điểm cao và thấp
    const discriminationAnalysis = await this.calculateDiscriminationIndex(
      examId,
      Array.from(questionMap.keys()),
    );

    return {
      questionAnalysis,
      discriminationAnalysis,
      problematicQuestions: questionAnalysis.filter((q) => {
        const discrimination = discriminationAnalysis.find(
          (d) => d.questionId === q.questionId,
        );
        return (
          q.correctRate < 30 ||
          (discrimination && discrimination.discriminationIndex < 0.2)
        );
      }),
    };
  }

  // Danh sách sinh viên điểm thấp
  async getLowScoringStudentsReport(examId: number, threshold: number = 5) {
    const studentExams = await this.studentExamsRepository
      .createQueryBuilder('studentExams')
      .leftJoinAndSelect('studentExams.student', 'student')
      .leftJoinAndSelect('student.class', 'class')
      .where('studentExams.exam_id = :examId', { examId })
      .andWhere('studentExams.isSubmitted = :isSubmitted', {
        isSubmitted: true,
      })
      .andWhere('studentExams.score < :threshold', { threshold })
      .orderBy('studentExams.score', 'ASC')
      .getMany();

    return studentExams.map((se) => ({
      studentId: se.student.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      studentName: (se.student as any).full_name || 'N/A',
      className: se.student.class?.name || 'N/A',
      score: se.score,
    }));
  }

  // Báo cáo so sánh giữa các lớp
  async getClassComparisonReport(examId?: number) {
    const query = this.studentExamsRepository
      .createQueryBuilder('studentExams')
      .leftJoinAndSelect('studentExams.student', 'student')
      .leftJoinAndSelect('student.class', 'class')
      .where('studentExams.isSubmitted = :isSubmitted', { isSubmitted: true });

    if (examId) {
      query.andWhere('studentExams.exam_id = :examId', { examId });
    }

    const studentExams = await query.getMany();
    const classMap = new Map<
      number,
      { scores: number[]; className: string; classId: number }
    >();

    studentExams.forEach((se) => {
      if (se.student.class) {
        const classId = se.student.class.id;
        const current = classMap.get(classId) || {
          scores: [],
          className: se.student.class.name,
          classId,
        };
        if (se.score !== null) {
          current.scores.push(se.score);
        }
        classMap.set(classId, current);
      }
    });

    const classComparison = Array.from(classMap.values()).map((c) => {
      const averageScore =
        c.scores.length > 0
          ? c.scores.reduce((a, b) => a + b, 0) / c.scores.length
          : 0;
      const passingThreshold = 5;
      const passingStudents = c.scores.filter(
        (score) => score >= passingThreshold,
      ).length;
      const passingRate =
        c.scores.length > 0 ? (passingStudents / c.scores.length) * 100 : 0;
      return {
        classId: c.classId,
        className: c.className,
        totalStudents: c.scores.length,
        averageScore,
        passingRate,
      };
    });

    const bestClass =
      classComparison.length > 0
        ? classComparison.reduce((prev, curr) =>
            curr.averageScore > prev.averageScore ? curr : prev,
          )
        : null;
    const worstClass =
      classComparison.length > 0
        ? classComparison.reduce((prev, curr) =>
            curr.averageScore < prev.averageScore ? curr : prev,
          )
        : null;

    return {
      classComparison,
      bestClass,
      worstClass,
    };
  }

  // Thống kê cơ bản theo lớp, khóa học, loại đề
  async getBasicStatsReport(classId?: number, isPractice?: boolean) {
    const query = this.studentExamsRepository
      .createQueryBuilder('studentExams')
      .leftJoinAndSelect('studentExams.exam', 'exam')
      .leftJoinAndSelect('studentExams.student', 'student')
      .leftJoinAndSelect('student.class', 'class')
      .where('studentExams.isSubmitted = :isSubmitted', { isSubmitted: true });

    if (classId) {
      query.andWhere('student.class.id = :classId', { classId });
    }
    if (isPractice !== undefined) {
      query.andWhere('exam.isPractice = :isPractice', { isPractice });
    }

    const studentExams = await query.getMany();
    const totalStudents = studentExams.length;
    const scores = studentExams
      .map((se) => se.score)
      .filter((score) => score !== null);
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passingThreshold = 5;
    const passingStudents = scores.filter(
      (score) => score >= passingThreshold,
    ).length;
    const passingRate =
      scores.length > 0 ? (passingStudents / scores.length) * 100 : 0;
    const standardDeviation = this.calculateStandardDeviation(scores);

    return {
      totalStudents,
      averageScore,
      highestScore,
      lowestScore,
      passingRate,
      passingThreshold,
      standardDeviation,
    };
  }

  // Xu hướng theo thời gian (so sánh các kỳ thi)
 /* async getTrendOverTimeReport(classId?: number) {
    const query = this.studentExamsRepository
      .createQueryBuilder('studentExams')
      .leftJoinAndSelect('studentExams.exam', 'exam')
      .leftJoinAndSelect('studentExams.student', 'student')
      .leftJoinAndSelect('student.class', 'class')
      .where('studentExams.isSubmitted = :isSubmitted', { isSubmitted: true })
      .orderBy('exam.startTime', 'ASC');

    if (classId) {
      query.andWhere('student.class.id = :classId', { classId });
    }

    const studentExams = await query.getMany();
    const examMap = new Map<
      number,
      { scores: number[]; examName: string; startTime: Date | null }
    >();

    studentExams.forEach((se) => {
      const examId = se.exam.id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const examName = (se.exam as any).name || `Kỳ thi ${examId}`;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const startTime = (se.exam as any).start_time || null;
      const current = examMap.get(examId) || {
        scores: [],
        examName,
        startTime,
      };
      if (se.score !== null) {
        const scoreValue = se.score; 
        current.scores.push(scoreValue);
      }
      examMap.set(examId, current);
    });

    const trendData = Array.from(examMap.entries()).map(([examId, data]) => ({
      examId,
      examName: data.examName,
      startTime: data.startTime,
      averageScore:
        data.scores.length > 0
          ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          : 0,
      totalStudents: data.scores.length,
    }));

    return trendData;
  } */

  // Đánh giá chất lượng đề thi (độ khó, độ phân biệt trung bình)
  async getExamQualityReport(examId: number) {
    const questionReport = await this.getQuestionAnalysisReport(examId);
    const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
    questionReport.questionAnalysis.forEach((q) => {
      if (q.correctRate > 80) difficultyCounts.easy++;
      else if (q.correctRate < 30) difficultyCounts.hard++;
      else difficultyCounts.medium++;
    });

    const discriminationValues = questionReport.discriminationAnalysis.map(
      (d) => d.discriminationIndex,
    );
    const averageDiscrimination =
      discriminationValues.length > 0
        ? discriminationValues.reduce((a, b) => a + b, 0) /
          discriminationValues.length
      : 0;

    return {
      difficultyDistribution: difficultyCounts,
      averageDiscrimination,
      totalQuestions: questionReport.questionAnalysis.length,
    };
  }

  // Helper: Tính độ lệch chuẩn
  private calculateStandardDeviation(scores: number[]): number {
    if (scores.length === 0) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  // Helper: Tính phân phối điểm số cho histogram
  private calculateScoreDistribution(
    scores: number[],
  ): { range: string; count: number }[] {
    if (scores.length === 0) return [];
    const distribution: { range: string; count: number }[] = [];
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const rangeSize = (maxScore - minScore) / 10; // Chia thành 10 khoảng
    for (let i = 0; i < 10; i++) {
      const rangeStart = minScore + i * rangeSize;
      const rangeEnd = rangeStart + rangeSize;
      const count = scores.filter(
        (s) => s >= rangeStart && s < rangeEnd,
      ).length;
      distribution.push({
        range: `${rangeStart.toFixed(1)} - ${rangeEnd.toFixed(1)}`,
        count,
      });
    }
    return distribution;
  }

  // Helper: Tính chỉ số phân biệt (Discrimination Index)
  private async calculateDiscriminationIndex(
    examId: number,
    questionIds: number[],
  ): Promise<{ questionId: number; discriminationIndex: number }[]> {
    // Lấy danh sách điểm của sinh viên
    const studentExams = await this.studentExamsRepository
      .createQueryBuilder('studentExams')
      .where('studentExams.exam_id = :examId', { examId })
      .andWhere('studentExams.isSubmitted = :isSubmitted', {
        isSubmitted: true,
      })
      .orderBy('studentExams.score', 'DESC')
      .getMany();

    const totalStudents = studentExams.length;
    if (totalStudents === 0) return [];

    // Chia nhóm: 27% cao nhất và 27% thấp nhất
    const topCount = Math.floor(totalStudents * 0.27);
    const topStudents = studentExams.slice(0, topCount).map((se) => se.id);
    const bottomStudents = studentExams.slice(-topCount).map((se) => se.id);

    const result: { questionId: number; discriminationIndex: number }[] = [];
    for (const questionId of questionIds) {
      const topAnswers = await this.studentAnswersRepository
        .createQueryBuilder('studentAnswers')
        .where('studentAnswers.question_id = :questionId', { questionId })
        .andWhere('studentAnswers.studentExam_id IN (:...topStudents)', {
          topStudents,
        })
        .getMany();

      const bottomAnswers = await this.studentAnswersRepository
        .createQueryBuilder('studentAnswers')
        .where('studentAnswers.question_id = :questionId', { questionId })
        .andWhere('studentAnswers.studentExam_id IN (:...bottomStudents)', {
          bottomStudents,
        })
        .getMany();

      const topCorrect = topAnswers.filter((a) => (a as any).is_correct).length;
      const bottomCorrect = bottomAnswers.filter(
        (a) => (a as any).is_correct,
      ).length;
      const topTotal = topAnswers.length;
      const bottomTotal = bottomAnswers.length;

      const pHigh = topTotal > 0 ? topCorrect / topTotal : 0;
      const pLow = bottomTotal > 0 ? bottomCorrect / bottomTotal : 0;
      const discriminationIndex = pHigh - pLow;

      result.push({ questionId, discriminationIndex });
    }

    return result;
  }
} 
