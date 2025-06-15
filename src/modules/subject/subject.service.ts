import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subjects } from 'src/database/entities/Subjects';
import { Repository } from 'typeorm';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SubjectResponseDto } from './dto/subject.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SubjectService {
  private readonly logger = new Logger(SubjectService.name);
  private readonly CACHE_KEYS = {
    SUBJECTS_LIST: 'subjects_list',
    SUBJECT_DETAIL: 'subject_detail_',
    SUBJECT_BY_CODE: 'subject_code_',
  };
  private readonly CACHE_TTL = 600; // 10 phút (giây)

  constructor(
    @InjectRepository(Subjects)
    private readonly subjectRepo: Repository<Subjects>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Xóa cache khi có thay đổi dữ liệu
   */
  private async invalidateCache(key?: string): Promise<void> {
    try {
      if (key) {
        await this.redisService.del(key);
        this.logger.log(`🗑️ Invalidated cache: ${key}`);
      } else {
        // Xóa cache danh sách môn học
        await this.redisService.del(this.CACHE_KEYS.SUBJECTS_LIST);
        this.logger.log(`🗑️ Invalidated subjects list cache`);

        // Tìm và xóa tất cả các cache chi tiết môn học
        const detailCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.SUBJECT_DETAIL}*`,
        );
        for (const cacheKey of detailCacheKeys) {
          await this.redisService.del(cacheKey);
        }

        // Tìm và xóa tất cả các cache môn học theo mã
        const codeKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.SUBJECT_BY_CODE}*`,
        );
        for (const cacheKey of codeKeys) {
          await this.redisService.del(cacheKey);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async create(createDto: CreateSubjectDto): Promise<Subjects> {
    const existing = await this.subjectRepo.findOne({
      where: { code: createDto.code },
    });
    if (existing) {
      throw new ConflictException(`Mã môn "${createDto.code}" đã tồn tại`);
    }

    const subject = this.subjectRepo.create(createDto);
    const savedSubject = await this.subjectRepo.save(subject);

    // Xóa cache sau khi tạo mới
    await this.invalidateCache();

    return savedSubject;
  }

  async update(id: number, updateDto: UpdateSubjectDto): Promise<Subjects> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject)
      throw new NotFoundException(`Không tìm thấy môn học ID: ${id}`);

    const updated = this.subjectRepo.merge(subject, updateDto);
    const savedSubject = await this.subjectRepo.save(updated);

    // Xóa cache sau khi cập nhật
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.SUBJECT_DETAIL}${id}`);
    await this.invalidateCache(
      `${this.CACHE_KEYS.SUBJECT_BY_CODE}${subject.code}`,
    );

    return savedSubject;
  }

  async delete(id: number): Promise<void> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    const code = subject?.code;

    const result = await this.subjectRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy môn học để xóa (ID: ${id})`);
    }

    // Xóa cache sau khi xóa
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.SUBJECT_DETAIL}${id}`);
    if (code) {
      await this.invalidateCache(`${this.CACHE_KEYS.SUBJECT_BY_CODE}${code}`);
    }
  }

  async findByCode(code: string): Promise<Subjects> {
    const cacheKey = `${this.CACHE_KEYS.SUBJECT_BY_CODE}${code}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const subject = await this.subjectRepo.findOne({ where: { code } });
      if (!subject) {
        throw new NotFoundException(`Không tìm thấy môn học với mã: ${code}`);
      }

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(subject),
        this.CACHE_TTL,
      );

      return subject;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in findByCode: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const subject = await this.subjectRepo.findOne({ where: { code } });
      if (!subject) {
        throw new NotFoundException(`Không tìm thấy môn học với mã: ${code}`);
      }
      return subject;
    }
  }

  async findById(id: number): Promise<SubjectResponseDto> {
    const cacheKey = `${this.CACHE_KEYS.SUBJECT_DETAIL}${id}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const subject = await this.subjectRepo.findOne({ where: { id } });
      if (!subject) {
        throw new NotFoundException(`Không tìm thấy môn học với ID: ${id}`);
      }

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(subject),
        this.CACHE_TTL,
      );

      return subject;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in findById: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const subject = await this.subjectRepo.findOne({ where: { id } });
      if (!subject) {
        throw new NotFoundException(`Không tìm thấy môn học với ID: ${id}`);
      }
      return subject;
    }
  }

  async findAll(): Promise<Subjects[]> {
    const cacheKey = this.CACHE_KEYS.SUBJECTS_LIST;
    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const subjects = await this.subjectRepo.find({
        order: { createdAt: 'DESC' },
      });

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(subjects),
        this.CACHE_TTL,
      );

      return subjects;
    } catch (error) {
      this.logger.error(
        `Error in findAll: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return await this.subjectRepo.find({ order: { createdAt: 'DESC' } });
    }
  }
}
