import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subjects } from 'src/database/entities/Subjects';
import { Repository, DataSource } from 'typeorm';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SubjectResponseDto } from './dto/subject.dto';
import { RedisService } from 'src/modules/redis/redis.service';

@Injectable()
export class SubjectService {
  private readonly logger = new Logger(SubjectService.name);
  private readonly CACHE_TTL = 3600; // 1 giờ

  constructor(
    @InjectRepository(Subjects)
    private readonly subjectRepo: Repository<Subjects>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async create(createDto: CreateSubjectDto): Promise<Subjects> {
    // Sử dụng transaction để đảm bảo tính nhất quán
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(Subjects, {
        where: { code: createDto.code },
      });

      if (existing) {
        throw new ConflictException(`Mã môn "${createDto.code}" đã tồn tại`);
      }

      const subject = queryRunner.manager.create(Subjects, createDto);
      const savedSubject = await queryRunner.manager.save(subject);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `✅ Created subject: ${savedSubject.code} - ${savedSubject.name}`,
      );
      return savedSubject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating subject: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, updateDto: UpdateSubjectDto): Promise<Subjects> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const subject = await queryRunner.manager.findOne(Subjects, {
        where: { id },
      });
      if (!subject) {
        throw new NotFoundException(`Không tìm thấy môn học ID: ${id}`);
      }

      Object.assign(subject, updateDto);
      const savedSubject = await queryRunner.manager.save(subject);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `✅ Updated subject: ${savedSubject.code} - ${savedSubject.name}`,
      );
      return savedSubject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating subject: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await queryRunner.manager.delete(Subjects, id);
      if (result.affected === 0) {
        throw new NotFoundException(
          `Không tìm thấy môn học để xóa (ID: ${id})`,
        );
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`✅ Deleted subject with ID: ${id}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error deleting subject: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
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
    return await this.subjectRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByCodeOrName(codeOrName: string): Promise<Subjects | null> {
    const cacheKey = `subject_code_or_name_${codeOrName}`;

    try {
      // Thử lấy dữ liệu từ cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(cachedData);
      }

      // Nếu không có trong cache, truy vấn database theo cả code và name
      const subject = await this.subjectRepo.findOne({
        where: [{ code: codeOrName }, { name: codeOrName }],
      });

      if (subject) {
        // Lưu vào cache
        await this.redisService.set(
          cacheKey,
          JSON.stringify(subject),
          this.CACHE_TTL,
        );
      }

      return subject;
    } catch (error) {
      this.logger.error(
        `Error in findByCodeOrName: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Nếu có lỗi với cache, vẫn truy vấn database
      return this.subjectRepo.findOne({
        where: [{ code: codeOrName }, { name: codeOrName }],
      });
    }
  }
}
