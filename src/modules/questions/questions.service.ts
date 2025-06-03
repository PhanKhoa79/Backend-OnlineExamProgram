// src/modules/questions/question.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Questions)
    private readonly questionRepo: Repository<Questions>,

    @InjectRepository(Subjects)
    private readonly subjectRepo: Repository<Subjects>,
  ) {}

  async create(dto: CreateQuestionDto): Promise<QuestionDto> {
    const subject = await this.subjectRepo.findOne({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const entity = QuestionMapper.toEntity(dto);
    entity.subject = subject;

    const saved = await this.questionRepo.save(entity);
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
        await this.questionRepo.manager.remove(toRemove); // dùng manager để xoá liên kết
      }

      question.answers = updatedAnswers;
    }

    // optional update subject
    if (dto.subjectId) {
      const subject = await this.subjectRepo.findOne({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new NotFoundException('Subject not found');
      question.subject = subject;
    }

    const updated = await this.questionRepo.save(question);
    return QuestionMapper.toDto(updated);
  }


  async delete(id: number): Promise<void> {
    const question = await this.questionRepo.findOneBy({ id });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionRepo.remove(question);
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

        // Gán lại toàn bộ (bao gồm các answer cũ + answer được update + answer mới)
        question.answers = existingAnswers;
      }

      const updated = await this.questionRepo.save(question);
      results.push(QuestionMapper.toDto(updated));
    }

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
  }

  async findById(id: number): Promise<QuestionDto> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: ['answers', 'subject'],
    });
    if (!question) throw new NotFoundException('Question not found');
    return QuestionMapper.toDto(question);
  }

  async findAll(): Promise<QuestionDto[]> {
    const list = await this.questionRepo.find({
      relations: ['answers', 'subject'],
      order: { createdAt: 'DESC' },
    });
    return list.map((q) => QuestionMapper.toDto(q));
  }

  async findByDifficulty(level: DifficultyLevel): Promise<QuestionDto[]> {
    const list = await this.questionRepo.find({
      where: { difficultyLevel: level },
      relations: ['answers', 'subject'],
    });
    return list.map((q) => QuestionMapper.toDto(q));
  }

  async findBySubject(subjectId: number): Promise<QuestionDto[]> {
    const list = await this.questionRepo.find({
      where: { subject: { id: subjectId } },
      relations: ['answers', 'subject'],
    });
    return list.map((q) => QuestionMapper.toDto(q));
  }
}
