import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exams } from 'src/database/entities/Exams';
import { Questions } from 'src/database/entities/Questions';
import { ExamScheduleAssignments } from 'src/database/entities/ExamScheduleAssignments';
import { In, Repository } from 'typeorm';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Subjects } from 'src/database/entities/Subjects';
import * as ExcelJS from 'exceljs';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);
  private readonly CACHE_KEYS = {
    EXAM_LIST: 'exam_list',
    EXAM_DETAIL: 'exam_detail_',
    EXAM_BY_SUBJECT: 'exam_by_subject_',
    EXAM_QUESTIONS: 'exam_questions_',
  };
  private readonly CACHE_TTL = 600; // 10 phút (giây)

  constructor(
    @InjectRepository(Exams)
    private examRepo: Repository<Exams>,

    @InjectRepository(Questions)
    private questionRepo: Repository<Questions>,

    @InjectRepository(Subjects)
    private subjectRepo: Repository<Subjects>,

    @InjectRepository(ExamScheduleAssignments)
    private examScheduleAssignmentRepo: Repository<ExamScheduleAssignments>,

    private readonly redisService: RedisService,
  ) {}

  /**
   * Xóa cache khi có thay đổi dữ liệu
   */
  private async invalidateCache(key?: string): Promise<void> {
    try {
      if (key) {
        await this.redisService.del(key);
      } else {
        // Xóa cache danh sách đề thi
        await this.redisService.del(this.CACHE_KEYS.EXAM_LIST);

        // Xóa cache chi tiết đề thi
        const examCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.EXAM_DETAIL}*`,
        );
        for (const cacheKey of examCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache đề thi theo môn học
        const subjectCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.EXAM_BY_SUBJECT}*`,
        );
        for (const cacheKey of subjectCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache câu hỏi của đề thi
        const questionsCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.EXAM_QUESTIONS}*`,
        );
        for (const cacheKey of questionsCacheKeys) {
          await this.redisService.del(cacheKey);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async createExam(createExamDto: CreateExamDto): Promise<Exams> {
    const { questionIds, totalQuestions, subjectId } = createExamDto;

    if (questionIds && questionIds.length > 0) {
      if (questionIds.length !== totalQuestions) {
        throw new BadRequestException(
          `Số lượng câu hỏi (${questionIds.length}) không khớp với totalQuestions (${totalQuestions})`,
        );
      }
    }

    let questions: Questions[] = [];
    if (questionIds && questionIds.length > 0) {
      questions = await this.questionRepo.findBy({
        id: In(questionIds),
      });

      if (questions.length !== questionIds.length) {
        const foundIds = questions.map((q) => q.id);
        const notFoundIds = questionIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Không tìm thấy câu hỏi với id: ${notFoundIds.join(', ')}`,
        );
      }
    }

    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) {
      throw new NotFoundException(
        `Không tìm thấy subject với id: ${subjectId}`,
      );
    }

    const exam = this.examRepo.create({
      ...createExamDto,
      questions,
      subject,
    });

    const savedExam = await this.examRepo.save(exam);

    await this.invalidateCache();
    await this.invalidateCache(
      `${this.CACHE_KEYS.EXAM_BY_SUBJECT}${subjectId}`,
    );

    return savedExam;
  }

  async updateExam(id: number, updateExamDto: UpdateExamDto): Promise<Exams> {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['questions', 'subject'],
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    // 🔒 KIỂM TRA: Có phòng thi nào đang mở với đề thi này không
    const openAssignments = await this.examScheduleAssignmentRepo.find({
      where: {
        exam: { id },
        status: 'open',
      },
      relations: ['class', 'examSchedule'],
    });

    if (openAssignments.length > 0) {
      const assignmentInfo = openAssignments
        .map((a) => `${a.class?.name || 'N/A'} (${a.code})`)
        .join(', ');
      throw new BadRequestException(
        `Không thể sửa đề thi khi có phòng thi đang mở: ${assignmentInfo}`,
      );
    }

    const { questionIds, totalQuestions, subjectId } = updateExamDto;
    const oldSubjectId = exam.subject?.id;

    if (questionIds) {
      const currentTotalQuestions = exam.totalQuestions;

      if (questionIds.length === currentTotalQuestions) {
        // Số lượng câu hỏi không thay đổi, không cần totalQuestions
        const updatedQuestions = await this.questionRepo.findBy({
          id: In(questionIds),
        });

        if (updatedQuestions.length !== questionIds.length) {
          const foundIds = updatedQuestions.map((q) => q.id);
          const notFoundIds = questionIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Không tìm thấy câu hỏi với id: ${notFoundIds.join(', ')}`,
          );
        }
        exam.updatedAt = new Date();
        exam.questions = updatedQuestions;
      } else {
        if (!totalQuestions) {
          throw new BadRequestException(
            `Số lượng câu hỏi thay đổi từ ${currentTotalQuestions} thành ${questionIds.length}. Vui lòng cung cấp totalQuestions để xác nhận.`,
          );
        }

        if (questionIds.length !== totalQuestions) {
          throw new BadRequestException(
            `Số lượng câu hỏi truyền vào (${questionIds.length}) không khớp với totalQuestions (${totalQuestions})`,
          );
        }

        const updatedQuestions = await this.questionRepo.findBy({
          id: In(questionIds),
        });

        if (updatedQuestions.length !== questionIds.length) {
          const foundIds = updatedQuestions.map((q) => q.id);
          const notFoundIds = questionIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Không tìm thấy câu hỏi với id: ${notFoundIds.join(', ')}`,
          );
        }

        exam.questions = updatedQuestions;
        exam.totalQuestions = totalQuestions;
      }
    }

    if (subjectId !== undefined) {
      const subject = await this.subjectRepo.findOneBy({ id: subjectId });

      if (!subject) {
        throw new NotFoundException(`Subject with ID ${subjectId} not found`);
      }

      exam.subject = subject;
    }

    if (updateExamDto.name !== undefined) exam.name = updateExamDto.name;
    if (updateExamDto.duration !== undefined)
      exam.duration = updateExamDto.duration;
    if (updateExamDto.examType !== undefined)
      exam.examType = updateExamDto.examType;
    if (updateExamDto.totalQuestions !== undefined && !questionIds)
      exam.totalQuestions = updateExamDto.totalQuestions;

    const updatedExam = await this.examRepo.save(exam);

    // Xóa cache sau khi cập nhật
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.EXAM_DETAIL}${id}`);
    await this.invalidateCache(`${this.CACHE_KEYS.EXAM_QUESTIONS}${id}`);

    if (oldSubjectId) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.EXAM_BY_SUBJECT}${oldSubjectId}`,
      );
    }

    if (subjectId && oldSubjectId !== subjectId) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.EXAM_BY_SUBJECT}${subjectId}`,
      );
    }

    return updatedExam;
  }

  async deleteExam(id: number): Promise<void> {
    // 🔒 KIỂM TRA: Có phòng thi nào đang mở với đề thi này không
    const openAssignments = await this.examScheduleAssignmentRepo.find({
      where: {
        exam: { id },
        status: 'open',
      },
      relations: ['class', 'examSchedule'],
    });

    if (openAssignments.length > 0) {
      const assignmentInfo = openAssignments
        .map((a) => `${a.class?.name || 'N/A'} (${a.code})`)
        .join(', ');
      throw new BadRequestException(
        `Không thể xóa đề thi khi có phòng thi đang mở: ${assignmentInfo}`,
      );
    }

    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['subject'],
    });

    if (exam) {
      const subjectId = exam.subject?.id;
      await this.examRepo.delete(id);

      // Xóa cache sau khi xóa
      await this.invalidateCache();
      await this.invalidateCache(`${this.CACHE_KEYS.EXAM_DETAIL}${id}`);
      await this.invalidateCache(`${this.CACHE_KEYS.EXAM_QUESTIONS}${id}`);

      if (subjectId) {
        await this.invalidateCache(
          `${this.CACHE_KEYS.EXAM_BY_SUBJECT}${subjectId}`,
        );
      }
    } else {
      await this.examRepo.delete(id);
      await this.invalidateCache();
    }
  }

  async getExamById(id: number): Promise<Exams> {
    const cacheKey = `${this.CACHE_KEYS.EXAM_DETAIL}${id}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as Exams;
      }

      // Nếu không có trong cache, truy vấn database
      const exam = await this.examRepo.findOne({
        where: { id },
        relations: ['questions', 'subject'],
      });

      if (!exam) throw new NotFoundException('Exam not found');

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(exam),
        this.CACHE_TTL,
      );

      return exam;
    } catch (error) {
      this.logger.error(
        `Error in getExamById: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const exam = await this.examRepo.findOne({
        where: { id },
        relations: ['questions', 'subject'],
      });

      if (!exam) throw new NotFoundException('Exam not found');
      return exam;
    }
  }

  async getExamsBySubject(subjectId: number): Promise<Exams[]> {
    const cacheKey = `${this.CACHE_KEYS.EXAM_BY_SUBJECT}${subjectId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as Exams[];
      }

      // Nếu không có trong cache, truy vấn database
      const exams = await this.examRepo.find({
        where: {
          subject: {
            id: subjectId,
          },
        },
        relations: ['subject'],
      });

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(exams),
        this.CACHE_TTL,
      );

      return exams;
    } catch (error) {
      this.logger.error(
        `Error in getExamsBySubject: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.examRepo.find({
        where: {
          subject: {
            id: subjectId,
          },
        },
        relations: ['subject'],
      });
    }
  }

  async getAllExams(): Promise<Exams[]> {
    const cacheKey = this.CACHE_KEYS.EXAM_LIST;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as Exams[];
      }

      // Nếu không có trong cache, truy vấn database
      const exams = await this.examRepo.find({
        relations: ['subject'],
        order: {
          updatedAt: 'DESC',
          createdAt: 'DESC',
        },
      });

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(exams),
        this.CACHE_TTL,
      );

      return exams;
    } catch (error) {
      this.logger.error(
        `Error in getAllExams: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.examRepo.find({
        relations: ['subject'],
        order: {
          updatedAt: 'DESC',
          createdAt: 'DESC',
        },
      });
    }
  }

  async getQuestionsOfExam(id: number): Promise<Questions[]> {
    const cacheKey = `${this.CACHE_KEYS.EXAM_QUESTIONS}${id}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as Questions[];
      }

      // Nếu không có trong cache, truy vấn database
      const exam = await this.examRepo.findOne({
        where: { id },
        relations: ['questions', 'questions.answers'],
      });

      if (!exam) throw new NotFoundException('Exam not found');

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(exam.questions),
        this.CACHE_TTL,
      );

      return exam.questions;
    } catch (error) {
      this.logger.error(
        `Error in getQuestionsOfExam: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const exam = await this.examRepo.findOne({
        where: { id },
        relations: ['questions', 'questions.answers'],
      });

      if (!exam) throw new NotFoundException('Exam not found');
      return exam.questions;
    }
  }

  // 🔥 THÊM: Method mới để lấy câu hỏi với randomization cho student
  async getQuestionsForStudent(
    examId: number,
    assignmentId: number,
    studentId?: number, // 🔥 THÊM: studentId để tạo unique randomization cho mỗi học sinh
  ): Promise<Questions[]> {
    // Lấy thông tin assignment để check randomizeOrder flag
    const assignment = await this.examScheduleAssignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['exam'],
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} not found`,
      );
    }

    if (assignment.exam.id !== examId) {
      throw new BadRequestException(
        `Exam ID ${examId} does not match assignment's exam ID ${assignment.exam.id}`,
      );
    }

    // Lấy câu hỏi gốc
    const questions = await this.getQuestionsOfExam(examId);

    // 🎯 XỬ LÝ RANDOMIZATION
    if (assignment.randomizeOrder) {
      if (studentId) {
        // 🔥 PER-STUDENT RANDOMIZATION: Mỗi học sinh có thứ tự riêng
        const seed = this.generateStudentSeed(assignmentId, studentId);
        return this.shuffleQuestionsWithSeed(questions, seed);
      } else {
        // 🔥 PER-ASSIGNMENT RANDOMIZATION: Cùng assignment, cùng thứ tự
        const seed = this.generateSeed(assignmentId);
        return this.shuffleQuestionsWithSeed(questions, seed);
      }
    }

    return questions;
  }

  // 🔧 Helper method: Tạo seed từ assignmentId
  private generateSeed(assignmentId: number): number {
    // Sử dụng assignmentId làm seed cố định để đảm bảo cùng 1 assignment luôn có cùng thứ tự
    // Không sử dụng Date.now() để tránh thay đổi theo thời gian
    return assignmentId * 12345 + 67890; // Constant multiplier và offset
  }

  // 🔥 THÊM: Helper method để tạo seed riêng cho mỗi học sinh
  private generateStudentSeed(assignmentId: number, studentId: number): number {
    // Kết hợp assignmentId và studentId để tạo seed unique cho mỗi học sinh
    // Sử dụng prime numbers để tránh collision
    return (assignmentId * 31 + studentId * 37) * 1009 + 2017;
  }

  // 🔧 Helper method: Shuffle questions với seed cố định
  private shuffleQuestionsWithSeed(
    questions: Questions[],
    seed: number,
  ): Questions[] {
    const shuffled = [...questions];

    // Sử dụng Linear Congruential Generator với seed cố định
    let currentSeed = seed;
    const random = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % Math.pow(2, 32);
      return currentSeed / Math.pow(2, 32);
    };

    // Fisher-Yates shuffle với random function có seed
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  async exportExamWithQuestions(
    examId: number,
    format: 'excel' | 'csv' = 'excel',
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    // Lấy thông tin đề thi với các câu hỏi và đáp án
    const exam = await this.examRepo.findOne({
      where: { id: examId },
      relations: ['questions', 'questions.answers', 'subject'],
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy đề thi với ID: ${examId}`);
    }

    if (format === 'excel') {
      return this.exportToExcel(exam);
    } else {
      return this.exportToCsv(exam);
    }
  }

  private async exportToExcel(
    exam: Exams,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Thông tin đề thi
    const examSheet = workbook.addWorksheet('Thông tin đề thi');

    // Header cho thông tin đề thi
    examSheet.columns = [
      { header: 'Trường', key: 'field', width: 20 },
      { header: 'Giá trị', key: 'value', width: 40 },
    ];

    // Thông tin đề thi
    examSheet.addRow({ field: 'ID đề thi', value: exam.id });
    examSheet.addRow({ field: 'Tên đề thi', value: exam.name });
    examSheet.addRow({
      field: 'Môn học',
      value: exam.subject?.name || 'Không xác định',
    });
    examSheet.addRow({
      field: 'Thời gian làm bài (phút)',
      value: exam.duration,
    });
    examSheet.addRow({
      field: 'Loại đề thi',
      value: exam.examType === 'practice' ? 'Luyện tập' : 'Chính thức',
    });
    examSheet.addRow({ field: 'Tổng số câu hỏi', value: exam.totalQuestions });
    examSheet.addRow({
      field: 'Ngày tạo',
      value: exam.createdAt?.toLocaleString('vi-VN'),
    });
    examSheet.addRow({
      field: 'Ngày cập nhật',
      value: exam.updatedAt?.toLocaleString('vi-VN'),
    });

    // Style cho sheet thông tin đề thi
    examSheet.getRow(1).font = { bold: true };
    examSheet.getColumn('A').font = { bold: true };

    // Sheet 2: Câu hỏi và đáp án
    const questionsSheet = workbook.addWorksheet('Câu hỏi và đáp án');

    // Header cho câu hỏi
    questionsSheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'ID câu hỏi', key: 'questionId', width: 10 },
      { header: 'Nội dung câu hỏi', key: 'questionText', width: 50 },
      { header: 'Đoạn văn', key: 'passageText', width: 30 },
      { header: 'Độ khó', key: 'difficulty', width: 15 },
      { header: 'Hình ảnh', key: 'imageUrl', width: 30 },
      { header: 'Audio', key: 'audioUrl', width: 30 },
      { header: 'Đáp án A', key: 'answerA', width: 25 },
      { header: 'Đáp án B', key: 'answerB', width: 25 },
      { header: 'Đáp án C', key: 'answerC', width: 25 },
      { header: 'Đáp án D', key: 'answerD', width: 25 },
      { header: 'Đáp án đúng', key: 'correctAnswer', width: 15 },
    ];

    exam.questions.forEach((question, index) => {
      const answers = question.answers || [];
      const correctAnswer = answers.find((a) => a.isCorrect);

      // Sắp xếp đáp án theo thứ tự A, B, C, D
      const sortedAnswers = answers.slice().sort((a, b) => a.id - b.id);

      questionsSheet.addRow({
        stt: index + 1,
        questionId: question.id,
        questionText: question.questionText,
        passageText: question.passageText || '',
        difficulty: question.difficultyLevel || '',
        imageUrl: question.imageUrl || '',
        audioUrl: question.audioUrl || '',
        answerA: sortedAnswers[0]?.answerText || '',
        answerB: sortedAnswers[1]?.answerText || '',
        answerC: sortedAnswers[2]?.answerText || '',
        answerD: sortedAnswers[3]?.answerText || '',
        correctAnswer: correctAnswer
          ? String.fromCharCode(
              65 + sortedAnswers.findIndex((a) => a.id === correctAnswer.id),
            )
          : '',
      });
    });

    // Style cho header
    questionsSheet.getRow(1).font = { bold: true };
    questionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Auto-fit columns
    questionsSheet.columns.forEach((column) => {
      if (column.key === 'questionText' || column.key === 'passageText') {
        // Cho phép wrap text cho các cột dài
        questionsSheet.getColumn(column.key).alignment = {
          wrapText: true,
          vertical: 'top',
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `De_thi_${exam.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return {
      buffer: Buffer.from(buffer),
      filename,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private exportToCsv(exam: Exams): {
    buffer: Buffer;
    filename: string;
    contentType: string;
  } {
    const csvRows: string[] = [];
    const BOM = '\uFEFF';

    csvRows.push('=== THÔNG TIN ĐỀ THI ===');
    csvRows.push(`ID đề thi,${exam.id}`);
    csvRows.push(`Tên đề thi,"${exam.name}"`);
    csvRows.push(`Môn học,"${exam.subject?.name || 'Không xác định'}"`);
    csvRows.push(`Thời gian làm bài (phút),${exam.duration}`);
    csvRows.push(
      `Loại đề thi,"${exam.examType === 'practice' ? 'Luyện tập' : 'Chính thức'}"`,
    );
    csvRows.push(`Tổng số câu hỏi,${exam.totalQuestions}`);
    csvRows.push(`Ngày tạo,"${exam.createdAt?.toLocaleString('vi-VN')}"`);
    csvRows.push(`Ngày cập nhật,"${exam.updatedAt?.toLocaleString('vi-VN')}"`);
    csvRows.push('');

    // Header câu hỏi
    csvRows.push('=== CÂU HỎI VÀ ĐÁP ÁN ===');
    csvRows.push(
      'STT,ID câu hỏi,Nội dung câu hỏi,Đoạn văn,Độ khó,Hình ảnh,Audio,Đáp án A,Đáp án B,Đáp án C,Đáp án D,Đáp án đúng',
    );

    // Dữ liệu câu hỏi
    exam.questions.forEach((question, index) => {
      const answers = question.answers || [];
      const correctAnswer = answers.find((a) => a.isCorrect);

      // Sắp xếp đáp án theo thứ tự A, B, C, D
      const sortedAnswers = answers.slice().sort((a, b) => a.id - b.id);

      const row = [
        index + 1,
        question.id,
        `"${question.questionText.replace(/"/g, '""')}"`,
        `"${(question.passageText || '').replace(/"/g, '""')}"`,
        `"${question.difficultyLevel || ''}"`,
        `"${question.imageUrl || ''}"`,
        `"${question.audioUrl || ''}"`,
        `"${(sortedAnswers[0]?.answerText || '').replace(/"/g, '""')}"`,
        `"${(sortedAnswers[1]?.answerText || '').replace(/"/g, '""')}"`,
        `"${(sortedAnswers[2]?.answerText || '').replace(/"/g, '""')}"`,
        `"${(sortedAnswers[3]?.answerText || '').replace(/"/g, '""')}"`,
        correctAnswer
          ? String.fromCharCode(
              65 + sortedAnswers.findIndex((a) => a.id === correctAnswer.id),
            )
          : '',
      ];

      csvRows.push(row.join(','));
    });

    const csvContent = BOM + csvRows.join('\n');
    const buffer = Buffer.from(csvContent, 'utf8');
    const filename = `De_thi_${exam.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      buffer,
      filename,
      contentType: 'text/csv; charset=utf-8',
    };
  }
}
