import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentRepository } from './student.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classes } from 'src/database/entities/Classes';
import { RedisModule } from '../redis/redis.module';
import { StudentExamSessions } from 'src/database/entities/StudentExamSessions';
import { NotificationModule } from '../notification/notification.module';
import { Students } from 'src/database/entities/Students';

@Module({
  imports: [
    TypeOrmModule.forFeature([Students, Classes, StudentExamSessions]),
    RedisModule,
    NotificationModule,
  ],
  controllers: [StudentController],
  providers: [StudentService, StudentRepository],
  exports: [StudentService],
})
export class StudentModule {}
