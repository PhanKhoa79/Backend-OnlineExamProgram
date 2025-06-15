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
  UseInterceptors,
  UploadedFile,
  Res,
  HttpException,
  HttpStatus,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';

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
    return { message: 'Xóa câu hỏi thành công' };
  }

  @Get('/download-template')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:view')
  downloadQuestionTemplate(
    @Query('type') type: 'xlsx' | 'csv',
    @Res() res: Response,
  ) {
    if (type !== 'xlsx' && type !== 'csv') {
      throw new HttpException(
        'Query param "type" phải là "xlsx" hoặc "csv"',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fileName = `question_template.${type}`;
    const filePath = join(
      process.cwd(),
      'uploads/templates',
      `question_template.${type}`,
    );

    if (!fs.existsSync(filePath)) {
      throw new HttpException('File mẫu không tồn tại!', HttpStatus.NOT_FOUND);
    }

    res.download(filePath, fileName, (err) => {
      if (err) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send('Không thể tải file mẫu');
      }
    });
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id', ParseIntPipe) id: number): Promise<QuestionDto> {
    return this.questionsService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<QuestionDto[]> {
    return this.questionsService.findAll();
  }

  @Get('/by-difficulty')
  @UseGuards(JwtAuthGuard)
  async findByDifficulty(
    @Query('level') level: DifficultyLevel,
  ): Promise<QuestionDto[]> {
    return this.questionsService.findByDifficulty(level);
  }

  @Get('/by-subject/:subjectId')
  @UseGuards(JwtAuthGuard)
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
    return { message: 'Xóa danh sách câu hỏi thành công' };
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedExtensions = /\.(xlsx|csv)$/;
        if (!file.originalname.match(allowedExtensions)) {
          return callback(
            new HttpException(
              'Chỉ chấp nhận file .xlsx hoặc .csv',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async importQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'xlsx' | 'csv',
  ) {
    if (!file) {
      throw new HttpException(
        'Vui lòng upload file .xlsx hoặc .csv.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (type !== 'xlsx' && type !== 'csv') {
      throw new HttpException(
        'Query type phải là "xlsx" hoặc "csv"',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.questionsService.importQuestionsFromFile(
      file.path,
      type,
    );

    return {
      message: 'Import câu hỏi thành công',
      data: result,
    };
  }

  @Post('export')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('question:view')
  async exportQuestions(
    @Body() body: { questions: QuestionDto[] },
    @Query('format') format: 'excel' | 'csv',
    @Res() res: Response,
  ) {
    return this.questionsService.exportQuestions(body.questions, res, format);
  }
}
