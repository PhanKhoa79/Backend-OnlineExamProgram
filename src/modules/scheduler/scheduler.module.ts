import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ExamScheduleAssignmentModule } from '../exam-schedule-assignment/exam-schedule-assignment.module';

@Module({
  imports: [ExamScheduleAssignmentModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
