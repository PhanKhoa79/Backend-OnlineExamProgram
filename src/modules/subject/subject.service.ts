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
import { RedisCacheService } from 'src/common/cache/redis-cache.service';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subjects)
    private readonly subjectRepo: Repository<Subjects>,
    private readonly cacheService: RedisCacheService,
  ) {}

  async create(createDto: CreateSubjectDto): Promise<Subjects> {
    const existing = await this.subjectRepo.findOne({
      where: { code: createDto.code },
    });
    if (existing) {
      throw new ConflictException(`Mã môn "${createDto.code}" đã tồn tại`);
    }

    const subject = this.subjectRepo.create(createDto);
    const savedSubject = await this.subjectRepo.save(subject);

    // Invalidate cache after creating new subject
    await this.cacheService.delByPattern(`${RedisCacheService.KEYS.SUBJECT}:*`);

    return savedSubject;
  }

  async update(id: number, updateDto: UpdateSubjectDto): Promise<Subjects> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject)
      throw new NotFoundException(`Không tìm thấy môn học ID: ${id}`);

    const updated = this.subjectRepo.merge(subject, updateDto);
    const savedSubject = await this.subjectRepo.save(updated);

    // Invalidate specific subject cache and list cache
    await this.cacheService.del(
      this.cacheService.generateKey(RedisCacheService.KEYS.SUBJECT, 'id', id),
    );
    await this.cacheService.del(
      this.cacheService.generateKey(
        RedisCacheService.KEYS.SUBJECT,
        'code',
        subject.code,
      ),
    );
    await this.cacheService.delByPattern(
      `${RedisCacheService.KEYS.SUBJECT}:list*`,
    );
    return savedSubject;
  }

  async delete(id: number): Promise<void> {
    // Get subject before deletion for cache invalidation
    const subject = await this.subjectRepo.findOne({ where: { id } });

    const result = await this.subjectRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy môn học để xóa (ID: ${id})`);
    }

    // Invalidate cache after deletion
    if (subject) {
      await this.cacheService.del(
        this.cacheService.generateKey(RedisCacheService.KEYS.SUBJECT, 'id', id),
      );
      await this.cacheService.del(
        this.cacheService.generateKey(
          RedisCacheService.KEYS.SUBJECT,
          'code',
          subject.code,
        ),
      );
    }
    await this.cacheService.delByPattern(
      `${RedisCacheService.KEYS.SUBJECT}:list*`,
    );
  }

  async findByCode(code: string): Promise<Subjects> {
    const cacheKey = this.cacheService.generateKey(
      RedisCacheService.KEYS.SUBJECT,
      'code',
      code,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const subject = await this.subjectRepo.findOne({ where: { code } });
        if (!subject) {
          throw new NotFoundException(`Không tìm thấy môn học với mã: ${code}`);
        }
        return subject;
      },
      { ttl: RedisCacheService.TTL.MEDIUM },
    );
  }

  async findById(id: number): Promise<SubjectResponseDto> {
    const cacheKey = this.cacheService.generateKey(
      RedisCacheService.KEYS.SUBJECT,
      'id',
      id,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const subject = await this.subjectRepo.findOne({ where: { id } });
        if (!subject) {
          throw new NotFoundException(`Không tìm thấy môn học với ID: ${id}`);
        }
        return subject;
      },
      { ttl: RedisCacheService.TTL.MEDIUM },
    );
  }

  async findAll(): Promise<Subjects[]> {
    const cacheKey = this.cacheService.generateKey(
      RedisCacheService.KEYS.SUBJECT,
      'list',
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.subjectRepo.find({ order: { createdAt: 'DESC' } });
      },
      { ttl: RedisCacheService.TTL.SHORT },
    );
  }
}
