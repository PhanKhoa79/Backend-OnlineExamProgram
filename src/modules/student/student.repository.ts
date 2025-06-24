import { DataSource, Repository } from 'typeorm';
import { Students } from 'src/database/entities/Students';
import { Injectable } from '@nestjs/common';
import { StudentDto } from './dto/student.dto';
@Injectable()
export class StudentRepository extends Repository<Students> {
  constructor(private dataSource: DataSource) {
    super(Students, dataSource.createEntityManager());
  }

  async saveStudent(student: Partial<Students>): Promise<Students> {
    const newStudent = this.create(student);
    return this.save(newStudent);
  }

  async getListStudentWithoutAccount(): Promise<StudentDto[]> {
    const students = await this.find();
    const studentsWithoutAccount = students.filter(
      (student) => !student.account,
    );
    return studentsWithoutAccount.map((student) => ({
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      classId: student.class?.id ?? null,
    }));
  }

  async findByEmail(email: string): Promise<Students | null> {
    return this.findOne({ where: { email }, relations: ['class'] });
  }
}
