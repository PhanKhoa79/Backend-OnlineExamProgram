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

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:create')
  async createExam(@Body() createExamDto: CreateExamDto) {
    return await this.examService.createExam(createExamDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:update')
  async updateExam(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return await this.examService.updateExam(id, updateExamDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:delete')
  async deleteExam(@Param('id', ParseIntPipe) id: number) {
    await this.examService.deleteExam(id);
    return { message: 'Xoá đề thi thành công' };
  }

  @Post(':id/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('exam:view')
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
    return await this.examService.getExamById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllExams() {
    return await this.examService.getAllExams();
  }

  @Get(':id/questions')
  @UseGuards(JwtAuthGuard)
  async getQuestionsOfExam(@Param('id', ParseIntPipe) id: number) {
    return await this.examService.getQuestionsOfExam(id);
  }

  @Get('subject/:subjectId')
  @UseGuards(JwtAuthGuard)
  async getExamsBySubject(@Param('subjectId') subjectId: string) {
    return await this.examService.getExamsBySubject(+subjectId);
  }
}
