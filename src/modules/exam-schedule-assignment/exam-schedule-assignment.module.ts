import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamScheduleAssignments } from '../../database/entities/ExamScheduleAssignments';
import { ExamScheduleAssignmentService } from './exam-schedule-assignment.service';
import { ExamScheduleAssignmentController } from './exam-schedule-assignment.controller';
import { ExamScheduleModule } from '../exam-schedule/exam-schedule.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamScheduleAssignments]),
    forwardRef(() => ExamScheduleModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [ExamScheduleAssignmentController],
  providers: [ExamScheduleAssignmentService],
  exports: [ExamScheduleAssignmentService],
})
export class ExamScheduleAssignmentModule implements OnModuleInit {
  constructor(
    private readonly examScheduleAssignmentService: ExamScheduleAssignmentService,
  ) {}

  onModuleInit() {
    // Force inject service để đăng ký cron jobs
    console.log('✅ ExamScheduleAssignment Cron Jobs Started!');
  }
}
