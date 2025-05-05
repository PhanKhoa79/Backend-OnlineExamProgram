import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamSchedule } from './ExamSchedule';
import { Exams } from './Exams';
import { Questions } from './Questions';

@Index('subjects_code_key', ['code'], { unique: true })
@Index('subjects_pkey', ['id'], { unique: true })
@Entity('subjects', { schema: 'public' })
export class Subjects {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 255 })
  name: string;

  @Column('character varying', { name: 'code', unique: true, length: 50 })
  code: string;

  @Column('timestamp without time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(() => ExamSchedule, (examSchedule) => examSchedule.subject)
  examSchedules: ExamSchedule[];

  @OneToMany(() => Exams, (exams) => exams.subject)
  exams: Exams[];

  @OneToMany(() => Questions, (questions) => questions.subject)
  questions: Questions[];
}
