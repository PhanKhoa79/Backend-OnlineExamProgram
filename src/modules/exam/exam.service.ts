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
import { StudentExams } from 'src/database/entities/StudentExams';
import { StudentAnswers } from 'src/database/entities/StudentAnswers';
import { Answers } from 'src/database/entities/Answers';
import {
  PracticeProgressDto,
  StudentPracticeProgressResponseDto,
} from './dto/practice-progress.dto';
import {
  SaveStudentAnswerDto,
  StartExamDto,
  StartExamResponseDto,
  StudentAnswerResponseDto,
} from './dto/student-answer.dto';
import { Students } from 'src/database/entities/Students';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);
  private readonly CACHE_KEYS = {
    EXAM_LIST: 'exam_list',
    EXAM_DETAIL: 'exam_detail_',
    EXAM_BY_SUBJECT: 'exam_by_subject_',
    EXAM_QUESTIONS: 'exam_questions_',
    EXAM_BY_TYPE: 'exam_by_type_',
    STUDENT_PRACTICE_PROGRESS: 'student_practice_progress_',
    STUDENT_EXAM_RESULTS: 'student_exam_results_',
    EXAM_RESULT: 'exam_result_',
    STUDENT_EXAM_RESULT: 'student_exam_result_',
    ALL_STUDENT_RESULTS_FOR_EXAM: 'all_student_results_for_exam_',
    ALL_COMPLETED_EXAMS: 'all_completed_exams_',
    COMPLETED_PRACTICE_EXAMS: 'completed_practice_exams_',
    IN_PROGRESS_PRACTICE_EXAMS: 'in_progress_practice_exams_',
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

    @InjectRepository(StudentExams)
    private studentExamRepo: Repository<StudentExams>,

    @InjectRepository(StudentAnswers)
    private studentAnswerRepo: Repository<StudentAnswers>,

    @InjectRepository(Answers)
    private answerRepo: Repository<Answers>,

    @InjectRepository(Students)
    private studentRepo: Repository<Students>,

    private readonly redisService: RedisService,
  ) {}

  /**
   * 🔥 THÊM: Helper method để xóa cache liên quan đến student exam results
   */
  private async invalidateStudentExamCache(
    studentId: number,
    examId: number,
    studentExamId?: number,
  ): Promise<void> {
    try {
      const cacheKeysToDelete: string[] = [];

      // Cache keys cụ thể
      cacheKeysToDelete.push(
        `${this.CACHE_KEYS.STUDENT_PRACTICE_PROGRESS}${studentId}`,
        `${this.CACHE_KEYS.IN_PROGRESS_PRACTICE_EXAMS}${studentId}`,
        `${this.CACHE_KEYS.COMPLETED_PRACTICE_EXAMS}${studentId}`,
        `${this.CACHE_KEYS.ALL_COMPLETED_EXAMS}${studentId}`,
        `${this.CACHE_KEYS.ALL_STUDENT_RESULTS_FOR_EXAM}${examId}`,
        `${this.CACHE_KEYS.STUDENT_EXAM_RESULT}${examId}_${studentId}`,
      );

      if (studentExamId) {
        cacheKeysToDelete.push(
          `${this.CACHE_KEYS.EXAM_RESULT}${studentExamId}`,
        );
      }

      // Lấy tất cả cache keys với pattern
      const [
        examResultKeys,
        studentExamResultKeys,
        allStudentResultsKeys,
        studentExamResultsKeys,
      ] = await Promise.all([
        this.redisService.keys(`${this.CACHE_KEYS.EXAM_RESULT}*`),
        this.redisService.keys(`${this.CACHE_KEYS.STUDENT_EXAM_RESULT}*`),
        this.redisService.keys(
          `${this.CACHE_KEYS.ALL_STUDENT_RESULTS_FOR_EXAM}*`,
        ),
        this.redisService.keys(`${this.CACHE_KEYS.STUDENT_EXAM_RESULTS}*`),
      ]);

      // Kết hợp tất cả cache keys
      const allKeysToDelete = [
        ...cacheKeysToDelete,
        ...examResultKeys,
        ...studentExamResultKeys,
        ...allStudentResultsKeys,
        ...studentExamResultsKeys,
      ];

      // Xóa tất cả cache keys parallel
      if (allKeysToDelete.length > 0) {
        await Promise.all(
          allKeysToDelete.map((key) => this.redisService.del(key)),
        );
      }

      this.logger.log(
        `Student exam cache invalidated: removed ${allKeysToDelete.length} cache entries for student ${studentId}, exam ${examId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate student exam cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

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

        // Xóa cache đề thi theo loại
        const typeCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.EXAM_BY_TYPE}*`,
        );
        for (const cacheKey of typeCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache kết quả thi của sinh viên
        const studentResultsCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.STUDENT_EXAM_RESULTS}*`,
        );
        for (const cacheKey of studentResultsCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache kết quả thi chi tiết
        const examResultCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.EXAM_RESULT}*`,
        );
        for (const cacheKey of examResultCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache kết quả thi của sinh viên theo đề thi
        const studentExamResultCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.STUDENT_EXAM_RESULT}*`,
        );
        for (const cacheKey of studentExamResultCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache tất cả kết quả của đề thi
        const allStudentResultsCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.ALL_STUDENT_RESULTS_FOR_EXAM}*`,
        );
        for (const cacheKey of allStudentResultsCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache đề thi đã hoàn thành
        const allCompletedExamsCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.ALL_COMPLETED_EXAMS}*`,
        );
        for (const cacheKey of allCompletedExamsCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache đề practice đã hoàn thành
        const completedPracticeExamsCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.COMPLETED_PRACTICE_EXAMS}*`,
        );
        for (const cacheKey of completedPracticeExamsCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache đề practice đang làm dở
        const inProgressPracticeExamsCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.IN_PROGRESS_PRACTICE_EXAMS}*`,
        );
        for (const cacheKey of inProgressPracticeExamsCacheKeys) {
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
    await this.invalidateCache(
      `${this.CACHE_KEYS.EXAM_BY_TYPE}${createExamDto.examType}`,
    );

    // Xóa cache practice exams nếu đây là đề thi practice
    if (createExamDto.examType === 'practice') {
      await this.invalidateCache(
        `${this.CACHE_KEYS.EXAM_BY_SUBJECT}practice_${subjectId}`,
      );
    }

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
    const oldExamType = exam.examType;

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

    if (oldExamType && oldExamType !== exam.examType) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.EXAM_BY_TYPE}${oldExamType}`,
      );
    }

    // Xóa cache cho exam type hiện tại
    await this.invalidateCache(
      `${this.CACHE_KEYS.EXAM_BY_TYPE}${updatedExam.examType}`,
    );

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
      const examType = exam.examType;
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

      if (examType) {
        await this.invalidateCache(
          `${this.CACHE_KEYS.EXAM_BY_TYPE}${examType}`,
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

  async getExamsByType(examType: 'practice' | 'official'): Promise<Exams[]> {
    const cacheKey = `${this.CACHE_KEYS.EXAM_BY_TYPE}${examType}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as Exams[];
      }

      // Nếu không có trong cache, truy vấn database
      const exams = await this.examRepo.find({
        where: {
          examType,
        },
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
        `Error in getExamsByType: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.examRepo.find({
        where: {
          examType,
        },
        relations: ['subject'],
        order: {
          updatedAt: 'DESC',
          createdAt: 'DESC',
        },
      });
    }
  }

  async getPracticeExamsBySubject(subjectId: number): Promise<Exams[]> {
    const cacheKey = `${this.CACHE_KEYS.EXAM_BY_SUBJECT}practice_${subjectId}`;

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
          examType: 'practice',
        },
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
        `Error in getPracticeExamsBySubject: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.examRepo.find({
        where: {
          subject: {
            id: subjectId,
          },
          examType: 'practice',
        },
        relations: ['subject'],
        order: {
          updatedAt: 'DESC',
          createdAt: 'DESC',
        },
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

  /**
   * Lấy tiến độ luyện tập của học sinh theo từng môn học
   * @param studentId ID của học sinh
   * @returns Thông tin tiến độ luyện tập theo từng môn
   */
  async getStudentPracticeProgress(
    studentId: number,
  ): Promise<StudentPracticeProgressResponseDto> {
    const cacheKey = `${this.CACHE_KEYS.STUDENT_PRACTICE_PROGRESS}${studentId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData) as StudentPracticeProgressResponseDto;
      }

      // Nếu không có trong cache, truy vấn database
      const result = await this.calculateStudentPracticeProgress(studentId);

      // Lưu vào cache với TTL ngắn hơn (5 phút) vì dữ liệu có thể thay đổi thường xuyên
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        300, // 5 phút
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error in getStudentPracticeProgress: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.calculateStudentPracticeProgress(studentId);
    }
  }

  /**
   * Tính toán tiến độ luyện tập thực tế (logic tách riêng để dễ test và maintain)
   */
  private async calculateStudentPracticeProgress(
    studentId: number,
  ): Promise<StudentPracticeProgressResponseDto> {
    // Lấy tất cả môn học có đề thi practice
    const subjectsWithPracticeExams = await this.subjectRepo
      .createQueryBuilder('subject')
      .leftJoin('subject.exams', 'exam')
      .where('exam.examType = :examType', { examType: 'practice' })
      .groupBy('subject.id, subject.name')
      .select(['subject.id', 'subject.name'])
      .getRawMany();

    const progressData: PracticeProgressDto[] = [];
    let totalPracticeExams = 0;
    let totalCompletedExams = 0;

    for (const subject of subjectsWithPracticeExams) {
      // Đếm tổng số đề practice của môn học này
      const totalExamsCount = await this.examRepo.count({
        where: {
          subject: { id: subject.subject_id },
          examType: 'practice',
        },
      });

      // Đếm số đề practice đã làm của học sinh trong môn này
      const completedExamsCount = await this.studentExamRepo
        .createQueryBuilder('studentExam')
        .leftJoin('studentExam.exam', 'exam')
        .leftJoin('exam.subject', 'subject')
        .where('studentExam.student.id = :studentId', { studentId })
        .andWhere('exam.examType = :examType', { examType: 'practice' })
        .andWhere('subject.id = :subjectId', { subjectId: subject.subject_id })
        .andWhere('studentExam.isSubmitted = :isSubmitted', {
          isSubmitted: true,
        })
        .getCount();

      const progressPercentage =
        totalExamsCount > 0
          ? Math.round((completedExamsCount / totalExamsCount) * 100)
          : 0;

      progressData.push({
        subjectName: subject.subject_name,
        totalPracticeExams: totalExamsCount,
        completedPracticeExams: completedExamsCount,
        progressPercentage,
      });

      totalPracticeExams += totalExamsCount;
      totalCompletedExams += completedExamsCount;
    }

    const overallPercentage =
      totalPracticeExams > 0
        ? Math.round((totalCompletedExams / totalPracticeExams) * 100)
        : 0;

    return {
      studentId,
      subjects: progressData,
      overallProgress: {
        totalSubjects: subjectsWithPracticeExams.length,
        totalPracticeExams,
        totalCompletedExams,
        overallPercentage,
      },
    };
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

  /**
   * Tính điểm cho sinh viên dựa trên câu trả lời đã nộp
   * @param studentExamId ID của StudentExam record
   * @returns Điểm số đã tính toán
   */
  async calculateStudentScore(studentExamId: number): Promise<number> {
    // Lấy thông tin bài thi của sinh viên với các câu trả lời
    const studentExam = await this.studentExamRepo.findOne({
      where: { id: studentExamId },
      relations: [
        'exam',
        'studentAnswers',
        'studentAnswers.answer',
        'studentAnswers.question',
        'studentAnswers.question.answers',
      ],
    });

    if (!studentExam) {
      throw new NotFoundException(
        `Student exam with ID ${studentExamId} not found`,
      );
    }

    const { exam, studentAnswers } = studentExam;
    let correctAnswers = 0;

    // Tổng số câu = số câu trong đề thi (không phải số câu đã trả lời)
    const totalQuestions = exam.totalQuestions || exam.questions?.length || 0;

    // Đếm số câu trả lời đúng
    for (const studentAnswer of studentAnswers) {
      // Chỉ tính điểm cho câu đã trả lời (có answerId)
      if (studentAnswer.answerId) {
        const question = studentAnswer.question;
        const correctAnswer = question.answers.find((a) => a.isCorrect);

        if (correctAnswer && studentAnswer.answerId === correctAnswer.id) {
          correctAnswers++;
        }
      }
      // Câu không trả lời (answerId = null) → tự động sai, không cộng điểm
    }

    // Tính điểm theo công thức: (số câu đúng / tổng số câu) × điểm tối đa
    const scorePercentage =
      totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const finalScore = scorePercentage * exam.maxScore;

    // Làm tròn đến 2 chữ số thập phân
    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Cập nhật điểm cho sinh viên và đánh dấu bài thi đã hoàn thành
   * @param studentExamId ID của StudentExam record
   * @returns StudentExam đã được cập nhật
   */
  async submitStudentExam(studentExamId: number): Promise<StudentExams> {
    const score = await this.calculateStudentScore(studentExamId);

    const studentExam = await this.studentExamRepo.findOne({
      where: { id: studentExamId },
      relations: ['student', 'exam'],
    });

    if (!studentExam) {
      throw new NotFoundException(
        `Student exam with ID ${studentExamId} not found`,
      );
    }

    // Cập nhật điểm và trạng thái
    studentExam.score = score;
    studentExam.isSubmitted = true;
    studentExam.submittedAt = new Date();

    const updatedStudentExam = await this.studentExamRepo.save(studentExam);

    // 🔥 Sử dụng helper method để xóa cache toàn diện
    const studentIdKey = studentExam.student?.id;
    const examIdKey = studentExam.exam?.id;

    if (studentIdKey && examIdKey) {
      await this.invalidateStudentExamCache(
        studentIdKey,
        examIdKey,
        updatedStudentExam.id,
      );
    } else {
      this.logger.warn(
        `Missing student or exam ID for cache invalidation: studentId=${studentIdKey}, examId=${examIdKey}`,
      );
    }

    return updatedStudentExam;
  }

  /**
   * Bắt đầu làm bài thi - tạo hoặc lấy StudentExam hiện có
   */
  async startExam(startExamDto: StartExamDto): Promise<StartExamResponseDto> {
    const { examId, studentId, assignmentId } = startExamDto;

    // Kiểm tra exam có tồn tại không
    const exam = await this.examRepo.findOne({
      where: { id: examId },
      relations: ['questions', 'questions.answers'],
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    // Kiểm tra student có tồn tại không
    const student = await this.studentRepo.findOneBy({ id: studentId });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // Tìm StudentExam hiện có hoặc tạo mới
    let studentExam = await this.studentExamRepo.findOne({
      where: {
        exam: { id: examId },
        student: { id: studentId },
        isSubmitted: false, // Chỉ lấy bài chưa nộp
      },
    });

    if (!studentExam) {
      // Tạo StudentExam mới
      studentExam = this.studentExamRepo.create({
        exam: { id: examId },
        student: { id: studentId },
        startedAt: new Date(),
        isSubmitted: false,
      });
      studentExam = await this.studentExamRepo.save(studentExam);
    }

    // Lấy các câu trả lời đã có
    const existingAnswers = await this.studentAnswerRepo.find({
      where: { studentExamId: studentExam.id },
    });

    const existingAnswersDto: StudentAnswerResponseDto[] = existingAnswers.map(
      (answer) => ({
        studentExamId: answer.studentExamId,
        questionId: answer.questionId,
        answerId: answer.answerId,
        answeredAt: answer.answeredAt,
        isMarked: answer.isMarked,
      }),
    );

    return {
      studentExamId: studentExam.id,
      examId: exam.id,
      studentId: student.id,
      assignmentId: assignmentId || null,
      startedAt: studentExam.startedAt,
      questions: exam.questions,
      existingAnswers: existingAnswersDto,
    };
  }

  /**
   * Lưu câu trả lời của học sinh (tạo mới hoặc cập nhật)
   * Hàm này xử lý cả việc tạo mới và cập nhật câu trả lời
   */
  async saveStudentAnswer(
    saveAnswerDto: SaveStudentAnswerDto,
  ): Promise<StudentAnswerResponseDto> {
    const { studentExamId, questionId, answerId, isMarked } = saveAnswerDto;

    // Kiểm tra StudentExam có tồn tại và chưa nộp bài (với relations để lấy student info)
    const studentExam = await this.studentExamRepo.findOne({
      where: {
        id: studentExamId,
        isSubmitted: false,
      },
      relations: ['student'],
    });

    if (!studentExam) {
      throw new NotFoundException(
        'Student exam not found or already submitted',
      );
    }

    // Tìm câu trả lời hiện có
    let studentAnswer = await this.studentAnswerRepo.findOneBy({
      studentExamId,
      questionId,
    });

    if (studentAnswer) {
      // Cập nhật câu trả lời hiện có
      studentAnswer.answerId = answerId ?? null;
      studentAnswer.answeredAt = new Date();
      if (isMarked !== undefined) {
        studentAnswer.isMarked = isMarked;
      }
    } else {
      // Tạo câu trả lời mới
      studentAnswer = this.studentAnswerRepo.create({
        studentExamId,
        questionId,
        answerId: answerId ?? null,
        answeredAt: new Date(),
        isMarked: isMarked || false,
      });
    }

    const savedAnswer = await this.studentAnswerRepo.save(studentAnswer);

    // 🔥 Xóa cache tiến độ khi có thay đổi câu trả lời
    const studentIdFromExam = studentExam.student?.id;
    if (studentIdFromExam) {
      try {
        // Chỉ xóa cache tiến độ làm bài (in-progress) vì số câu đã trả lời thay đổi
        await this.invalidateCache(
          `${this.CACHE_KEYS.IN_PROGRESS_PRACTICE_EXAMS}${studentIdFromExam}`,
        );
      } catch (cacheError) {
        this.logger.warn(
          `Failed to invalidate progress cache: ${(cacheError as Error).message}`,
        );
      }
    }

    return {
      studentExamId: savedAnswer.studentExamId,
      questionId: savedAnswer.questionId,
      answerId: savedAnswer.answerId,
      answeredAt: savedAnswer.answeredAt,
      isMarked: savedAnswer.isMarked,
    };
  }

  /**
   * Lấy tất cả câu trả lời của một bài thi
   */
  async getStudentAnswers(
    studentExamId: number,
  ): Promise<StudentAnswerResponseDto[]> {
    const answers = await this.studentAnswerRepo.find({
      where: { studentExamId },
      order: { questionId: 'ASC' },
    });

    return answers.map((answer) => ({
      studentExamId: answer.studentExamId,
      questionId: answer.questionId,
      answerId: answer.answerId,
      answeredAt: answer.answeredAt,
      isMarked: answer.isMarked,
    }));
  }

  /**
   * Lấy danh sách đề thi practice đang làm dở (chưa submit)
   * @param studentId ID của sinh viên
   * @returns Danh sách đề thi đang làm dở với thông tin tiến độ
   */
  async getInProgressPracticeExams(studentId: number) {
    const cacheKey = `${this.CACHE_KEYS.IN_PROGRESS_PRACTICE_EXAMS}${studentId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(
          `Cache hit for in-progress practice exams: ${cacheKey}`,
        );
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      this.logger.log(`Cache miss for in-progress practice exams: ${cacheKey}`);

      // Kiểm tra student có tồn tại không
      const student = await this.studentRepo.findOneBy({ id: studentId });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      // Lấy các bài thi đang làm dở (có StudentExam nhưng chưa submit)
      const inProgressExams = await this.studentExamRepo.find({
        where: {
          student: { id: studentId },
          isSubmitted: false,
        },
        relations: ['exam', 'exam.subject', 'studentAnswers'],
        order: {
          startedAt: 'DESC',
        },
      });

      // Chỉ lấy practice exams
      const practiceExamsInProgress = inProgressExams.filter(
        (studentExam) => studentExam.exam.examType === 'practice',
      );

      // Tính toán tiến độ cho mỗi bài thi
      const result = practiceExamsInProgress.map((studentExam) => {
        const totalQuestions = studentExam.exam.totalQuestions || 0;
        const answeredQuestions = studentExam.studentAnswers.filter(
          (answer) => answer.answerId !== null,
        ).length;
        const progressPercentage =
          totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0;

        return {
          studentExamId: studentExam.id,
          exam: studentExam.exam,
          startedAt: studentExam.startedAt,
          progress: {
            totalQuestions,
            answeredQuestions,
            progressPercentage,
          },
        };
      });

      // Lưu vào cache với TTL ngắn hơn (2 phút) vì tiến độ có thể thay đổi thường xuyên
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        120,
      );

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in getInProgressPracticeExams: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const student = await this.studentRepo.findOneBy({ id: studentId });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      const inProgressExams = await this.studentExamRepo.find({
        where: {
          student: { id: studentId },
          isSubmitted: false,
        },
        relations: ['exam', 'exam.subject', 'studentAnswers'],
        order: {
          startedAt: 'DESC',
        },
      });

      const practiceExamsInProgress = inProgressExams.filter(
        (studentExam) => studentExam.exam.examType === 'practice',
      );

      const result = practiceExamsInProgress.map((studentExam) => {
        const totalQuestions = studentExam.exam.totalQuestions || 0;
        const answeredQuestions = studentExam.studentAnswers.filter(
          (answer) => answer.answerId !== null,
        ).length;
        const progressPercentage =
          totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0;

        return {
          studentExamId: studentExam.id,
          exam: studentExam.exam,
          startedAt: studentExam.startedAt,
          progress: {
            totalQuestions,
            answeredQuestions,
            progressPercentage,
          },
        };
      });

      return result;
    }
  }

  /**
   * Lấy danh sách đề thi practice đã hoàn thành của sinh viên
   * @param studentId ID của sinh viên
   * @returns Danh sách đề thi đã hoàn thành với điểm số và thời gian
   */
  async getCompletedPracticeExams(studentId: number) {
    const cacheKey = `${this.CACHE_KEYS.COMPLETED_PRACTICE_EXAMS}${studentId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for completed practice exams: ${cacheKey}`);
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      this.logger.log(`Cache miss for completed practice exams: ${cacheKey}`);

      // Kiểm tra student có tồn tại không
      const student = await this.studentRepo.findOneBy({ id: studentId });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      // Lấy các bài thi đã hoàn thành (đã submit)
      const completedExams = await this.studentExamRepo.find({
        where: {
          student: { id: studentId },
          isSubmitted: true,
        },
        relations: ['exam', 'exam.subject'],
        order: {
          submittedAt: 'DESC',
        },
      });

      // Chỉ lấy practice exams
      const practiceExamsCompleted = completedExams.filter(
        (studentExam) => studentExam.exam.examType === 'practice',
      );

      // Format kết quả
      const result = practiceExamsCompleted.map((studentExam) => {
        const totalQuestions = studentExam.exam.totalQuestions || 0;
        const maxScore = studentExam.exam.maxScore || 100;
        const score = studentExam.score || 0;
        const scorePercentage =
          maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        return {
          studentExamId: studentExam.id,
          exam: {
            id: studentExam.exam.id,
            name: studentExam.exam.name,
            subject: studentExam.exam.subject,
            duration: studentExam.exam.duration,
            totalQuestions,
            maxScore,
          },
          result: {
            score,
            scorePercentage,
            startedAt: studentExam.startedAt,
            submittedAt: studentExam.submittedAt,
            timeTaken: this.calculateTimeTaken(
              studentExam.startedAt || new Date(),
              studentExam.submittedAt,
            ),
          },
        };
      });

      const finalResult = {
        studentId,
        totalCompletedExams: result.length,
        totalPracticeExams: result.length,
        totalOfficialExams: 0,
        completedExams: result,
        practiceExams: result,
        officialExams: [],
      };

      // Lưu vào cache với TTL ngắn hơn (5 phút) vì có thể có bài thi mới được hoàn thành
      await this.redisService.set(cacheKey, JSON.stringify(finalResult), 300);

      return finalResult;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in getCompletedPracticeExams: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const student = await this.studentRepo.findOneBy({ id: studentId });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      const completedExams = await this.studentExamRepo.find({
        where: {
          student: { id: studentId },
          isSubmitted: true,
        },
        relations: ['exam', 'exam.subject'],
        order: {
          submittedAt: 'DESC',
        },
      });

      const practiceExamsCompleted = completedExams.filter(
        (studentExam) => studentExam.exam.examType === 'practice',
      );

      const result = practiceExamsCompleted.map((studentExam) => {
        const totalQuestions = studentExam.exam.totalQuestions || 0;
        const maxScore = studentExam.exam.maxScore || 100;
        const score = studentExam.score || 0;
        const scorePercentage =
          maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        return {
          studentExamId: studentExam.id,
          exam: {
            id: studentExam.exam.id,
            name: studentExam.exam.name,
            subject: studentExam.exam.subject,
            duration: studentExam.exam.duration,
            totalQuestions,
            maxScore,
          },
          result: {
            score,
            scorePercentage,
            startedAt: studentExam.startedAt,
            submittedAt: studentExam.submittedAt,
            timeTaken: this.calculateTimeTaken(
              studentExam.startedAt || new Date(),
              studentExam.submittedAt,
            ),
          },
        };
      });

      return {
        studentId,
        totalCompletedExams: result.length,
        totalPracticeExams: result.length,
        totalOfficialExams: 0,
        completedExams: result,
        practiceExams: result,
        officialExams: [],
      };
    }
  }

  /**
   * Lấy kết quả chi tiết của một bài thi đã hoàn thành
   * @param studentExamId ID của StudentExam
   * @returns Kết quả chi tiết bao gồm điểm số, câu trả lời từng câu
   */
  async getExamResult(studentExamId: number) {
    const cacheKey = `${this.CACHE_KEYS.EXAM_RESULT}${studentExamId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for exam result: ${cacheKey}`);
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      this.logger.log(`Cache miss for exam result: ${cacheKey}`);

      // Lấy thông tin bài thi với tất cả relations cần thiết
      const studentExam = await this.studentExamRepo.findOne({
        where: { id: studentExamId, isSubmitted: true },
        relations: [
          'exam',
          'exam.subject',
          'student',
          'studentAnswers',
          'studentAnswers.question',
          'studentAnswers.question.answers',
          'studentAnswers.answer',
        ],
      });

      if (!studentExam) {
        throw new NotFoundException(
          `Completed exam with ID ${studentExamId} not found`,
        );
      }

      const result = this.formatExamResult(studentExam);

      // Lưu vào cache với TTL dài hơn (10 phút) vì kết quả thi đã hoàn thành ít thay đổi
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.CACHE_TTL,
      );

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in getExamResult: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const studentExam = await this.studentExamRepo.findOne({
        where: { id: studentExamId, isSubmitted: true },
        relations: [
          'exam',
          'exam.subject',
          'student',
          'studentAnswers',
          'studentAnswers.question',
          'studentAnswers.question.answers',
          'studentAnswers.answer',
        ],
      });

      if (!studentExam) {
        throw new NotFoundException(
          `Completed exam with ID ${studentExamId} not found`,
        );
      }

      return this.formatExamResult(studentExam);
    }
  }

  /**
   * Lấy kết quả thi của một sinh viên cụ thể trong một đề thi cụ thể
   * @param examId ID của đề thi
   * @param studentId ID của sinh viên
   * @returns Kết quả chi tiết bài thi của sinh viên trong đề thi đó
   */
  async getStudentExamResult(examId: number, studentId: number) {
    const cacheKey = `${this.CACHE_KEYS.STUDENT_EXAM_RESULT}${examId}_${studentId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for student exam result: ${cacheKey}`);
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      this.logger.log(`Cache miss for student exam result: ${cacheKey}`);

      // Tìm StudentExam dựa trên examId và studentId
      const studentExam = await this.studentExamRepo.findOne({
        where: {
          exam: { id: examId },
          student: { id: studentId },
          isSubmitted: true,
        },
        relations: [
          'exam',
          'exam.subject',
          'student',
          'studentAnswers',
          'studentAnswers.question',
          'studentAnswers.question.answers',
          'studentAnswers.answer',
        ],
        order: {
          submittedAt: 'DESC', // Nếu có nhiều lần thi, lấy lần gần nhất
        },
      });

      if (!studentExam) {
        throw new NotFoundException(
          `Không tìm thấy kết quả thi của sinh viên ID ${studentId} cho đề thi ID ${examId}`,
        );
      }

      // Sử dụng lại logic từ hàm getExamResult
      const result = this.formatExamResult(studentExam);

      // Lưu vào cache với TTL dài hơn (10 phút) vì kết quả thi đã hoàn thành ít thay đổi
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.CACHE_TTL,
      );

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in getStudentExamResult: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const studentExam = await this.studentExamRepo.findOne({
        where: {
          exam: { id: examId },
          student: { id: studentId },
          isSubmitted: true,
        },
        relations: [
          'exam',
          'exam.subject',
          'student',
          'studentAnswers',
          'studentAnswers.question',
          'studentAnswers.question.answers',
          'studentAnswers.answer',
        ],
        order: {
          submittedAt: 'DESC',
        },
      });

      if (!studentExam) {
        throw new NotFoundException(
          `Không tìm thấy kết quả thi của sinh viên ID ${studentId} cho đề thi ID ${examId}`,
        );
      }

      return this.formatExamResult(studentExam);
    }
  }

  /**
   * Lấy tất cả kết quả thi của một đề thi (tất cả sinh viên)
   * @param examId ID của đề thi
   * @returns Danh sách kết quả thi của tất cả sinh viên
   */
  async getAllStudentResultsForExam(examId: number) {
    const cacheKey = `${this.CACHE_KEYS.ALL_STUDENT_RESULTS_FOR_EXAM}${examId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(
          `Cache hit for all student results for exam: ${cacheKey}`,
        );
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      this.logger.log(
        `Cache miss for all student results for exam: ${cacheKey}`,
      );

      // Kiểm tra đề thi có tồn tại không
      const exam = await this.examRepo.findOneBy({ id: examId });
      if (!exam) {
        throw new NotFoundException(`Exam with ID ${examId} not found`);
      }

      // Lấy tất cả kết quả thi của đề thi này
      const studentExams = await this.studentExamRepo.find({
        where: {
          exam: { id: examId },
          isSubmitted: true,
        },
        relations: [
          'exam',
          'exam.subject',
          'student',
          'studentAnswers',
          'studentAnswers.question',
          'studentAnswers.question.answers',
          'studentAnswers.answer',
        ],
        order: {
          score: 'DESC', // Sắp xếp theo điểm cao nhất
          submittedAt: 'ASC',
        },
      });

      if (studentExams.length === 0) {
        const result = {
          examId,
          examName: exam.name,
          totalStudents: 0,
          results: [],
          statistics: {
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passCount: 0,
            failCount: 0,
          },
        };

        // Lưu vào cache với TTL ngắn hơn (5 phút) vì có thể có sinh viên nộp bài mới
        await this.redisService.set(cacheKey, JSON.stringify(result), 300);

        return result;
      }

      // Format kết quả cho từng sinh viên
      const results = studentExams.map((studentExam) =>
        this.formatExamResult(studentExam),
      );

      // Tính thống kê chung
      const scores = studentExams.map((se) => se.score || 0);
      const averageScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      const passThreshold = (exam.maxScore || 100) * 0.5; // 50% để pass
      const passCount = scores.filter((score) => score >= passThreshold).length;
      const failCount = scores.length - passCount;

      const result = {
        examId,
        examName: exam.name,
        totalStudents: studentExams.length,
        results,
        statistics: {
          averageScore: Math.round(averageScore * 100) / 100,
          highestScore,
          lowestScore,
          passCount,
          failCount,
          passRate: Math.round((passCount / scores.length) * 100),
        },
      };

      // Lưu vào cache với TTL ngắn hơn (5 phút) vì có thể có sinh viên nộp bài mới
      await this.redisService.set(cacheKey, JSON.stringify(result), 300);

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in getAllStudentResultsForExam: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const exam = await this.examRepo.findOneBy({ id: examId });
      if (!exam) {
        throw new NotFoundException(`Exam with ID ${examId} not found`);
      }

      const studentExams = await this.studentExamRepo.find({
        where: {
          exam: { id: examId },
          isSubmitted: true,
        },
        relations: [
          'exam',
          'exam.subject',
          'student',
          'studentAnswers',
          'studentAnswers.question',
          'studentAnswers.question.answers',
          'studentAnswers.answer',
        ],
        order: {
          score: 'DESC',
          submittedAt: 'ASC',
        },
      });

      if (studentExams.length === 0) {
        return {
          examId,
          examName: exam.name,
          totalStudents: 0,
          results: [],
          statistics: {
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passCount: 0,
            failCount: 0,
          },
        };
      }

      const results = studentExams.map((studentExam) =>
        this.formatExamResult(studentExam),
      );

      const scores = studentExams.map((se) => se.score || 0);
      const averageScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      const passThreshold = (exam.maxScore || 100) * 0.5;
      const passCount = scores.filter((score) => score >= passThreshold).length;
      const failCount = scores.length - passCount;

      return {
        examId,
        examName: exam.name,
        totalStudents: studentExams.length,
        results,
        statistics: {
          averageScore: Math.round(averageScore * 100) / 100,
          highestScore,
          lowestScore,
          passCount,
          failCount,
          passRate: Math.round((passCount / scores.length) * 100),
        },
      };
    }
  }

  /**
   * Helper method: Format kết quả thi (tách logic chung)
   */
  private formatExamResult(studentExam: any) {
    const { exam, student, studentAnswers } = studentExam;
    const totalQuestions = exam.totalQuestions || 0;
    const maxScore = exam.maxScore || 100;
    const score = studentExam.score || 0;
    const scorePercentage =
      maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Phân tích từng câu trả lời
    const questionResults = studentAnswers.map((studentAnswer: any) => {
      const question = studentAnswer.question;
      const correctAnswer = question.answers.find((a: any) => a.isCorrect);
      const studentSelectedAnswer = studentAnswer.answer;
      const isCorrect =
        studentSelectedAnswer && correctAnswer
          ? studentSelectedAnswer.id === correctAnswer.id
          : false;

      return {
        questionId: question.id,
        questionText: question.questionText,
        passageText: question.passageText,
        imageUrl: question.imageUrl,
        audioUrl: question.audioUrl,
        difficultyLevel: question.difficultyLevel,
        answers: question.answers.map((answer: any) => ({
          id: answer.id,
          answerText: answer.answerText,
          isCorrect: answer.isCorrect,
          isSelected: studentSelectedAnswer
            ? answer.id === studentSelectedAnswer.id
            : false,
        })),
        studentAnswer: {
          answerId: studentAnswer.answerId,
          isCorrect,
          answeredAt: studentAnswer.answeredAt,
          isMarked: studentAnswer.isMarked,
        },
      };
    });

    // Thống kê kết quả
    const correctAnswers = questionResults.filter(
      (q: any) => q.studentAnswer.isCorrect,
    ).length;
    const incorrectAnswers = questionResults.filter(
      (q: any) =>
        !q.studentAnswer.isCorrect && q.studentAnswer.answerId !== null,
    ).length;
    // Tính số câu chưa trả lời: tổng số câu - số câu đã trả lời (đúng + sai)
    const answeredQuestions = correctAnswers + incorrectAnswers;
    const unansweredQuestions = totalQuestions - answeredQuestions;

    return {
      studentExamInfo: {
        id: studentExam.id,
        student: {
          id: student.id,
          fullName: student.fullName,
          studentCode: student.studentCode,
        },
        exam: {
          id: exam.id,
          name: exam.name,
          subject: exam.subject,
          duration: exam.duration,
          totalQuestions,
          maxScore,
        },
        result: {
          score,
          scorePercentage,
          startedAt: studentExam.startedAt,
          submittedAt: studentExam.submittedAt,
          timeTaken: this.calculateTimeTaken(
            studentExam.startedAt || new Date(),
            studentExam.submittedAt,
          ),
        },
      },
      statistics: {
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        accuracyPercentage:
          totalQuestions > 0
            ? Math.round((correctAnswers / totalQuestions) * 100)
            : 0,
      },
      questionResults,
    };
  }

  /**
   * Helper method: Tính thời gian làm bài (phút)
   */
  private calculateTimeTaken(
    startedAt: Date,
    submittedAt: Date | null,
  ): number {
    if (!submittedAt) return 0;
    const timeDiff = submittedAt.getTime() - startedAt.getTime();
    return Math.round(timeDiff / (1000 * 60)); // Chuyển đổi sang phút
  }

  /**
   * Lấy danh sách tất cả đề thi đã hoàn thành của sinh viên (cả practice và official)
   * @param studentId ID của sinh viên
   * @returns Danh sách đề thi đã hoàn thành với điểm số và thời gian
   */
  async getAllCompletedExams(studentId: number) {
    const cacheKey = `${this.CACHE_KEYS.ALL_COMPLETED_EXAMS}${studentId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for all completed exams: ${cacheKey}`);
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      this.logger.log(`Cache miss for all completed exams: ${cacheKey}`);

      // Kiểm tra student có tồn tại không
      const student = await this.studentRepo.findOneBy({ id: studentId });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      // Lấy tất cả bài thi đã hoàn thành (đã submit)
      const completedExams = await this.studentExamRepo.find({
        where: {
          student: { id: studentId },
          isSubmitted: true,
        },
        relations: ['exam', 'exam.subject'],
        order: {
          submittedAt: 'DESC',
        },
      });

      // Format kết quả
      const result = completedExams.map((studentExam) => {
        const totalQuestions = studentExam.exam.totalQuestions || 0;
        const maxScore = studentExam.exam.maxScore || 100;
        const score = studentExam.score || 0;
        const scorePercentage =
          maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        return {
          studentExamId: studentExam.id,
          exam: {
            id: studentExam.exam.id,
            name: studentExam.exam.name,
            subject: studentExam.exam.subject,
            examType: studentExam.exam.examType,
            duration: studentExam.exam.duration,
            totalQuestions,
            maxScore,
          },
          result: {
            score,
            scorePercentage,
            startedAt: studentExam.startedAt,
            submittedAt: studentExam.submittedAt,
            timeTaken: this.calculateTimeTaken(
              studentExam.startedAt || new Date(),
              studentExam.submittedAt,
            ),
          },
        };
      });

      // Phân loại kết quả theo loại đề thi
      const practiceExams = result.filter(
        (exam) => exam.exam.examType === 'practice',
      );

      const officialExams = result.filter(
        (exam) => exam.exam.examType === 'official',
      );

      const finalResult = {
        studentId,
        totalCompletedExams: result.length,
        totalPracticeExams: practiceExams.length,
        totalOfficialExams: officialExams.length,
        completedExams: result,
        practiceExams,
        officialExams,
      };

      // Lưu vào cache với TTL ngắn hơn (5 phút) vì có thể có bài thi mới được hoàn thành
      await this.redisService.set(cacheKey, JSON.stringify(finalResult), 300);

      return finalResult;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in getAllCompletedExams: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const student = await this.studentRepo.findOneBy({ id: studentId });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      const completedExams = await this.studentExamRepo.find({
        where: {
          student: { id: studentId },
          isSubmitted: true,
        },
        relations: ['exam', 'exam.subject'],
        order: {
          submittedAt: 'DESC',
        },
      });

      const result = completedExams.map((studentExam) => {
        const totalQuestions = studentExam.exam.totalQuestions || 0;
        const maxScore = studentExam.exam.maxScore || 100;
        const score = studentExam.score || 0;
        const scorePercentage =
          maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        return {
          studentExamId: studentExam.id,
          exam: {
            id: studentExam.exam.id,
            name: studentExam.exam.name,
            subject: studentExam.exam.subject,
            examType: studentExam.exam.examType,
            duration: studentExam.exam.duration,
            totalQuestions,
            maxScore,
          },
          result: {
            score,
            scorePercentage,
            startedAt: studentExam.startedAt,
            submittedAt: studentExam.submittedAt,
            timeTaken: this.calculateTimeTaken(
              studentExam.startedAt || new Date(),
              studentExam.submittedAt,
            ),
          },
        };
      });

      const practiceExams = result.filter(
        (exam) => exam.exam.examType === 'practice',
      );

      const officialExams = result.filter(
        (exam) => exam.exam.examType === 'official',
      );

      return {
        studentId,
        totalCompletedExams: result.length,
        totalPracticeExams: practiceExams.length,
        totalOfficialExams: officialExams.length,
        completedExams: result,
        practiceExams,
        officialExams,
      };
    }
  }

  async getStudentExamResults(filters?: {
    classId?: number;
    subjectId?: number;
    examType?: string;
    specificDate?: string; // Format: YYYY-MM-DD
    startDate?: string; // Format: YYYY-MM-DD
    endDate?: string; // Format: YYYY-MM-DD
  }): Promise<any[]> {
    // Tạo cache key dựa trên filters
    const filterKey = filters
      ? `${filters.classId || 'all'}_${filters.subjectId || 'all'}_${
          filters.examType || 'all'
        }_${filters.specificDate || 'all'}_${filters.startDate || 'all'}_${filters.endDate || 'all'}`
      : 'all_all_all_all_all_all';
    const cacheKey = `${this.CACHE_KEYS.STUDENT_EXAM_RESULTS}${filterKey}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for student exam results: ${cacheKey}`);
        return JSON.parse(cachedData) as any[];
      }

      // Nếu không có trong cache, truy vấn database
      this.logger.log(`Cache miss for student exam results: ${cacheKey}`);

      const queryBuilder = this.studentExamRepo
        .createQueryBuilder('se')
        .leftJoinAndSelect('se.student', 'student')
        .leftJoinAndSelect('student.class', 'class')
        .leftJoinAndSelect('se.exam', 'exam')
        .leftJoinAndSelect('exam.subject', 'subject')
        .where('se.submittedAt IS NOT NULL'); // Chỉ lấy các bài thi đã nộp

      // Áp dụng các bộ lọc nếu có
      if (filters?.classId) {
        queryBuilder.andWhere('class.id = :classId', {
          classId: filters.classId,
        });
      }

      if (filters?.subjectId) {
        queryBuilder.andWhere('subject.id = :subjectId', {
          subjectId: filters.subjectId,
        });
      }

      if (filters?.examType) {
        queryBuilder.andWhere('exam.examType = :examType', {
          examType: filters.examType,
        });
      }

      // Áp dụng bộ lọc theo ngày
      if (filters?.specificDate) {
        // Lọc theo ngày cụ thể (chỉ ngày, không tính giờ)
        const startOfDay = new Date(`${filters.specificDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${filters.specificDate}T23:59:59.999Z`);
        queryBuilder.andWhere('se.submittedAt >= :startOfDay AND se.submittedAt <= :endOfDay', {
          startOfDay,
          endOfDay,
        });
      } else if (filters?.startDate || filters?.endDate) {
        // Lọc theo khoảng thời gian
        if (filters.startDate) {
          const startDate = new Date(`${filters.startDate}T00:00:00.000Z`);
          queryBuilder.andWhere('se.submittedAt >= :startDate', { startDate });
        }
        if (filters.endDate) {
          const endDate = new Date(`${filters.endDate}T23:59:59.999Z`);
          queryBuilder.andWhere('se.submittedAt <= :endDate', { endDate });
        }
      }

      queryBuilder.orderBy('se.submittedAt', 'DESC');

      const studentExams = await queryBuilder.getMany();

      // Chuyển đổi dữ liệu thành format mong muốn
      const results = studentExams.map((se) => {
        const startTime = se.startedAt ? new Date(se.startedAt) : null;
        const submitTime = se.submittedAt ? new Date(se.submittedAt) : null;

        // Tính thời gian làm bài thực tế
        let actualDuration = '0 phút';
        if (startTime && submitTime) {
          const durationMs = submitTime.getTime() - startTime.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));
          actualDuration = `${durationMinutes} phút`;
        }

        return {
          studentName: se.student?.fullName || 'N/A',
          studentId: se.student?.studentCode || 'N/A',
          examName: se.exam?.name || 'N/A',
          score: se.score || 0,
          maxScore: se.exam?.maxScore || 10,
          duration: se.exam?.duration ? `${se.exam.duration} phút` : 'N/A',
          actualDuration,
          startTime: startTime
            ? startTime.toISOString().replace('T', ' ').substring(0, 19)
            : 'N/A',
          submitTime: submitTime
            ? submitTime.toISOString().replace('T', ' ').substring(0, 19)
            : 'N/A',
          class: se.student?.class?.name || 'N/A',
          subject: se.exam?.subject?.name || 'N/A',
          type: se.exam?.examType || 'N/A',
          studentExamId: se.id,
          examId: se.exam?.id,
          studentDbId: se.student?.id,
          classId: se.student?.class?.id,
          subjectId: se.exam?.subject?.id,
        };
      });

      // Lưu vào cache với TTL ngắn hơn (5 phút) vì dữ liệu có thể thay đổi thường xuyên
      await this.redisService.set(
        cacheKey,
        JSON.stringify(results),
        300, // 5 phút
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Error in getStudentExamResults: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
