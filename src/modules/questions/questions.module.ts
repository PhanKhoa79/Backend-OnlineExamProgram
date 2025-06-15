import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Questions } from 'src/database/entities/Questions';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectModule } from '../subject/subject.module';
import { Subjects } from 'src/database/entities/Subjects';
import { Answers } from 'src/database/entities/Answers';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Questions, Subjects, Answers]),
    SubjectModule,
    RedisModule,
  ],
  providers: [QuestionsService],
  controllers: [QuestionsController],
  exports: [QuestionsService],
})
export class QuestionsModule {}
