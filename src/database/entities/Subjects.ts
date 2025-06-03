import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExamSchedule } from './ExamSchedule';
import { Exams } from './Exams';
import { Questions } from './Questions';

@Index('subjects_code_key', ['code'], { unique: true })
@Index('subjects_pkey', ['id'], { unique: true })
@Entity('subjects', { schema: 'public' })
export class Subjects {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ExamSchedule, (examSchedule) => examSchedule.subject)
  examSchedules: ExamSchedule[];

  @OneToMany(() => Exams, (exams) => exams.subject)
  exams: Exams[];

  @OneToMany(() => Questions, (questions) => questions.subject)
  questions: Questions[];
}
