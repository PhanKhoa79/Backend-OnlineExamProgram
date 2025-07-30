/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Classes } from 'src/database/entities/Classes';
import { RedisService } from '../redis/redis.service';
import { checkActiveClassExams } from '../../common/utils/exam-validation.util';
import { ExamScheduleAssignments } from 'src/database/entities/ExamScheduleAssignments';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);
  private readonly CACHE_KEYS = {
    CLASSES_LIST: 'classes_list',
    CLASS_DETAIL: 'class_detail_',
  };
  private readonly CACHE_TTL = 600; // 10 phút (giây)

  constructor(
    @InjectRepository(Classes)
    private readonly classRepo: Repository<Classes>,
    @InjectRepository(ExamScheduleAssignments)
    private readonly examScheduleAssignmentsRepo: Repository<ExamScheduleAssignments>,
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
        // Xóa cache danh sách lớp học
        await this.redisService.del(this.CACHE_KEYS.CLASSES_LIST);
        this.logger.log(`🗑️ Invalidated classes list cache`);

        // Tìm và xóa tất cả các cache chi tiết lớp học
        const detailCacheKeys = await this.redisService.keys(
          `${this.CACHE_KEYS.CLASS_DETAIL}*`,
        );
        for (const cacheKey of detailCacheKeys) {
          await this.redisService.del(cacheKey);
          this.logger.log(`🗑️ Invalidated cache: ${cacheKey}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async create(createDto: CreateClassDto): Promise<Classes> {
    const existing = await this.classRepo.findOne({
      where: { code: createDto.code },
    });
    if (existing)
      throw new ConflictException(`Mã lớp "${createDto.code}" đã tồn tại`);
    const entity = this.classRepo.create(createDto);
    const result = await this.classRepo.save(entity);

    // Xóa cache sau khi tạo mới
    await this.invalidateCache();

    return result;
  }

  async update(id: number, updateDto: UpdateClassDto): Promise<Classes> {
    const entity = await this.classRepo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Không tìm thấy lớp học ID ${id}`);

    // Kiểm tra xem lớp có đang có phòng thi mở không
    await checkActiveClassExams(this.examScheduleAssignmentsRepo, id);

    const updated = this.classRepo.merge(entity, updateDto);
    const result = await this.classRepo.save(updated);

    // Xóa cache sau khi cập nhật
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.CLASS_DETAIL}${id}`);

    return result;
  }

  async delete(id: number): Promise<void> {
    const entity = await this.classRepo.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`Không tìm thấy lớp học để xóa (ID: ${id})`);
    }

    // Kiểm tra xem lớp có đang có phòng thi mở không
    await checkActiveClassExams(this.examScheduleAssignmentsRepo, id);

    const result = await this.classRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy lớp học để xóa (ID: ${id})`);
    }

    // Xóa cache sau khi xóa
    await this.invalidateCache();
    await this.invalidateCache(`${this.CACHE_KEYS.CLASS_DETAIL}${id}`);
  }

  async findById(id: number): Promise<Classes> {
    const cacheKey = `${this.CACHE_KEYS.CLASS_DETAIL}${id}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const entity = await this.classRepo.findOneBy({ id });
      if (!entity)
        throw new NotFoundException(`Không tìm thấy lớp học ID ${id}`);

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(entity),
        this.CACHE_TTL,
      );

      return entity;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error in findById: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      const entity = await this.classRepo.findOneBy({ id });
      if (!entity)
        throw new NotFoundException(`Không tìm thấy lớp học ID ${id}`);
      return entity;
    }
  }

  async findByCodeOrName(codeOrName: string): Promise<Classes | null> {
    const cacheKey = `${this.CACHE_KEYS.CLASS_DETAIL}code_or_name_${codeOrName}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database theo cả code và name
      const entity = await this.classRepo.findOne({
        where: [{ code: codeOrName }, { name: codeOrName }],
      });

      if (entity) {
        // Lưu vào cache
        await this.redisService.set(
          cacheKey,
          JSON.stringify(entity),
          this.CACHE_TTL,
        );
      }

      return entity;
    } catch (error) {
      this.logger.error(
        `Error in findByCodeOrName: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.classRepo.findOne({
        where: [{ code: codeOrName }, { name: codeOrName }],
      });
    }
  }

  async findAll(): Promise<Classes[]> {
    const cacheKey = this.CACHE_KEYS.CLASSES_LIST;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database
      const classes = await this.classRepo.find({
        order: { createdAt: 'DESC' },
      });

      // Lưu vào cache
      await this.redisService.set(
        cacheKey,
        JSON.stringify(classes),
        this.CACHE_TTL,
      );

      return classes;
    } catch (error) {
      this.logger.error(
        `Error in findAll: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.classRepo.find({ order: { createdAt: 'DESC' } });
    }
  }
}
