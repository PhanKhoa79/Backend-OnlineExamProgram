import { Injectable, OnModuleInit } from '@nestjs/common';
import { ExamScheduleAssignmentService } from '../exam-schedule-assignment/exam-schedule-assignment.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(
    private readonly examScheduleAssignmentService: ExamScheduleAssignmentService,
  ) {}

  onModuleInit() {
    console.log('🚀 All Scheduler Services Initialized!');
    console.log('⏰ Cron Jobs Status:');
    console.log('  - openRooms: Every minute');
    console.log('  - closeRooms: Every minute');
  }
}
