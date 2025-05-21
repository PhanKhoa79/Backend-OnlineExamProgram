import { Controller, Get } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentDto } from './dto/student.dto';
import { Roles } from '../auth/decorator/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('without-account')
  @UseGuards(JwtAuthGuard)
  @Roles()
  async getListStudentWithoutAccount(): Promise<StudentDto[]> {
    return await this.studentService.getListStudentWithoutAccount();
  }
}
