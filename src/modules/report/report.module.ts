import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AnalyticsCacheService } from './analytics-cache.service';
import { RedisModule } from '../redis/redis.module';
import { StudentExams } from '../../database/entities/StudentExams';
import { Exams } from '../../database/entities/Exams';
import { Students } from '../../database/entities/Students';
import { Classes } from '../../database/entities/Classes';
import { StudentAnswers } from '../../database/entities/StudentAnswers';
import { Questions } from '../../database/entities/Questions';
import { Subjects } from '../../database/entities/Subjects';
import { Answers } from '../../database/entities/Answers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentExams,
      Exams,
      Students,
      Classes,
      StudentAnswers,
      Questions,
      Subjects,
      Answers,
    ]),
    RedisModule,
  ],
  providers: [ReportService, AnalyticsCacheService],
  controllers: [ReportController],
  exports: [AnalyticsCacheService],
})
export class ReportModule {}
