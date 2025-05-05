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

@Index('exam_schedule_assignments_pkey', ['id'], { unique: true })
@Entity('exam_schedule_assignments', { schema: 'public' })
export class ExamScheduleAssignments {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'class_name', length: 255 })
  className: string;

  @Column('character varying', {
    name: 'room_name',
    nullable: true,
    length: 255,
  })
  roomName: string | null;

  @Column('integer', { name: 'quantity', nullable: true })
  quantity: number | null;

  @Column('character varying', {
    name: 'exam_type',
    nullable: true,
    length: 20,
  })
  examType: string | null;

  @Column('boolean', {
    name: 'randomize_order',
    nullable: true,
    default: () => 'false',
  })
  randomizeOrder: boolean | null;

  @Column('text', { name: 'note', nullable: true })
  note: string | null;

  @ManyToOne(() => Exams, (exams) => exams.examScheduleAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'exam_id', referencedColumnName: 'id' }])
  exam: Exams;

  @ManyToOne(
    () => ExamSchedule,
    (examSchedule) => examSchedule.examScheduleAssignments,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([{ name: 'exam_schedule_id', referencedColumnName: 'id' }])
  examSchedule: ExamSchedule;
}
