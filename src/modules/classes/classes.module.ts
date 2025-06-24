import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { Classes } from 'src/database/entities/Classes';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../redis/redis.module';
import { ExamScheduleAssignments } from 'src/database/entities/ExamScheduleAssignments';

@Module({
  imports: [
    TypeOrmModule.forFeature([Classes, ExamScheduleAssignments]),
    RedisModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
