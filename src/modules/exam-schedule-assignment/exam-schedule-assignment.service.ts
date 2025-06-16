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
      code: this.generateRoomCode(
        createDto.examScheduleId,
        createDto.examId,
        createDto.classId,
      ),
      maxParticipants: createDto.maxParticipants || 30, // Default 30 nếu không được cung cấp
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

    // 🔒 HOÀN TOÀN CẤM UPDATE KHI PHÒNG THI ĐANG MỞ
    if (assignment.status === 'open') {
      throw new BadRequestException(
        'Không thể cập nhật phòng thi khi đang có học sinh thi. Vui lòng đóng phòng thi trước khi chỉnh sửa.',
      );
    }

    // Kiểm tra maxParticipants không được nhỏ hơn currentParticipants
    if (
      updateDto.maxParticipants &&
      updateDto.maxParticipants < assignment.currentParticipants
    ) {
      throw new BadRequestException(
        `Không thể giảm số người tối đa xuống ${updateDto.maxParticipants} khi hiện có ${assignment.currentParticipants} người đang thi`,
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
        'exam_schedule_id IN (SELECT id FROM exam_schedule WHERE start_time <= :now AND status = :scheduleStatus)',
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

    // 🔥 THAY ĐỔI: Kiểm tra dựa trên startTime + duration thay vì endTime
    const scheduleNeedClosing = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoin('assignment.examSchedule', 'schedule')
      .leftJoin('assignment.exam', 'exam')
      .where('assignment.status = :status', { status: 'open' })
      .andWhere(
        "schedule.start_time + COALESCE(exam.duration, 60) * INTERVAL '1 minute' <= :now",
        { now },
      )
      .getCount();

    if (scheduleNeedClosing === 0) {
      return;
    }

    // Kiểm tra số phòng thi đang mở
    const openCount = await this.assignmentRepo.count({
      where: { status: 'open' },
    });

    // 🔥 THAY ĐỔI: Lấy assignments hết hạn dựa trên duration
    const expiredAssignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.examSchedule', 'schedule')
      .leftJoinAndSelect('assignment.exam', 'exam')
      .where('assignment.status = :status', { status: 'open' })
      .andWhere(
        "schedule.start_time + COALESCE(exam.duration, 60) * INTERVAL '1 minute' <= :now",
        { now },
      )
      .getMany();

    for (const assignment of expiredAssignments) {
      // Tính thời gian kết thúc thực tế
      const examEndTime = new Date(assignment.examSchedule.startTime);
      examEndTime.setMinutes(
        examEndTime.getMinutes() + (assignment.exam.duration || 60),
      );

      console.log(
        `⏰ Closing room ${assignment.code}: Started at ${assignment.examSchedule.startTime.toLocaleString('vi-VN')}, Duration: ${assignment.exam.duration}min, Should end at: ${examEndTime.toLocaleString('vi-VN')}`,
      );

      this.autoSubmitStudentExams(assignment.id);

      assignment.status = 'closed';
      await this.assignmentRepo.save(assignment);
    }

    console.log(
      `🔒 EXAM CLOSED: ${expiredAssignments.length}/${openCount} rooms closed at ${now.toLocaleString('vi-VN')} (based on exam duration)`,
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

      // 🔥 THAY ĐỔI: Kiểm tra dựa trên duration thay vì endTime
      const examEndTime = new Date(assignment.examSchedule.startTime);
      examEndTime.setMinutes(
        examEndTime.getMinutes() + (assignment.exam.duration || 60),
      );

      if (examEndTime < now) {
        throw new BadRequestException(
          `Đã hết giờ thi (kết thúc lúc ${examEndTime.toLocaleString('vi-VN')})`,
        );
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

  // Bulk create assignments for multiple classes with random exam distribution
  async bulkCreate(
    examScheduleId: number,
    examIds: number[], // Danh sách đề thi (phải <= số lớp)
    classIds: number[],
    options?: {
      randomizeOrder?: boolean;
      description?: string;
      maxParticipants?: number;
    },
  ): Promise<ExamScheduleAssignments[]> {
    // Validate đầu vào
    if (examIds.length === 0) {
      throw new BadRequestException('Phải có ít nhất 1 đề thi');
    }

    if (classIds.length === 0) {
      throw new BadRequestException('Phải có ít nhất 1 lớp học');
    }

    // 🔥 THÊM: Validate số lượng đề thi không được nhiều hơn số lớp
    if (examIds.length > classIds.length) {
      throw new BadRequestException(
        `Số lượng đề thi (${examIds.length}) không được nhiều hơn số lượng lớp (${classIds.length}). Một số đề thi sẽ không được sử dụng.`,
      );
    }

    // Validate parent schedule status
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

    // 🔥 THAY ĐỔI: Tạo danh sách đề thi cho từng lớp bằng cách random
    const assignedExamIds = this.distributeExamsToClasses(
      examIds,
      classIds.length,
    );

    const assignments = classIds.map((classId, index) =>
      this.assignmentRepo.create({
        code: this.generateRoomCode(
          examScheduleId,
          assignedExamIds[index],
          classId,
        ),
        randomizeOrder: options?.randomizeOrder || false,
        description: options?.description,
        maxParticipants: options?.maxParticipants || 30, // Default 30
        exam: { id: assignedExamIds[index] },
        examSchedule: { id: examScheduleId },
        class: { id: classId },
      }),
    );

    return await this.assignmentRepo.save(assignments);
  }

  // 🔧 Helper method: Phân phối đề thi cho các lớp
  private distributeExamsToClasses(
    examIds: number[],
    classCount: number,
  ): number[] {
    const result: number[] = [];

    // Shuffle danh sách đề thi để tăng tính ngẫu nhiên
    const shuffledExamIds = [...examIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < classCount; i++) {
      // Sử dụng modulo để lặp lại danh sách đề thi nếu cần
      const examIndex = i % shuffledExamIds.length;
      result.push(shuffledExamIds[examIndex]);
    }

    // Shuffle lại kết quả để tránh pattern có thể đoán được
    return result.sort(() => Math.random() - 0.5);
  }

  // 📊 Kiểm tra trạng thái tổng quan của hệ thống
  async getSystemStatus(): Promise<{
    schedulesToday: number;
    totalRooms: number;
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

    // Tổng số phòng thi (tất cả thời gian)
    const totalRooms = await this.assignmentRepo.count();

    // Phòng thi theo trạng thái (tất cả thời gian)
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
      .getRawOne<{ startTime: Date; endTime: Date }>();

    return {
      schedulesToday,
      totalRooms,
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

  // 🔥 THÊM: Method để demo randomization cho nhiều học sinh
  async demonstrateRandomization(
    assignmentId: number,
    studentIds: number[],
  ): Promise<{
    assignmentId: number;
    randomizeOrder: boolean;
    studentsRandomization: Array<{
      studentId: number;
      questionOrder: number[];
      firstThreeQuestions: string[];
    }>;
  }> {
    const assignment = await this.findOne(assignmentId);

    if (!assignment.randomizeOrder) {
      throw new BadRequestException(
        'Assignment không có randomizeOrder enabled. Không thể demo randomization.',
      );
    }

    const studentsRandomization: Array<{
      studentId: number;
      questionOrder: number[];
      firstThreeQuestions: string[];
    }> = [];

    for (const studentId of studentIds) {
      try {
        // Tạo seed riêng cho mỗi học sinh
        const seed = this.generateStudentSeed(assignmentId, studentId);

        // Giả lập danh sách câu hỏi (1-20)
        const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          questionText: `Câu hỏi số ${i + 1}`,
        }));

        // Shuffle với seed riêng
        const shuffledQuestions = this.shuffleWithSeed(mockQuestions, seed);

        studentsRandomization.push({
          studentId,
          questionOrder: shuffledQuestions.map((q) => q.id),
          firstThreeQuestions: shuffledQuestions
            .slice(0, 3)
            .map((q) => q.questionText),
        });
      } catch (error) {
        console.error(`Error processing student ${studentId}:`, error);
      }
    }

    return {
      assignmentId,
      randomizeOrder: assignment.randomizeOrder,
      studentsRandomization,
    };
  }

  // 🔧 Helper method: Tạo seed cho học sinh (copy từ ExamService)
  private generateStudentSeed(assignmentId: number, studentId: number): number {
    return (assignmentId * 31 + studentId * 37) * 1009 + 2017;
  }

  // 🔧 Helper method: Shuffle với seed (simplified version)
  private shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];

    let currentSeed = seed;
    const random = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % Math.pow(2, 32);
      return currentSeed / Math.pow(2, 32);
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  // 🔧 Helper method: Tạo room code chuyên nghiệp
  private generateRoomCode(
    scheduleId: number,
    examId: number,
    classId: number,
  ): string {
    const timestamp = Date.now().toString(36).toUpperCase(); // Base36 ngắn hơn
    const hash = (scheduleId * 31 + examId * 37 + classId * 41) % 10000; // Hash ngắn
    return `R${scheduleId}E${examId}C${classId}-${timestamp}${hash}`;
  }
}
