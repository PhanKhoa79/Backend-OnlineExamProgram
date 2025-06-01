import { Injectable } from '@nestjs/common';
import { StudentRepository } from './student.repository';
import { StudentDto } from './dto/student.dto';
import { Students } from 'src/database/entities/Students';
import { NotFoundException } from '@nestjs/common';
import { Accounts } from 'src/database/entities/Accounts';
import { mapStudentToDto } from './mapper/mapStudent.mapper';

@Injectable()
export class StudentService {
  constructor(private readonly studentRepository: StudentRepository) {}

  async updateStudent(id: number, updateData: Partial<Students>) {
    const student = await this.studentRepository.findOne({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException(`Student với id ${id} không tồn tại`);
    }

    // Nếu chỉ update account
    if (updateData.account) {
      student.account = updateData.account;
    } else {
      this.studentRepository.merge(student, updateData);
    }

    return await this.studentRepository.save(student);
  }

  async attachAccountToStudentByEmail(email: string, account: Accounts) {
    const student = await this.getStudentByEmail(email);

    if (!student) {
      throw new NotFoundException(
        `Không tìm thấy sinh viên với email ${email}`,
      );
    }

    student.account = account;
    return await this.studentRepository.save(student);
  }
  async getListStudentWithoutAccount(): Promise<StudentDto[]> {
    return await this.studentRepository.getListStudentWithoutAccount();
  }

  async getStudentByEmail(email: string): Promise<Students | null> {
    return await this.studentRepository.findByEmail(email);
  }

  async getStudentDtoByEmail(email: string): Promise<StudentDto | null> {
    const student = await this.studentRepository.findOne({
      where: { email },
    });

    if (!student) return null;

    return mapStudentToDto(student);
  }
}
