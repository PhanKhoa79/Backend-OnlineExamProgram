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
import { ExamScheduleService } from './exam-schedule.service';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { UpdateExamScheduleDto } from './dto/update-exam-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../../modules/auth/decorator/permissions.decotator';
import { ActivityLog } from '../../common/decorators/activity-log.decorator';

@Controller('exam-schedules')
export class ExamScheduleController {
  constructor(private readonly examScheduleService: ExamScheduleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('schedule:create')
  @ActivityLog({ action: 'CREATE', module: 'schedule' })
  create(@Body() createDto: CreateExamScheduleDto) {
    return this.examScheduleService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('schedule:view')
  findAll(
    @Query('status') status?: 'active' | 'completed' | 'cancelled',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (status) {
      return this.examScheduleService.findByStatus(status);
    }

    if (startDate && endDate) {
      return this.examScheduleService.findByDateRange(
        new Date(startDate),
        new Date(endDate),
      );
    }

    return this.examScheduleService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('schedule:view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examScheduleService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('schedule:update')
  @ActivityLog({ action: 'UPDATE', module: 'schedule' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateExamScheduleDto,
  ) {
    return this.examScheduleService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('schedule:delete')
  @ActivityLog({ action: 'DELETE', module: 'schedule' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    // Lấy thông tin lịch thi trước khi xóa
    const schedule = await this.examScheduleService.findOne(id);
    
    // Thực hiện xóa
    await this.examScheduleService.remove(id);
    
    return { 
      message: 'Lịch thi đã được xóa thành công',
      data: schedule // Trả về thông tin lịch thi đã xóa
    };
  }

  @Post('update-status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('schedule:update')
  @HttpCode(HttpStatus.OK)
  updateStatus() {
    return this.examScheduleService.updateScheduleStatus();
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('schedule:update')
  @ActivityLog({
    action: 'CANCEL',
    module: 'schedule',
    description: 'đã hủy lịch thi',
  })
  @HttpCode(HttpStatus.OK)
  cancelSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.examScheduleService.cancelSchedule(id, reason);
  }
}
