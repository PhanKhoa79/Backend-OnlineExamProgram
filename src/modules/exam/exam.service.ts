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
import * as ExcelJS from 'exceljs';

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
    return await this.examRepo.find({
      relations: ['subject'],
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async getQuestionsOfExam(id: number): Promise<Questions[]> {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['questions', 'questions.answers'],
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam.questions;
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
