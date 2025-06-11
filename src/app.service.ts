import { Injectable, OnModuleInit } from '@nestjs/common';
import { ExamScheduleAssignmentService } from './modules/exam-schedule-assignment/exam-schedule-assignment.service';
import { Cache } from 'cache-manager';
@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly examScheduleAssignmentService: ExamScheduleAssignmentService,
  ) {}

  onModuleInit() {
    console.log('🚀 App Started - Cron Jobs Active!');
  }

  getHello(): string {
    return 'Hello World!';
  }
}
