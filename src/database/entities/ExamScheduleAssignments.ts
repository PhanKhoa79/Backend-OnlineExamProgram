import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exams } from './Exams';
import { ExamSchedule } from './ExamSchedule';
import { Classes } from './Classes';

@Index('exam_schedule_assignments_pkey', ['id'], { unique: true })
@Entity('exam_schedule_assignments', { schema: 'public' })
export class ExamScheduleAssignments {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'code',
    length: 50,
    unique: true,
  })
  code: string;

  @Column('boolean', {
    name: 'randomize_order',
    default: false,
  })
  randomizeOrder: boolean;

  @ManyToOne(() => Exams, (exams) => exams.examScheduleAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'exam_id', referencedColumnName: 'id' }])
  exam: Exams;

  @ManyToOne(
    () => ExamSchedule,
    (schedule) => schedule.examScheduleAssignments,
    {
      onDelete: 'CASCADE',
    },
  )
  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @JoinColumn([{ name: 'exam_schedule_id', referencedColumnName: 'id' }])
  examSchedule: ExamSchedule;

  @ManyToOne(() => Classes, (cls) => cls.examScheduleAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'class_id', referencedColumnName: 'id' }])
  class: Classes;
}
