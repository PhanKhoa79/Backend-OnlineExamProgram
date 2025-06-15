import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exams } from 'src/database/entities/Exams';
import { Questions } from 'src/database/entities/Questions';
import { Subjects } from 'src/database/entities/Subjects';
import { Answers } from '../../database/entities/Answers';
import { StudentExams } from '../../database/entities/StudentExams';
import { StudentAnswers } from '../../database/entities/StudentAnswers';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exams,
      Questions,
      Subjects,
      Answers,
      StudentExams,
      StudentAnswers,
    ]),
    RedisModule,
  ],
  providers: [ExamService],
  controllers: [ExamController],
  exports: [ExamService],
})
export class ExamModule {}
