import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Questions } from 'src/database/entities/Questions';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectModule } from '../subject/subject.module';
import { Subjects } from 'src/database/entities/Subjects';

@Module({
  imports: [TypeOrmModule.forFeature([Questions, Subjects]), SubjectModule],
  providers: [QuestionsService],
  controllers: [QuestionsController],
  exports: [QuestionsService],
})
export class QuestionsModule {}
