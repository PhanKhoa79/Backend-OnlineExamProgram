import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ExamSchedule } from '../../database/entities/ExamSchedule';
import { ExamScheduleAssignments } from '../../database/entities/ExamScheduleAssignments';
import { Classes } from '../../database/entities/Classes';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { UpdateExamScheduleDto } from './dto/update-exam-schedule.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ExamScheduleService {
  constructor(
    @InjectRepository(ExamSchedule)
    private readonly examScheduleRepo: Repository<ExamSchedule>,
    @InjectRepository(ExamScheduleAssignments)
    private readonly examScheduleAssignmentRepo: Repository<ExamScheduleAssignments>,
    @InjectRepository(Classes)
    private readonly classesRepo: Repository<Classes>,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  // 🔍 Helper method: Kiểm tra mã lịch thi đã tồn tại
  private async validateUniqueCode(
    code: string,
    excludeId?: number,
  ): Promise<void> {
    const existingSchedule = await this.examScheduleRepo.findOne({
      where: { code },
    });

    if (existingSchedule && (!excludeId || existingSchedule.id !== excludeId)) {
      throw new BadRequestException(
        `Mã lịch thi "${code}" đã tồn tại. Vui lòng sử dụng mã khác.`,
      );
    }
  }

  async create(createDto: CreateExamScheduleDto): Promise<ExamSchedule> {
    // 🔍 KIỂM TRA: Mã lịch thi đã tồn tại chưa
    await this.validateUniqueCode(createDto.code);

    // Validate thời gian
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc',
      );
    }

    if (startTime < new Date()) {
      throw new BadRequestException('Thời gian bắt đầu không thể ở quá khứ');
    }

    // Tạo lịch thi
    const examSchedule = this.examScheduleRepo.create({
      ...createDto,
      startTime,
      endTime,
      subject: { id: createDto.subjectId },
    });

    // Lưu lịch thi
    const savedExamSchedule = await this.examScheduleRepo.save(examSchedule);

    // Nếu có danh sách lớp học, liên kết chúng với lịch thi
    if (createDto.classIds && createDto.classIds.length > 0) {
      // Kiểm tra các lớp học có tồn tại không
      const classes = await this.classesRepo.find({
        where: { id: In(createDto.classIds) },
      });

      if (classes.length !== createDto.classIds.length) {
        throw new BadRequestException('Một số lớp học không tồn tại');
      }

      // Liên kết lớp học với lịch thi
      savedExamSchedule.classes = classes;
      await this.examScheduleRepo.save(savedExamSchedule);

      // Lấy đầy đủ thông tin lịch thi bao gồm subject để gửi thông báo
      const fullExamSchedule = await this.examScheduleRepo.findOne({
        where: { id: savedExamSchedule.id },
        relations: ['subject', 'classes'],
      });

      // Gửi thông báo đến sinh viên của các lớp học
      try {
        if (fullExamSchedule) {
          await this.notificationService.createExamScheduleNotification(
            fullExamSchedule,
          );
        }
      } catch (error) {
        console.error('Lỗi khi gửi thông báo lịch thi:', error);
        // Không throw lỗi để không ảnh hưởng đến việc tạo lịch thi
      }
    }

    return savedExamSchedule;
  }

  async findAll(): Promise<ExamSchedule[]> {
    return await this.examScheduleRepo.find({
      relations: ['subject', 'examScheduleAssignments', 'classes'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ExamSchedule> {
    const examSchedule = await this.examScheduleRepo.findOne({
      where: { id },
      relations: [
        'subject',
        'examScheduleAssignments',
        'examScheduleAssignments.class',
        'classes',
      ],
    });

    if (!examSchedule) {
      throw new NotFoundException(`Không tìm thấy lịch thi với ID ${id}`);
    }

    return examSchedule;
  }

  async update(
    id: number,
    updateDto: UpdateExamScheduleDto,
  ): Promise<ExamSchedule> {
    const examSchedule = await this.findOne(id);

    // 🔍 KIỂM TRA: Mã lịch thi đã tồn tại chưa (nếu có thay đổi code)
    if (updateDto.code && updateDto.code !== examSchedule.code) {
      await this.validateUniqueCode(updateDto.code, id);
    }

    // Kiểm tra có lớp đang thi không
    const activeAssignments = await this.examScheduleAssignmentRepo.find({
      where: {
        examSchedule: { id },
        status: 'open',
      },
      relations: ['class'],
    });

    if (activeAssignments.length > 0) {
      const classNames = activeAssignments.map((a) => a.class?.name).join(', ');
      throw new BadRequestException(
        `Không thể sửa lịch thi khi có lớp đang thi: ${classNames}`,
      );
    }

    // Validate thời gian nếu có thay đổi
    if (updateDto.startTime || updateDto.endTime) {
      const startTime = updateDto.startTime
        ? new Date(updateDto.startTime)
        : examSchedule.startTime;
      const endTime = updateDto.endTime
        ? new Date(updateDto.endTime)
        : examSchedule.endTime;

      if (startTime >= endTime) {
        throw new BadRequestException(
          'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc',
        );
      }

      if (
        updateDto.startTime &&
        examSchedule.status !== 'completed' &&
        startTime < new Date()
      ) {
        throw new BadRequestException('Thời gian bắt đầu không thể ở quá khứ');
      }
    }

    // Cập nhật thông tin cơ bản
    Object.assign(examSchedule, updateDto);

    if (updateDto.subjectId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      examSchedule.subject = { id: updateDto.subjectId } as any;
    }

    // Cập nhật danh sách lớp học nếu có
    if (updateDto.classIds) {
      // Kiểm tra các lớp học có tồn tại không
      const classes = await this.classesRepo.find({
        where: { id: In(updateDto.classIds) },
      });

      if (classes.length !== updateDto.classIds.length) {
        throw new BadRequestException('Một số lớp học không tồn tại');
      }

      // Cập nhật liên kết với lớp học
      examSchedule.classes = classes;

      // Lưu lịch thi
      const updatedExamSchedule =
        await this.examScheduleRepo.save(examSchedule);

      // Lấy đầy đủ thông tin lịch thi bao gồm subject để gửi thông báo
      const fullExamSchedule = await this.examScheduleRepo.findOne({
        where: { id: updatedExamSchedule.id },
        relations: ['subject', 'classes'],
      });

      // Gửi thông báo đến sinh viên của các lớp học
      try {
        if (fullExamSchedule) {
          await this.notificationService.createExamScheduleNotification(
            fullExamSchedule,
          );
        }
      } catch (error) {
        console.error('Lỗi khi gửi thông báo lịch thi:', error);
        // Không throw lỗi để không ảnh hưởng đến việc cập nhật lịch thi
      }

      return updatedExamSchedule;
    }

    return await this.examScheduleRepo.save(examSchedule);
  }

  async remove(id: number): Promise<void> {
    const examSchedule = await this.findOne(id);

    // Kiểm tra có assignment đang hoạt động không
    const activeAssignments = await this.examScheduleAssignmentRepo.find({
      where: {
        examSchedule: { id },
        status: In(['waiting', 'open']),
      },
    });

    if (activeAssignments.length > 0) {
      throw new BadRequestException(
        `Không thể xóa lịch thi khi có ${activeAssignments.length} phòng thi đang hoạt động`,
      );
    }

    await this.examScheduleRepo.remove(examSchedule);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateScheduleStatus(): Promise<void> {
    const now = new Date();

    // Tìm tất cả lịch thi active đã kết thúc
    const expiredSchedules = await this.examScheduleRepo
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.examScheduleAssignments', 'assignments')
      .where('schedule.status = :status', { status: 'active' })
      .andWhere('schedule.endTime < :now', { now })
      .getMany();

    if (expiredSchedules.length === 0) {
      return; // Không có lịch thi nào cần cập nhật
    }

    for (const schedule of expiredSchedules) {
      // Kiểm tra tất cả assignments đã closed chưa
      const hasOpenAssignments = schedule.examScheduleAssignments?.some(
        (assignment) =>
          assignment.status === 'open' || assignment.status === 'waiting',
      );

      // Chỉ chuyển sang completed nếu tất cả assignments đã closed
      if (!hasOpenAssignments) {
        await this.examScheduleRepo.update(schedule.id, {
          status: 'completed',
        });
        console.log(
          `📋 Schedule ${schedule.code} → completed (all assignments closed)`,
        );
      } else {
        console.log(
          `⏳ Schedule ${schedule.code} still has active assignments`,
        );
      }
    }
  }

  // Lấy lịch thi theo trạng thái
  async findByStatus(
    status: 'active' | 'completed' | 'cancelled',
  ): Promise<ExamSchedule[]> {
    return await this.examScheduleRepo.find({
      where: { status },
      relations: ['subject', 'examScheduleAssignments'],
      order: { startTime: 'ASC' },
    });
  }

  // Lấy lịch thi trong khoảng thời gian
  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<ExamSchedule[]> {
    return await this.examScheduleRepo
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.examScheduleAssignments', 'assignments')
      .where('schedule.startTime >= :startDate', { startDate })
      .andWhere('schedule.endTime <= :endDate', { endDate })
      .orderBy('schedule.startTime', 'ASC')
      .getMany();
  }

  // Hủy lịch thi
  async cancelSchedule(id: number, reason?: string): Promise<ExamSchedule> {
    const examSchedule = await this.findOne(id);

    // Kiểm tra không có assignment nào đang 'open'
    const openAssignments = await this.examScheduleAssignmentRepo.find({
      where: {
        examSchedule: { id },
        status: 'open',
      },
      relations: ['class'],
    });

    if (openAssignments.length > 0) {
      const classNames = openAssignments.map((a) => a.class?.name).join(', ');
      throw new BadRequestException(
        `Không thể hủy lịch thi khi có lớp đang thi: ${classNames}`,
      );
    }

    // Chuyển tất cả assignments về 'closed'
    await this.examScheduleAssignmentRepo.update(
      { examSchedule: { id } },
      { status: 'closed' },
    );

    // Update status sang cancelled
    examSchedule.status = 'cancelled';
    if (reason) {
      examSchedule.description = `[HỦY] Lý do: ${reason}`;
    }

    console.log(
      `❌ Schedule ${examSchedule.code} cancelled: ${reason || 'No reason'}`,
    );

    return await this.examScheduleRepo.save(examSchedule);
  }

  // Lấy lịch thi theo lớp học
  async findByClassId(classId: number): Promise<ExamSchedule[]> {
    // Sử dụng queryBuilder để tìm lịch thi liên kết với lớp học
    const schedules = await this.examScheduleRepo
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.classes', 'classes')
      .where('classes.id = :classId', { classId })
      .orderBy('schedule.startTime', 'DESC')
      .getMany();

    return schedules;
  }

  // Lấy danh sách các lớp học theo lịch thi
  async getClassesByScheduleId(scheduleId: number): Promise<Classes[]> {
    const examSchedule = await this.examScheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['classes'],
    });

    if (!examSchedule) {
      throw new NotFoundException(
        `Không tìm thấy lịch thi với ID ${scheduleId}`,
      );
    }

    return examSchedule.classes;
  }

  // Lấy lịch thi theo lớp và môn học trong ngày hiện tại
  async findByClassAndSubjectToday(
    classId: number,
    subjectId: number,
    startOfDay: Date,
  ): Promise<ExamSchedule[]> {
    return await this.examScheduleRepo
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.classes', 'classes')
      .where('classes.id = :classId', { classId })
      .andWhere('schedule.subject.id = :subjectId', { subjectId })
      .andWhere('schedule.startTime >= :startOfDay', { startOfDay })
      .andWhere('schedule.status = :status', { status: 'active' })
      .orderBy('schedule.startTime', 'ASC')
      .getMany();
  }
}
