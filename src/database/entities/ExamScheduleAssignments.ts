import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exams } from './Exams';
import { ExamSchedule } from './ExamSchedule';
import { Classes } from './Classes';
import { StudentExamSessions } from './StudentExamSessions';

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

  @Column('enum', {
    name: 'status',
    enum: ['waiting', 'open', 'closed'],
    default: 'waiting',
  })
  status: 'waiting' | 'open' | 'closed';

  @Column('integer', {
    name: 'max_participants',
    default: 30,
    comment: 'Số lượng người tối đa có thể tham gia phòng thi',
  })
  maxParticipants: number;

  @Column('integer', {
    name: 'current_participants',
    default: 0,
    comment: 'Số lượng người hiện tại đang trong phòng thi',
  })
  currentParticipants: number;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

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
  @JoinColumn([{ name: 'exam_schedule_id', referencedColumnName: 'id' }])
  examSchedule: ExamSchedule;

  @ManyToOne(() => Classes, (cls) => cls.examScheduleAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'class_id', referencedColumnName: 'id' }])
  class: Classes;

  @OneToMany(() => StudentExamSessions, (session) => session.assignment, {
    onDelete: 'CASCADE',
  })
  studentExamSessions: StudentExamSessions[];
}
