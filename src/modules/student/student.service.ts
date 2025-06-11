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
import {
  CreateBulkStudentDto,
  BulkCreateResult,
} from './dto/create-bulk-student.dto';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';

@Injectable()
export class StudentService {
  constructor(
    private readonly studentRepository: StudentRepository,

    @InjectRepository(Classes)
    private readonly classRepo: Repository<Classes>,
    private readonly cacheService: RedisCacheService,
  ) {}

  async create(dto: CreateStudentDto): Promise<Students> {
    const existing = await this.studentRepository.findOne({
      where: [{ studentCode: dto.studentCode }, { email: dto.email }],
    });
    if (existing)
      throw new ConflictException('Mã sinh viên hoặc email đã tồn tại');

    const classRef = await this.classRepo.findOneBy({ id: dto.classId });
    if (!classRef) throw new NotFoundException('Không tìm thấy lớp');

    const student = this.studentRepository.create({
      ...dto,
      class: classRef,
    });

    return this.studentRepository.save(student);
  }

  async createBulk(dto: CreateBulkStudentDto): Promise<BulkCreateResult> {
    const result: BulkCreateResult = {
      success: 0,
      failed: 0,
      errors: [],
      createdStudents: [],
    };

    const queryRunner =
      this.studentRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate all classes exist first
      const classIds = [...new Set(dto.students.map((s) => s.classId))];
      const classes = await queryRunner.manager.find(Classes, {
        where: classIds.map((id) => ({ id })),
      });

      const classMap = new Map(classes.map((c) => [c.id, c]));

      // Check for missing classes
      const missingClassIds = classIds.filter((id) => !classMap.has(id));
      if (missingClassIds.length > 0) {
        throw new NotFoundException(
          `Không tìm thấy lớp với ID: ${missingClassIds.join(', ')}`,
        );
      }

      // Check for duplicate student codes and emails in the batch
      const studentCodes = dto.students.map((s) => s.studentCode);
      const emails = dto.students.filter((s) => s.email).map((s) => s.email);

      const duplicateCodes = studentCodes.filter(
        (code, index) => studentCodes.indexOf(code) !== index,
      );
      const duplicateEmails = emails.filter(
        (email, index) => emails.indexOf(email) !== index,
      );
      if (duplicateCodes.length > 0) {
        throw new ConflictException(
          `Mã sinh viên trùng lặp trong danh sách: ${duplicateCodes.join(
            ', ',
          )}`,
        );
      }

      if (duplicateEmails.length > 0) {
        throw new ConflictException(
          `Email trùng lặp trong danh sách: ${duplicateEmails.join(', ')}`,
        );
      }

      // Check existing students in database
      const existingStudents = await queryRunner.manager.find(Students, {
        where: [
          ...studentCodes.map((code) => ({ studentCode: code })),
          ...emails.map((email) => ({ email })),
        ],
      });

      const existingCodes = new Set(existingStudents.map((s) => s.studentCode));
      const existingEmails = new Set(existingStudents.map((s) => s.email));

      // Process each student
      for (let i = 0; i < dto.students.length; i++) {
        const studentDto = dto.students[i];

        try {
          // Check for conflicts
          if (existingCodes.has(studentDto.studentCode)) {
            throw new ConflictException(
              `Mã sinh viên "${studentDto.studentCode}" đã tồn tại`,
            );
          }

          if (studentDto.email && existingEmails.has(studentDto.email)) {
            throw new ConflictException(
              `Email "${studentDto.email}" đã tồn tại`,
            );
          }

          const classRef = classMap.get(studentDto.classId);

          const student = queryRunner.manager.create(Students, {
            ...studentDto,
            class: classRef,
          });

          const savedStudent = await queryRunner.manager.save(
            Students,
            student,
          );
          result.success++;
          result.createdStudents.push({
            id: savedStudent.id,
            studentCode: savedStudent.studentCode,
            fullName: savedStudent.fullName,
            email: savedStudent.email || '',
            address: savedStudent.address || '',
            dateOfBirth: savedStudent.dateOfBirth || '',
            phoneNumber: savedStudent.phoneNumber || '',
            classId: savedStudent.class.id,
            gender: savedStudent.gender || 'Khác',
          });

          // Add to existing sets to prevent conflicts in the same batch
          existingCodes.add(studentDto.studentCode);
          if (studentDto.email) {
            existingEmails.add(studentDto.email);
          }
        } catch (error: unknown) {
          result.failed++;
          result.errors.push({
            index: i,
            studentCode: studentDto.studentCode,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return result;
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
    const cacheKey = this.cacheService.generateKey(
      RedisCacheService.KEYS.STUDENT,
      'id',
      id,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const student = await this.studentRepository.findOne({
          where: { id },
          relations: ['class'],
        });
        if (!student) throw new NotFoundException('Không tìm thấy sinh viên');
        return student;
      },
      { ttl: RedisCacheService.TTL.MEDIUM },
    );
  }

  async findAll(): Promise<Students[]> {
    const cacheKey = this.cacheService.generateKey(
      RedisCacheService.KEYS.STUDENT,
      'list',
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.studentRepository.find({
          relations: ['class'],
          order: { createdAt: 'DESC' },
        });
      },
      { ttl: RedisCacheService.TTL.SHORT },
    );
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

  async importStudentsFromFile(filePath: string, type: 'xlsx' | 'csv') {
    const students: CreateStudentDto[] = [];

    if (type === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error('Không tìm thấy worksheet!');
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const values = row.values as unknown[];
        const [
          studentCode,
          fullName,
          gender,
          dateOfBirth,
          email,
          phoneNumber,
          address,
          classId,
        ] = values.slice(1, 9);

        if (studentCode && fullName && classId) {
          const safeStudentCode =
            typeof studentCode === 'string' || typeof studentCode === 'number'
              ? String(studentCode)
              : '';
          const safeFullName =
            typeof fullName === 'string' || typeof fullName === 'number'
              ? String(fullName)
              : '';
          const safeGender =
            typeof gender === 'string' || typeof gender === 'number'
              ? String(gender)
              : 'Khác';
          const safeDateOfBirth =
            typeof dateOfBirth === 'string' || typeof dateOfBirth === 'number'
              ? String(dateOfBirth)
              : new Date().toISOString().split('T')[0];
          const safePhoneNumber =
            typeof phoneNumber === 'string' || typeof phoneNumber === 'number'
              ? String(phoneNumber)
              : undefined;
          const safeAddress =
            typeof address === 'string' || typeof address === 'number'
              ? String(address)
              : undefined;

          students.push({
            studentCode: safeStudentCode,
            fullName: safeFullName,
            gender: safeGender as 'Nam' | 'Nữ' | 'Khác',
            dateOfBirth: safeDateOfBirth,
            email: email
              ? typeof email === 'object' && email && 'text' in email
                ? String((email as { text: string }).text)
                : typeof email === 'string' || typeof email === 'number'
                  ? String(email)
                  : undefined
              : undefined,
            phoneNumber: safePhoneNumber,
            address: safeAddress,
            classId: Number(classId),
          });
        }
      });
    } else if (type === 'csv') {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({ separator: ',' }))
          .on('data', (data: Record<string, string>) => {
            const firstKey = Object.keys(data)[0];
            const studentCodeFromFirstKey = data[firstKey];

            const studentCode = studentCodeFromFirstKey;
            const fullName = data.fullName;
            const gender = data.gender;
            const dateOfBirth = data.dateOfBirth;
            const email = data.email;
            const phoneNumber = data.phoneNumber;
            const address = data.address;
            const classId = data.classId;

            if (studentCode && fullName && classId) {
              console.log('✅ Processing student:', studentCode);
              students.push({
                studentCode,
                fullName,
                gender: gender ? (gender as 'Nam' | 'Nữ' | 'Khác') : 'Khác',
                dateOfBirth:
                  dateOfBirth || new Date().toISOString().split('T')[0],
                email: email || undefined,
                phoneNumber: phoneNumber || undefined,
                address: address || undefined,
                classId: Number(classId),
              });
            } else {
              console.log('❌ Skipping row - missing required fields');
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      throw new Error('Loại file không hỗ trợ!');
    }

    const result = await this.createBulk({ students });
    fs.unlinkSync(filePath); // Clean up uploaded file
    return result;
  }

  async exportStudents(
    students: StudentDto[],
    res: Response,
    format: 'excel' | 'csv' = 'excel',
  ) {
    const bom = '\uFEFF'; // BOM for UTF-8

    // Get all unique class IDs
    const classIds = [...new Set(students.map((student) => student.classId))];

    // Fetch class information
    const classes = await this.classRepo.find({
      where: classIds.map((id) => ({ id })),
    });

    // Create a mapping from classId to className
    const classMap = new Map(classes.map((cls) => [cls.id, cls.name]));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Student Code', key: 'studentCode', width: 15 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Class Name', key: 'className', width: 20 },
    ];

    students.forEach((student) => {
      worksheet.addRow({
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        gender: student.gender || '',
        dateOfBirth: student.dateOfBirth || '',
        email: student.email || '',
        phoneNumber: student.phoneNumber || '',
        address: student.address || '',
        className:
          classMap.get(student.classId) || `Unknown (ID: ${student.classId})`,
      });
    });

    if (format === 'excel') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="students.xlsx"',
      );
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="students.csv"',
      );
      const buffer = await workbook.csv.writeBuffer();
      res.write(bom);
      res.write(buffer);
      res.end();
    }
  }
}
