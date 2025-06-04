import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exams } from 'src/database/entities/Exams';
import { Questions } from 'src/database/entities/Questions';
import { In, Repository } from 'typeorm';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Subjects } from 'src/database/entities/Subjects';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exams)
    private examRepo: Repository<Exams>,

    @InjectRepository(Questions)
    private questionRepo: Repository<Questions>,

    @InjectRepository(Subjects)
    private subjectRepo: Repository<Subjects>,
  ) {}
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

    return this.examRepo.save(exam);
  }

  async updateExam(id: number, updateExamDto: UpdateExamDto): Promise<Exams> {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['questions', 'subject'],
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    const { questionIds, totalQuestions, subjectId } = updateExamDto;

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

        exam.questions = updatedQuestions;
      } else {
        // Số lượng câu hỏi thay đổi, cần totalQuestions để xác nhận
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

    return this.examRepo.save(exam);
  }

  async deleteExam(id: number): Promise<void> {
    await this.examRepo.delete(id);
  }

  async getExamById(id: number): Promise<Exams> {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['questions', 'subject'],
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async getExamsBySubject(subjectId: number): Promise<Exams[]> {
    return this.examRepo.find({
      where: {
        subject: {
          id: subjectId,
        },
      },
      relations: ['subject'],
    });
  }
  async getAllExams(): Promise<Exams[]> {
    return await this.examRepo.find({ relations: ['subject'] });
  }

  async getQuestionsOfExam(id: number): Promise<Questions[]> {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['questions'],
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam.questions;
  }
}
