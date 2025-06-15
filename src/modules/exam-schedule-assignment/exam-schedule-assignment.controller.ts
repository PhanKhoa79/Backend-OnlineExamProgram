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
  UseInterceptors,
} from '@nestjs/common';
import { ExamScheduleAssignmentService } from './exam-schedule-assignment.service';
import { CreateExamScheduleAssignmentDto } from './dto/create-assignment.dto';
import { UpdateExamScheduleAssignmentDto } from './dto/update-assignment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../../modules/auth/decorator/permissions.decotator';

@Controller('exam-schedule-assignments')
export class ExamScheduleAssignmentController {
  constructor(
    private readonly assignmentService: ExamScheduleAssignmentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:create')
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

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateExamScheduleAssignmentDto,
  ) {
    return this.assignmentService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.assignmentService.remove(id);
    return { message: 'Phòng thi đã được xóa thành công' };
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
  bulkCreate(
    @Body()
    createDto: {
      examScheduleId: number;
      examId: number;
      classIds: number[];
      randomizeOrder?: boolean;
      description?: string;
    },
  ) {
    return this.assignmentService.bulkCreate(
      createDto.examScheduleId,
      createDto.examId,
      createDto.classIds,
      {
        randomizeOrder: createDto.randomizeOrder,
        description: createDto.description,
      },
    );
  }

  @Get('system-status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('room:view')
  getSystemStatus() {
    return this.assignmentService.getSystemStatus();
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
}
