import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import { ActivityLog } from '../../common/decorators/activity-log.decorator';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:create')
  @ActivityLog({ action: 'CREATE', module: 'exam' })
  async createExam(@Body() createExamDto: CreateExamDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.examService.createExam(createExamDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:update')
  @ActivityLog({ action: 'UPDATE', module: 'exam' })
  async updateExam(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.examService.updateExam(id, updateExamDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:delete')
  @ActivityLog({ action: 'DELETE', module: 'exam' })
  async deleteExam(@Param('id', ParseIntPipe) id: number) {
    // Lấy thông tin đề thi trước khi xóa
    const exam = await this.examService.getExamById(id);
    
    // Thực hiện xóa
    await this.examService.deleteExam(id);
    
    return { 
      message: 'Xoá đề thi thành công',
      data: exam // Trả về thông tin đề thi đã xóa
    };
  }

  @Post(':id/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:view')
  @ActivityLog({
    action: 'EXPORT',
    module: 'exam',
    description: 'đã export đề thi',
  })
  async exportExam(
    @Param('id', ParseIntPipe) id: number,
    @Query('format') format: 'excel' | 'csv' = 'excel',
    @Res() res: Response,
  ) {
    const result = await this.examService.exportExamWithQuestions(id, format);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getExamById(@Param('id', ParseIntPipe) id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.examService.getExamById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllExams() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.examService.getAllExams();
  }

  @Get(':id/questions')
  @UseGuards(JwtAuthGuard)
  async getQuestionsOfExam(@Param('id', ParseIntPipe) id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.examService.getQuestionsOfExam(id);
  }

  // 🔥 THÊM: Endpoint mới cho student lấy câu hỏi với randomization
  @Get(':id/questions/student/:assignmentId')
  @UseGuards(JwtAuthGuard)
  async getQuestionsForStudent(
    @Param('id', ParseIntPipe) examId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Query('studentId', ParseIntPipe) studentId?: number,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.examService.getQuestionsForStudent(
      examId,
      assignmentId,
      studentId,
    );
  }

  @Get('subject/:subjectId')
  @UseGuards(JwtAuthGuard)
  async getExamsBySubject(@Param('subjectId') subjectId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.examService.getExamsBySubject(+subjectId);
  }
}
