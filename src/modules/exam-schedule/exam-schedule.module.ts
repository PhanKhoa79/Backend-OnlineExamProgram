import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamSchedule } from '../../database/entities/ExamSchedule';
import { ExamScheduleAssignments } from '../../database/entities/ExamScheduleAssignments';
import { Classes } from '../../database/entities/Classes';
import { ExamScheduleService } from './exam-schedule.service';
import { ExamScheduleController } from './exam-schedule.controller';
import { ExamScheduleAssignmentModule } from '../exam-schedule-assignment/exam-schedule-assignment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamSchedule, ExamScheduleAssignments, Classes]),
    forwardRef(() => ExamScheduleAssignmentModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [ExamScheduleController],
  providers: [ExamScheduleService],
  exports: [ExamScheduleService],
})
export class ExamScheduleModule implements OnModuleInit {
  constructor(private readonly examScheduleService: ExamScheduleService) {}

  onModuleInit() {
    // Force inject service để đăng ký potential cron jobs
    console.log('✅ ExamSchedule Module Initialized!');
  }
}
