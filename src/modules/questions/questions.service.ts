// src/modules/questions/question.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Questions } from 'src/database/entities/Questions';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionMapper } from './mapper/question.mapper';
import { QuestionDto } from './dto/question.dto';
import { Subjects } from 'src/database/entities/Subjects';
import { DifficultyLevel } from 'src/database/entities/Questions';
import { Answers } from 'src/database/entities/Answers';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { SubjectService } from '../subject/subject.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);
  private readonly CACHE_KEYS = {
    QUESTIONS_LIST: 'questions_list',
    QUESTION_DETAIL: 'question_detail_',
    QUESTIONS_BY_SUBJECT: 'questions_by_subject_',
    QUESTIONS_BY_DIFFICULTY: 'questions_by_difficulty_',
  };
  private readonly CACHE_TTL = 600; // 10 phút (giây)

  constructor(
    @InjectRepository(Questions)
    private readonly questionRepo: Repository<Questions>,

    @InjectRepository(Subjects)
    private readonly subjectRepo: Repository<Subjects>,

    private readonly subjectService: SubjectService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Xóa cache khi có thay đổi dữ liệu
   */
  private async invalidateCache(key?: string): Promise<void> {
    try {
      if (key) {
        await this.redisService.del(key);
        this.logger.log(`🗑️ Invalidated cache: ${key}`);
      } else {
        // Xóa cache danh sách câu hỏi
        await this.redisService.del(this.CACHE_KEYS.QUESTIONS_LIST);
        this.logger.log(`🗑️ Invalidated questions list cache`);

        // Xóa cache chi tiết câu hỏi
        const detailCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.QUESTION_DETAIL}*`,
        );
        for (const cacheKey of detailCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache câu hỏi theo môn học
        const subjectCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.QUESTIONS_BY_SUBJECT}*`,
        );
        for (const cacheKey of subjectCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Xóa cache câu hỏi theo độ khó
        const difficultyCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.QUESTIONS_BY_DIFFICULTY}*`,
        );
        for (const cacheKey of difficultyCacheKeys) {
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

  async create(dto: CreateQuestionDto): Promise<QuestionDto> {
    const subject = await this.subjectRepo.findOne({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const entity = QuestionMapper.toEntity(dto);
    entity.subject = subject;

    const saved = await this.questionRepo.save(entity);

    // Xóa cache sau khi tạo mới
    await this.invalidateCache();

    return QuestionMapper.toDto(saved);
  }

  async createMany(dtos: CreateQuestionDto[]): Promise<QuestionDto[]> {
    const result: QuestionDto[] = [];

    for (const dto of dtos) {
      const subject = await this.subjectRepo.findOne({
        where: { id: dto.subjectId },
      });
      if (!subject)
        throw new NotFoundException(`Subject ID ${dto.subjectId} not found`);

      const entity = QuestionMapper.toEntity(dto);
      entity.subject = subject;

      const saved = await this.questionRepo.save(entity);
      result.push(QuestionMapper.toDto(saved));
    }

    // Xóa cache sau khi tạo nhiều câu hỏi
    await this.invalidateCache();

    return result;
  }

  async update(id: number, dto: UpdateQuestionDto): Promise<QuestionDto> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: ['answers', 'subject'],
    });
    if (!question) throw new NotFoundException('Question not found');

    QuestionMapper.updateEntity(question, dto);

    // Cập nhật answers nếu có truyền vào
    if (dto.answers) {
      const existingAnswers = question.answers || [];

      const updatedAnswers: Answers[] = [];

      for (const incoming of dto.answers) {
        if (incoming.id) {
          // Cập nhật answer cũ
          const existing = existingAnswers.find((a) => a.id === incoming.id);
          if (existing) {
            existing.answerText = incoming.answerText;
            existing.isCorrect = incoming.isCorrect;
            updatedAnswers.push(existing);
          }
        } else {
          // Tạo answer mới
          const newAnswer = new Answers();
          newAnswer.answerText = incoming.answerText;
          newAnswer.isCorrect = incoming.isCorrect;
          newAnswer.question = question;
          updatedAnswers.push(newAnswer);
        }
      }

      // Xoá answer cũ không còn trong dto
      const incomingIds = dto.answers.filter((a) => a.id).map((a) => a.id);
      const toRemove = existingAnswers.filter(
        (a) => !incomingIds.includes(a.id),
      );
      if (toRemove.length > 0) {
        await this.questionRepo.manager.remove(toRemove);
      }

      question.answers = updatedAnswers;

      question.updatedAt = new Date();
    }

    if (dto.subjectId) {
      const subject = await this.subjectRepo.findOne({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new NotFoundException('Subject not found');
      question.subject = subject;
    }

    const updated = await this.questionRepo.save(question);

    // Xóa cache sau khi cập nhật
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.QUESTION_DETAIL}${id}`);
    if (question.subject) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.QUESTIONS_BY_SUBJECT}${question.subject.id}`,
      );
    }
    if (question.difficultyLevel) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.QUESTIONS_BY_DIFFICULTY}${question.difficultyLevel}`,
      );
    }

    return QuestionMapper.toDto(updated);
  }

  async delete(id: number): Promise<void> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: ['subject'],
    });
    if (!question) throw new NotFoundException('Question not found');

    const subjectId = question.subject?.id;
    const difficultyLevel = question.difficultyLevel;

    await this.questionRepo.remove(question);

    // Xóa cache sau khi xóa
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.QUESTION_DETAIL}${id}`);
    if (subjectId) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.QUESTIONS_BY_SUBJECT}${subjectId}`,
      );
    }
    if (difficultyLevel) {
      await this.invalidateCache(
        `${this.CACHE_KEYS.QUESTIONS_BY_DIFFICULTY}${difficultyLevel}`,
      );
    }
  }

  async updateMany(
    updateDtos: { id: number; data: UpdateQuestionDto }[],
  ): Promise<QuestionDto[]> {
    const results: QuestionDto[] = [];

    for (const { id, data } of updateDtos) {
      const question = await this.questionRepo.findOne({
        where: { id },
        relations: ['answers', 'subject'],
      });

      if (!question) {
        throw new NotFoundException(`Question with id ${id} not found`);
      }

      QuestionMapper.updateEntity(question, data);

      // Cập nhật subject nếu có
      if (data.subjectId) {
        const subject = await this.subjectRepo.findOne({
          where: { id: data.subjectId },
        });
        if (!subject) {
          throw new NotFoundException(`Subject ID ${data.subjectId} not found`);
        }
        question.subject = subject;
      }

      // Cập nhật answers nếu có
      if (data.answers) {
        const existingAnswers = question.answers || [];

        for (const incoming of data.answers) {
          if (incoming.id) {
            // Update existing answer
            const existing = existingAnswers.find((a) => a.id === incoming.id);
            if (existing) {
              existing.answerText = incoming.answerText;
              existing.isCorrect = incoming.isCorrect;
            }
          } else {
            // Add new answer
            const newAnswer = new Answers();
            newAnswer.answerText = incoming.answerText;
            newAnswer.isCorrect = incoming.isCorrect;
            newAnswer.question = question;
            existingAnswers.push(newAnswer);
          }
        }

        question.answers = existingAnswers;

        question.updatedAt = new Date();
      }

      const updated = await this.questionRepo.save(question);
      results.push(QuestionMapper.toDto(updated));
    }

    // Xóa cache sau khi cập nhật nhiều câu hỏi
    await this.invalidateCache();

    return results;
  }

  async deleteMany(ids: number[]): Promise<void> {
    const questions = await this.questionRepo.findByIds(ids);
    const foundIds = questions.map((q) => q.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `Questions with ids ${notFoundIds.join(', ')} not found`,
      );
    }

    await this.questionRepo.remove(questions);

    // Xóa cache sau khi xóa nhiều câu hỏi
    await this.invalidateCache();
  }

  async findById(id: number): Promise<QuestionDto> {
    const cacheKey = `${this.CACHE_KEYS.QUESTION_DETAIL}${id}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const question = await this.questionRepo.findOne({
        where: { id },
        relations: ['answers', 'subject'],
      });

      if (!question) {
        throw new NotFoundException(`Question with id ${id} not found`);
      }

      const dto = QuestionMapper.toDto(question);

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(dto),
        this.CACHE_TTL,
      );

      return dto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in findById: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const question = await this.questionRepo.findOne({
        where: { id },
        relations: ['answers', 'subject'],
      });

      if (!question) {
        throw new NotFoundException(`Question with id ${id} not found`);
      }

      return QuestionMapper.toDto(question);
    }
  }

  async findAll(): Promise<QuestionDto[]> {
    const cacheKey = this.CACHE_KEYS.QUESTIONS_LIST;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const questions = await this.questionRepo.find({
        relations: ['answers', 'subject'],
        order: { createdAt: 'DESC' },
      });

      const dtos = questions.map(QuestionMapper.toDto);

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(dtos),
        this.CACHE_TTL,
      );

      return dtos;
    } catch (error) {
      this.logger.error(
        `Error in findAll: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const questions = await this.questionRepo.find({
        relations: ['answers', 'subject'],
        order: { createdAt: 'DESC' },
      });

      return questions.map(QuestionMapper.toDto);
    }
  }

  async findByDifficulty(level: DifficultyLevel): Promise<QuestionDto[]> {
    const cacheKey = `${this.CACHE_KEYS.QUESTIONS_BY_DIFFICULTY}${level}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`✅ Cache hit: ${cacheKey}`);
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const questions = await this.questionRepo.find({
        where: { difficultyLevel: level },
        relations: ['answers', 'subject'],
      });

      const dtos = questions.map(QuestionMapper.toDto);

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(dtos),
        this.CACHE_TTL,
      );

      return dtos;
    } catch (error) {
      this.logger.error(
        `Error in findByDifficulty: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const questions = await this.questionRepo.find({
        where: { difficultyLevel: level },
        relations: ['answers', 'subject'],
      });

      return questions.map(QuestionMapper.toDto);
    }
  }

  async findBySubject(subjectId: number): Promise<QuestionDto[]> {
    const cacheKey = `${this.CACHE_KEYS.QUESTIONS_BY_SUBJECT}${subjectId}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        this.logger.log(`✅ Cache hit: ${cacheKey}`);
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const questions = await this.questionRepo.find({
        where: { subject: { id: subjectId } },
        relations: ['answers', 'subject'],
      });

      const dtos = questions.map(QuestionMapper.toDto);

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(dtos),
        this.CACHE_TTL,
      );

      return dtos;
    } catch (error) {
      this.logger.error(
        `Error in findBySubject: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const questions = await this.questionRepo.find({
        where: { subject: { id: subjectId } },
        relations: ['answers', 'subject'],
      });

      return questions.map(QuestionMapper.toDto);
    }
  }

  // Các phương thức nhập/xuất file không cần cache
  async importQuestionsFromFile(filePath: string, type: 'xlsx' | 'csv') {
    const questions: CreateQuestionDto[] = [];

    if (type === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error('Không tìm thấy worksheet!');
      }

      const questionRows: { rowNumber: number; values: unknown[] }[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const values = row.values as unknown[];
        questionRows.push({
          rowNumber,
          values: values.slice(1),
        });
      });

      let currentQuestion: Partial<CreateQuestionDto> | null = null;
      const answers: { answerText: string; isCorrect: boolean }[] = [];

      for (const rowData of questionRows) {
        const [
          questionText,
          imageUrl,
          audioUrl,
          passageText,
          difficultyLevel,
          subjectId,
          answerText,
          isCorrect,
        ] = rowData.values;

        if (
          questionText &&
          typeof questionText === 'string' &&
          questionText.trim()
        ) {
          if (currentQuestion && answers.length > 0) {
            questions.push({
              ...currentQuestion,
              answers: [...answers] as CreateQuestionDto['answers'],
            } as CreateQuestionDto);
            answers.length = 0;
          }

          currentQuestion = {
            questionText: String(questionText),
            imageUrl:
              imageUrl && typeof imageUrl === 'string' ? imageUrl : undefined,
            audioUrl:
              audioUrl && typeof audioUrl === 'string' ? audioUrl : undefined,
            passageText:
              passageText && typeof passageText === 'string'
                ? passageText
                : undefined,
            difficultyLevel:
              difficultyLevel && typeof difficultyLevel === 'string'
                ? (difficultyLevel as DifficultyLevel)
                : undefined,
            subjectId: Number(subjectId),
          };
        }

        if (answerText && typeof answerText === 'string' && answerText.trim()) {
          answers.push({
            answerText: String(answerText),
            isCorrect: Boolean(
              isCorrect === true || isCorrect === 'true' || isCorrect === 1,
            ),
          });
        }
      }

      if (currentQuestion && answers.length > 0) {
        questions.push({
          ...currentQuestion,
          answers: [...answers] as CreateQuestionDto['answers'],
        } as CreateQuestionDto);
      }
    } else if (type === 'csv') {
      await new Promise<void>((resolve, reject) => {
        const questionRows: Record<string, string>[] = [];

        fs.createReadStream(filePath)
          .pipe(csv({ separator: ',' }))
          .on('data', (data: Record<string, string>) => {
            questionRows.push(data);
          })
          .on('end', () => {
            let currentQuestion: Partial<CreateQuestionDto> | null = null;
            const answers: { answerText: string; isCorrect: boolean }[] = [];

            for (const data of questionRows) {
              const {
                questionText,
                imageUrl,
                audioUrl,
                passageText,
                difficultyLevel,
                subjectId,
                answerText,
                isCorrect,
              } = data;

              if (questionText && questionText.trim()) {
                if (currentQuestion && answers.length > 0) {
                  questions.push({
                    ...currentQuestion,
                    answers: [...answers] as CreateQuestionDto['answers'],
                  } as CreateQuestionDto);
                  answers.length = 0;
                }

                currentQuestion = {
                  questionText: questionText,
                  imageUrl: imageUrl || undefined,
                  audioUrl: audioUrl || undefined,
                  passageText: passageText || undefined,
                  difficultyLevel: difficultyLevel
                    ? (difficultyLevel as DifficultyLevel)
                    : undefined,
                  subjectId: Number(subjectId),
                };
              }

              if (answerText && answerText.trim()) {
                answers.push({
                  answerText: answerText,
                  isCorrect: isCorrect === 'true' || isCorrect === '1',
                });
              }
            }

            if (currentQuestion && answers.length > 0) {
              questions.push({
                ...currentQuestion,
                answers: [...answers] as CreateQuestionDto['answers'],
              } as CreateQuestionDto);
            }

            resolve();
          })
          .on('error', reject);
      });
    } else {
      throw new Error('Loại file không hỗ trợ!');
    }

    const result = await this.createMany(questions);
    fs.unlinkSync(filePath);
    return result;
  }

  async exportQuestions(
    questions: QuestionDto[],
    res: Response,
    format: 'excel' | 'csv' = 'excel',
  ) {
    const bom = '\uFEFF';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Questions');

    worksheet.columns = [
      { header: 'Question Text', key: 'questionText', width: 50 },
      { header: 'Image URL', key: 'imageUrl', width: 30 },
      { header: 'Audio URL', key: 'audioUrl', width: 30 },
      { header: 'Passage Text', key: 'passageText', width: 40 },
      { header: 'Difficulty Level', key: 'difficultyLevel', width: 15 },
      { header: 'Subject Name', key: 'subjectName', width: 20 },
      { header: 'Answer Text', key: 'answerText', width: 40 },
      { header: 'Is Correct', key: 'isCorrect', width: 12 },
    ];

    const subjectMap = new Map<number, string>();
    for (const question of questions) {
      if (question.subjectId && !subjectMap.has(question.subjectId)) {
        try {
          const subject = await this.subjectService.findById(
            question.subjectId,
          );
          subjectMap.set(question.subjectId, subject.name);
        } catch {
          subjectMap.set(
            question.subjectId,
            `Subject ID: ${question.subjectId}`,
          );
        }
      }
    }

    questions.forEach((question) => {
      const subjectName = question.subjectId
        ? subjectMap.get(question.subjectId) ||
          `Subject ID: ${question.subjectId}`
        : '';

      if (question.answers && question.answers.length > 0) {
        question.answers.forEach((answer, index) => {
          worksheet.addRow({
            questionText: index === 0 ? question.questionText : '',
            imageUrl: index === 0 ? question.imageUrl || '' : '',
            audioUrl: index === 0 ? question.audioUrl || '' : '',
            passageText: index === 0 ? question.passageText || '' : '',
            difficultyLevel: index === 0 ? question.difficultyLevel || '' : '',
            subjectName: index === 0 ? subjectName : '',
            answerText: answer.answerText,
            isCorrect: answer.isCorrect ? 'TRUE' : 'FALSE',
          });
        });
      } else {
        // Question without answers
        worksheet.addRow({
          questionText: question.questionText,
          imageUrl: question.imageUrl || '',
          audioUrl: question.audioUrl || '',
          passageText: question.passageText || '',
          difficultyLevel: question.difficultyLevel || '',
          subjectName: subjectName,
          answerText: '',
          isCorrect: '',
        });
      }
    });

    if (format === 'excel') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="questions.xlsx"',
      );
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="questions.csv"',
      );
      const buffer = await workbook.csv.writeBuffer();
      res.write(bom);
      res.write(buffer);
      res.end();
    }
  }
}
