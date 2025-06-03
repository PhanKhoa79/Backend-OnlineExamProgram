import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionDto } from './dto/question.dto';
import { DifficultyLevel } from 'src/database/entities/Questions';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateManyQuestionDto } from '../student/dto/create-many-question.dto';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:create')
  async create(@Body() dto: CreateQuestionDto): Promise<QuestionDto> {
    return this.questionsService.create(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:create')
  async createMany(@Body() dto: CreateManyQuestionDto): Promise<QuestionDto[]> {
    return this.questionsService.createMany(dto.questions);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionDto,
  ): Promise<QuestionDto> {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.questionsService.delete(id);
    return { message: 'Xóa câu hỏi thành công'};
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:view')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<QuestionDto> {
    return this.questionsService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:view')
  async findAll(): Promise<QuestionDto[]> {
    return this.questionsService.findAll();
  }

  @Get('/by-difficulty')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:view')
  async findByDifficulty(
    @Query('level') level: DifficultyLevel,
  ): Promise<QuestionDto[]> {
    return this.questionsService.findByDifficulty(level);
  }

  @Get('/by-subject/:subjectId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:view')
  async findBySubject(
    @Param('subjectId', ParseIntPipe) subjectId: number,
  ): Promise<QuestionDto[]> {
    return this.questionsService.findBySubject(subjectId);
  }

  @Patch('batch-update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:update')
  updateMany(@Body() updates: { id: number; data: UpdateQuestionDto }[]) {
    return this.questionsService.updateMany(updates);
  }

  @Post('batch-delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:delete')
  async deleteMany(@Body() body: { ids: number[] }) {
    await this.questionsService.deleteMany(body.ids);
    return { message: 'Xóa danh sách câu hỏi thành công'};
  }
}
