import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ExamScheduleAssignmentService } from './exam-schedule-assignment.service';
import {
  CreateExamScheduleAssignmentDto,
  BulkCreateExamScheduleAssignmentDto,
} from './dto/create-assignment.dto';
import { UpdateExamScheduleAssignmentDto } from './dto/update-assignment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../../modules/auth/decorator/permissions.decotator';
import { ExamScheduleAssignments } from 'src/database/entities/ExamScheduleAssignments';
import { ActivityLog } from '../../common/decorators/activity-log.decorator';

@Controller('exam-schedule-assignments')
export class ExamScheduleAssignmentController {
  constructor(
    private readonly assignmentService: ExamScheduleAssignmentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:create')
  @ActivityLog({ action: 'CREATE', module: 'exam-schedule-assignment' })
  create(@Body() createDto: CreateExamScheduleAssignmentDto) {
    return this.assignmentService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:view')
  findAll(
    @Query('status') status?: 'waiting' | 'open' | 'closed',
    @Query('scheduleId') scheduleId?: number,
    @Query('classId') classId?: number,
  ) {
    if (status) {
      return this.assignmentService.findByStatus(status);
    }

    if (scheduleId) {
      return this.assignmentService.findBySchedule(scheduleId);
    }

    if (classId) {
      return this.assignmentService.findByClass(classId);
    }

    return this.assignmentService.findAll();
  }

  @Get('system-status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:view')
  getSystemStatus() {
    return this.assignmentService.getSystemStatus();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:update')
  @ActivityLog({ action: 'UPDATE', module: 'exam-schedule-assignment' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateExamScheduleAssignmentDto,
  ): Promise<ExamScheduleAssignments> {
    return this.assignmentService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:delete')
  @ActivityLog({ action: 'DELETE', module: 'exam-schedule-assignment' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    // Lấy thông tin phòng thi trước khi xóa
    const assignment = await this.assignmentService.findOne(id);
    
    // Thực hiện xóa
    await this.assignmentService.remove(id);
    
    return { 
      message: 'Phòng thi đã được xóa thành công',
      data: assignment // Trả về thông tin phòng thi đã xóa
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:update')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'waiting' | 'open' | 'closed',
  ) {
    return this.assignmentService.changeStatus(id, status);
  }

  @Post('bulk-create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:create')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Body() createDto: BulkCreateExamScheduleAssignmentDto) {
    return this.assignmentService.bulkCreate(
      createDto.examScheduleId,
      createDto.examIds, // 🔥 THAY ĐỔI: Từ examId thành examIds
      createDto.classIds,
      {
        randomizeOrder: createDto.randomizeOrder,
        description: createDto.description,
        maxParticipants: createDto.maxParticipants,
      },
    );
  }

  @Post('manual-sync')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:create')
  @HttpCode(HttpStatus.OK)
  async manualSync() {
    await Promise.all([
      this.assignmentService.openRooms(),
      this.assignmentService.closeRooms(),
    ]);

    const status = await this.assignmentService.getSystemStatus();
    return {
      message: 'Manual sync completed',
      timestamp: new Date().toLocaleString('vi-VN'),
      systemStatus: status,
    };
  }

  @Post(':id/demo-randomization')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:view')
  @HttpCode(HttpStatus.OK)
  async demonstrateRandomization(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Body('studentIds') studentIds: number[],
  ) {
    return await this.assignmentService.demonstrateRandomization(
      assignmentId,
      studentIds,
    );
  }
}
