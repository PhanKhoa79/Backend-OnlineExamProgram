import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Classes } from 'src/database/entities/Classes';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Classes)
    private readonly classRepo: Repository<Classes>,
  ) {}

  async create(createDto: CreateClassDto): Promise<Classes> {
    const existing = await this.classRepo.findOne({
      where: { code: createDto.code },
    });
    if (existing)
      throw new ConflictException(`Mã lớp "${createDto.code}" đã tồn tại`);
    const entity = this.classRepo.create(createDto);
    return this.classRepo.save(entity);
  }

  async update(id: number, updateDto: UpdateClassDto): Promise<Classes> {
    const entity = await this.classRepo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Không tìm thấy lớp học ID ${id}`);
    const updated = this.classRepo.merge(entity, updateDto);
    return this.classRepo.save(updated);
  }

  async delete(id: number): Promise<void> {
    const result = await this.classRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy lớp học để xóa (ID: ${id})`);
    }
  }

  async findById(id: number): Promise<Classes> {
    const entity = await this.classRepo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Không tìm thấy lớp học ID ${id}`);
    return entity;
  }

  async findAll(): Promise<Classes[]> {
    return this.classRepo.find({ order: { createdAt: 'DESC' } });
  }
}
