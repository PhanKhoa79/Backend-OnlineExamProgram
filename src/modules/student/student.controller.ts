import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentDto } from './dto/student.dto';
import { Roles } from '../auth/decorator/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { mapStudentToDto } from './mapper/mapStudent.mapper';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('without-account')
  @UseGuards(JwtAuthGuard)
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
    return mapStudentToDto(student);
  }
}
