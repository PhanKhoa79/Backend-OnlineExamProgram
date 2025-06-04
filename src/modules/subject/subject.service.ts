import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subjects } from 'src/database/entities/Subjects';
import { Repository } from 'typeorm';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SubjectResponseDto } from './dto/subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subjects)
    private readonly subjectRepo: Repository<Subjects>,
  ) {}

  async create(createDto: CreateSubjectDto): Promise<Subjects> {
    const existing = await this.subjectRepo.findOne({
      where: { code: createDto.code },
    });
    if (existing) {
      throw new ConflictException(`Mã môn "${createDto.code}" đã tồn tại`);
    }

    const subject = this.subjectRepo.create(createDto);
    return this.subjectRepo.save(subject);
  }

  async update(id: number, updateDto: UpdateSubjectDto): Promise<Subjects> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject)
      throw new NotFoundException(`Không tìm thấy môn học ID: ${id}`);

    const updated = this.subjectRepo.merge(subject, updateDto);
    return this.subjectRepo.save(updated);
  }

  async delete(id: number): Promise<void> {
    const result = await this.subjectRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy môn học để xóa (ID: ${id})`);
    }
  }

  async findByCode(code: string): Promise<Subjects> {
    const subject = await this.subjectRepo.findOne({ where: { code } });
    if (!subject) {
      throw new NotFoundException(`Không tìm thấy môn học với mã: ${code}`);
    }
    return subject;
  }

  async findById(id: number): Promise<SubjectResponseDto> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject) {
      throw new NotFoundException(`Không tìm thấy môn học với ID: ${id}`);
    }
    return subject;
  }

  async findAll(): Promise<Subjects[]> {
    return this.subjectRepo.find({ order: { createdAt: 'DESC' } });
  }
}
