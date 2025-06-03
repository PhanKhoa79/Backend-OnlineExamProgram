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

  @Get('class/:classId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:view')
  async findByClassId(
    @Param('classId', ParseIntPipe) classId: number,
  ): Promise<StudentDto[]> {
    return this.studentService.findByClassId(classId);
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
}
