import { Module } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { AnswerController } from './answer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Answers } from 'src/database/entities/Answers';

@Module({
  imports: [TypeOrmModule.forFeature([Answers])],
  providers: [AnswerService],
  controllers: [AnswerController],
  exports: [AnswerService],
})
export class AnswerModule {}
