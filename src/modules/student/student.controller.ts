import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentDto } from './dto/student.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudentMapper } from './mapper/mapStudent.mapper';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorator/permissions.decotator';
import {
  CreateBulkStudentDto,
  BulkCreateResult,
} from './dto/create-bulk-student.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:create')
  async create(@Body() dto: CreateStudentDto): Promise<StudentDto> {
    const entity = await this.studentService.create(dto);
    return StudentMapper.toResponseDto(entity);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:create')
  async createBulk(
    @Body() dto: CreateBulkStudentDto,
  ): Promise<BulkCreateResult> {
    return await this.studentService.createBulk(dto);
  }

  @Get('without-account')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('account:create')
  async getListStudentWithoutAccount(): Promise<StudentDto[]> {
    return await this.studentService.getListStudentWithoutAccount();
  }

  @Get('by-email')
  @UseGuards(JwtAuthGuard)
  async getStudentByEmail(@Query('email') email: string): Promise<StudentDto> {
    const student = await this.studentService.getStudentByEmail(email);

    if (!student) {
      throw new NotFoundException(
        `Không tìm thấy sinh viên với email ${email}`,
      );
    }
    return StudentMapper.toResponseDto(student);
  }

  @Get('/download-template')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:view')
  downloadStaticTemplate(
    @Query('type') type: 'xlsx' | 'csv',
    @Res() res: Response,
  ) {
    if (type !== 'xlsx' && type !== 'csv') {
      throw new HttpException(
        'Query param "type" phải là "xlsx" hoặc "csv"',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fileName = `student_template.${type}`;
    const filePath = join(
      process.cwd(),
      'uploads/templates',
      `student_template.${type}`,
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File mẫu không tồn tại!');
    }
    res.download(filePath, fileName, (err) => {
      if (err) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send('Không thể tải file mẫu');
      }
    });
  }

  @Get('class/:classId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:view')
  async findByClassId(
    @Param('classId', ParseIntPipe) classId: number,
  ): Promise<StudentDto[]> {
    return this.studentService.findByClassId(classId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:view')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<StudentDto> {
    const entity = await this.studentService.findById(id);
    return StudentMapper.toResponseDto(entity);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:view')
  async findAll(): Promise<StudentDto[]> {
    const list = await this.studentService.findAll();
    return StudentMapper.toResponseList(list);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ): Promise<StudentDto> {
    const entity = await this.studentService.update(id, dto);
    return StudentMapper.toResponseDto(entity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.studentService.delete(id);
    return { message: 'Xóa sinh viên thành công' };
  }

  @Post('/import')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueSuffix + extname(file.originalname));
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
  async importStudentsFromFile(
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

    const result = await this.studentService.importStudentsFromFile(
      file.path,
      type,
    );

    return {
      message: 'Import sinh viên thành công',
      data: result,
    };
  }

  @Post('/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:view')
  async exportStudents(
    @Body() body: { students: StudentDto[] },
    @Query('format') format: 'excel' | 'csv',
    @Res() res: Response,
  ) {
    return this.studentService.exportStudents(body.students, res, format);
  }
}
