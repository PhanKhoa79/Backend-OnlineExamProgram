import { ConflictException, Injectable } from '@nestjs/common';
import { StudentRepository } from './student.repository';
import { StudentDto } from './dto/student.dto';
import { Students } from 'src/database/entities/Students';
import { NotFoundException } from '@nestjs/common';
import { Accounts } from 'src/database/entities/Accounts';
import { StudentMapper } from './mapper/mapStudent.mapper';
import { CreateStudentDto } from './dto/create-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Classes } from 'src/database/entities/Classes';
import { Repository } from 'typeorm';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentService {
  constructor(
    private readonly studentRepository: StudentRepository,

    @InjectRepository(Classes)
    private readonly classRepo: Repository<Classes>,
  ) {}

  async create(dto: CreateStudentDto): Promise<Students> {
    const existing = await this.studentRepository.findOne({
      where: [{ studentCode: dto.studentCode }, { email: dto.email }],
    });
    if (existing) throw new ConflictException('Mã sinh viên hoặc email đã tồn tại');

    const classRef = await this.classRepo.findOneBy({ id: dto.classId });
    if (!classRef) throw new NotFoundException('Không tìm thấy lớp');

    const student = this.studentRepository.create({
      ...dto,
      class: classRef,
    });

    return this.studentRepository.save(student);
  }

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

  async update(id: number, dto: UpdateStudentDto): Promise<Students> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['class'],
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy sinh viên ID ${id}`);
    }

    if (dto.classId !== undefined) {
      const targetClass = await this.classRepo.findOne({
        where: { id: dto.classId },
      });
      if (!targetClass) {
        throw new NotFoundException(`Không tìm thấy lớp với ID ${dto.classId}`);
      }
      student.class = targetClass;
    }

    this.studentRepository.merge(student, dto);
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

    return StudentMapper.toResponseDto(student);
  }

  async findById(id: number): Promise<Students> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['class'],
    });
    if (!student) throw new NotFoundException('Không tìm thấy sinh viên');
    return student;
  }

  async findAll(): Promise<Students[]> {
    return this.studentRepository.find({
      relations: ['class'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: number): Promise<void> {
    const result = await this.studentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Không tìm thấy sinh viên để xóa (ID: ${id})`,
      );
    }
  }

  async findByClassId(classId: number): Promise<StudentDto[]> {
    const students = await this.studentRepository.find({
      where: {
        class: { id: classId },
      },
      relations: ['class', 'account'],
      order: { createdAt: 'DESC' },
    });

    return StudentMapper.toResponseList(students);
  }
}
