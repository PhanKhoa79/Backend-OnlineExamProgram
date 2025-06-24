import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { StudentExams } from '../../database/entities/StudentExams';
import { Exams } from '../../database/entities/Exams';
import { Students } from '../../database/entities/Students';
import { Classes } from '../../database/entities/Classes';
import { StudentAnswers } from '../../database/entities/StudentAnswers';
import { Questions } from '../../database/entities/Questions';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentExams,
      Exams,
      Students,
      Classes,
      StudentAnswers,
      Questions,
    ]),
  ],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}
