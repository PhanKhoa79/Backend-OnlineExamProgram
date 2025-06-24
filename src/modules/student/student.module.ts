import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { Students } from 'src/database/entities/Students';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentRepository } from './student.repository';
import { Classes } from 'src/database/entities/Classes';
import { RedisModule } from '../redis/redis.module';
import { StudentExamSessions } from 'src/database/entities/StudentExamSessions';

@Module({
  imports: [
    TypeOrmModule.forFeature([Students, Classes, StudentExamSessions]),
    RedisModule,
  ],
  controllers: [StudentController],
  providers: [StudentService, StudentRepository],
  exports: [StudentService],
})
export class StudentModule {}
