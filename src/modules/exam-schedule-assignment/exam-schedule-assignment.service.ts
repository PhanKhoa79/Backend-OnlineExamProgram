import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamScheduleAssignments } from '../../database/entities/ExamScheduleAssignments';
import { CreateExamScheduleAssignmentDto } from './dto/create-assignment.dto';
import { UpdateExamScheduleAssignmentDto } from './dto/update-assignment.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExamScheduleService } from '../exam-schedule/exam-schedule.service';

@Injectable()
export class ExamScheduleAssignmentService {
  constructor(
    @InjectRepository(ExamScheduleAssignments)
    private readonly assignmentRepo: Repository<ExamScheduleAssignments>,
    @Inject(forwardRef(() => ExamScheduleService))
    private readonly examScheduleService: ExamScheduleService,
  ) {}

  async create(
    createDto: CreateExamScheduleAssignmentDto,
  ): Promise<ExamScheduleAssignments> {
    const schedule = await this.examScheduleService.findOne(
      createDto.examScheduleId,
    );

    if (schedule.status !== 'active') {
      throw new BadRequestException(
        `Không thể tạo phòng thi cho lịch thi có trạng thái: ${schedule.status}`,
      );
    }

    const now = new Date();
    if (schedule.endTime < now) {
      throw new BadRequestException(
        'Không thể tạo phòng cho lịch thi đã kết thúc',
      );
    }

    const assignment = this.assignmentRepo.create({
      ...createDto,
      exam: { id: createDto.examId },
      examSchedule: { id: createDto.examScheduleId },
      class: { id: createDto.classId },
    });

    return await this.assignmentRepo.save(assignment);
  }

  async findAll(): Promise<ExamScheduleAssignments[]> {
    return await this.assignmentRepo.find({
      relations: ['exam', 'examSchedule', 'class'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ExamScheduleAssignments> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['exam', 'examSchedule', 'class', 'examSchedule.subject'],
    });

    if (!assignment) {
      throw new NotFoundException(`Không tìm thấy phân công thi với ID ${id}`);
    }

    return assignment;
  }

  async update(
    id: number,
    updateDto: UpdateExamScheduleAssignmentDto,
  ): Promise<ExamScheduleAssignments> {
    const assignment = await this.findOne(id);

    // Kiểm tra nếu đang có học sinh thi thì không cho sửa exam
    if (updateDto.examId && assignment.status === 'open') {
      throw new BadRequestException(
        'Không thể thay đổi đề thi khi phòng thi đang mở',
      );
    }

    Object.assign(assignment, updateDto);

    if (updateDto.examId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      assignment.exam = { id: updateDto.examId } as any;
    }

    if (updateDto.classId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      assignment.class = { id: updateDto.classId } as any;
    }

    return await this.assignmentRepo.save(assignment);
  }

  async remove(id: number): Promise<void> {
    const assignment = await this.findOne(id);

    if (assignment.status === 'open') {
      throw new BadRequestException('Không thể xóa phòng thi đang mở');
    }

    await this.assignmentRepo.remove(assignment);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async openRooms(): Promise<void> {
    const now = new Date();

    // 🔥 KIỂM TRA: Có exam schedule nào cần mở không?
    const scheduleNeedOpening = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoin('assignment.examSchedule', 'schedule')
      .where('assignment.status = :status', { status: 'waiting' })
      .andWhere('schedule.startTime <= :now', { now })
      .andWhere('schedule.status = :scheduleStatus', {
        scheduleStatus: 'active',
      })
      .getCount();

    if (scheduleNeedOpening === 0) {
      // 🚫 Không có exam nào cần mở, skip
      return;
    }

    // Kiểm tra số phòng thi đang chờ
    const waitingCount = await this.assignmentRepo.count({
      where: { status: 'waiting' },
    });

    const result = await this.assignmentRepo
      .createQueryBuilder()
      .update(ExamScheduleAssignments)
      .set({ status: 'open' })
      .where('status = :status', { status: 'waiting' })
      .andWhere(
        'exam_schedule_id IN (SELECT id FROM exam_schedule WHERE startTime <= :now AND status = :scheduleStatus)',
        { now, scheduleStatus: 'active' },
      )
      .execute();

    console.log(
      `🔓 EXAM OPENED: ${result.affected || 0}/${waitingCount} rooms opened at ${now.toLocaleString('vi-VN')}`,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async closeRooms(): Promise<void> {
    const now = new Date();

    const scheduleNeedClosing = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoin('assignment.examSchedule', 'schedule')
      .where('assignment.status = :status', { status: 'open' })
      .andWhere('schedule.endTime <= :now', { now })
      .getCount();

    if (scheduleNeedClosing === 0) {
      return;
    }

    // Kiểm tra số phòng thi đang mở
    const openCount = await this.assignmentRepo.count({
      where: { status: 'open' },
    });

    const expiredAssignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.examSchedule', 'schedule')
      .where('assignment.status = :status', { status: 'open' })
      .andWhere('schedule.endTime <= :now', { now })
      .getMany();

    for (const assignment of expiredAssignments) {
      this.autoSubmitStudentExams(assignment.id);

      assignment.status = 'closed';
      await this.assignmentRepo.save(assignment);
    }

    console.log(
      `🔒 EXAM CLOSED: ${expiredAssignments.length}/${openCount} rooms closed at ${now.toLocaleString('vi-VN')}`,
    );

    if (expiredAssignments.length > 0) {
      try {
        await this.examScheduleService.updateScheduleStatus();
        console.log('📋 Triggered schedule status update after closing rooms');
      } catch (error) {
        console.error(
          '❌ Error updating schedule status:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  // Lấy assignment theo lịch thi
  async findBySchedule(scheduleId: number): Promise<ExamScheduleAssignments[]> {
    return await this.assignmentRepo.find({
      where: { examSchedule: { id: scheduleId } },
      relations: ['exam', 'class'],
    });
  }

  // Lấy assignment theo lớp
  async findByClass(classId: number): Promise<ExamScheduleAssignments[]> {
    return await this.assignmentRepo.find({
      where: { class: { id: classId } },
      relations: ['exam', 'examSchedule'],
      order: { createdAt: 'DESC' },
    });
  }

  // Lấy assignment theo trạng thái
  async findByStatus(
    status: 'waiting' | 'open' | 'closed',
  ): Promise<ExamScheduleAssignments[]> {
    return await this.assignmentRepo.find({
      where: { status },
      relations: ['exam', 'examSchedule', 'class'],
      order: { createdAt: 'DESC' },
    });
  }

  // Thay đổi trạng thái phòng thi thủ công
  async changeStatus(
    id: number,
    status: 'waiting' | 'open' | 'closed',
  ): Promise<ExamScheduleAssignments> {
    const assignment = await this.findOne(id);

    // 🔥 THÊM: Validate parent schedule status
    if (assignment.examSchedule.status !== 'active' && status === 'open') {
      throw new BadRequestException(
        `Không thể mở phòng thi khi lịch thi có trạng thái: ${assignment.examSchedule.status}`,
      );
    }

    // Validate logic chuyển trạng thái
    if (assignment.status === 'closed' && status !== 'closed') {
      throw new BadRequestException('Không thể mở lại phòng thi đã đóng');
    }

    if (status === 'open') {
      // Kiểm tra thời gian
      const now = new Date();
      if (assignment.examSchedule.startTime > now) {
        throw new BadRequestException('Chưa đến giờ thi');
      }
      if (assignment.examSchedule.endTime < now) {
        throw new BadRequestException('Đã hết giờ thi');
      }
    }

    assignment.status = status;

    if (status === 'closed') {
      try {
        await this.examScheduleService.updateScheduleStatus();
        console.log('📋 Triggered schedule status update after manual close');
      } catch (error) {
        console.error(
          '❌ Error updating schedule status:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    return await this.assignmentRepo.save(assignment);
  }

  private autoSubmitStudentExams(assignmentId: number) {
    console.log(`Auto submitting exams for assignment ${assignmentId}`);
  }

  // Bulk create assignments for multiple classes
  async bulkCreate(
    examScheduleId: number,
    examId: number,
    classIds: number[],
    options?: { randomizeOrder?: boolean; description?: string },
  ): Promise<ExamScheduleAssignments[]> {
    // 🔥 THÊM: Validate parent schedule status
    const schedule = await this.examScheduleService.findOne(examScheduleId);

    if (schedule.status !== 'active') {
      throw new BadRequestException(
        `Không thể tạo phân công thi cho lịch thi có trạng thái: ${schedule.status}`,
      );
    }

    // Validate thời gian
    const now = new Date();
    if (schedule.endTime < now) {
      throw new BadRequestException(
        'Không thể tạo phân công cho lịch thi đã kết thúc',
      );
    }

    const assignments = classIds.map((classId, index) =>
      this.assignmentRepo.create({
        code: `${examScheduleId}-${examId}-${classId}-${Date.now()}-${index}`,
        randomizeOrder: options?.randomizeOrder || false,
        description: options?.description,
        exam: { id: examId },
        examSchedule: { id: examScheduleId },
        class: { id: classId },
      }),
    );

    return await this.assignmentRepo.save(assignments);
  }

  // 📊 Kiểm tra trạng thái tổng quan của hệ thống
  async getSystemStatus(): Promise<{
    schedulesToday: number;
    waitingRooms: number;
    openRooms: number;
    closedRooms: number;
    nextExamStartTime: Date | null;
    nextExamEndTime: Date | null;
  }> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Lịch thi hôm nay
    const schedulesToday = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoin('assignment.examSchedule', 'schedule')
      .where('schedule.start_time >= :startOfDay', { startOfDay })
      .andWhere('schedule.start_time <= :endOfDay', { endOfDay })
      .andWhere('schedule.status = :status', { status: 'active' })
      .getCount();

    // Phòng thi theo trạng thái
    const waitingRooms = await this.assignmentRepo.count({
      where: { status: 'waiting' },
    });
    const openRooms = await this.assignmentRepo.count({
      where: { status: 'open' },
    });
    const closedRooms = await this.assignmentRepo.count({
      where: { status: 'closed' },
    });

    // Exam sắp tới
    const nextExam = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoin('assignment.examSchedule', 'schedule')
      .where('assignment.status = :status', { status: 'waiting' })
      .andWhere('schedule.start_time > :now', { now: new Date() })
      .andWhere('schedule.status = :scheduleStatus', {
        scheduleStatus: 'active',
      })
      .orderBy('schedule.start_time', 'ASC')
      .select('schedule.start_time', 'startTime')
      .addSelect('schedule.end_time', 'endTime')
      .getRawOne();

    return {
      schedulesToday,
      waitingRooms,
      openRooms,
      closedRooms,
      nextExamStartTime: nextExam?.startTime || null,
      nextExamEndTime: nextExam?.endTime || null,
    };
  }

  @Cron('0 */5 7-22 * * 1-6')
  async optimizedExamMonitor(): Promise<void> {
    const now = new Date();
    console.log(`⏰ Exam Monitor Check at ${now.toLocaleString('vi-VN')}`);

    // Kiểm tra có exam nào cần xử lý không
    const status = await this.getSystemStatus();

    if (status.waitingRooms === 0 && status.openRooms === 0) {
      console.log('💤 No active exams - monitor sleeping');
      return;
    }

    // Chạy cả 2 processes
    await Promise.all([this.openRooms(), this.closeRooms()]);

    console.log(
      `📊 System Status: ${status.waitingRooms} waiting | ${status.openRooms} open | ${status.closedRooms} closed`,
    );
  }
}
