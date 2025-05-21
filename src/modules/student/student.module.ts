import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { Students } from 'src/database/entities/Students';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentRepository } from './student.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Students])],
  controllers: [StudentController],
  providers: [StudentService, StudentRepository],
  exports: [StudentService],
})
export class StudentModule {}
