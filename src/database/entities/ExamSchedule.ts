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
import { Subjects } from './Subjects';
import { ExamScheduleAssignments } from './ExamScheduleAssignments';
@Index('exam_schedule_pkey', ['id'], { unique: true })
@Entity('exam_schedule', { schema: 'public' })
export class ExamSchedule {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'code',
    length: 50,
    unique: true,
  })
  code: string;

  @Column('timestamp', { name: 'start_time' })
  startTime: Date;

  @Column('timestamp', { name: 'end_time' })
  endTime: Date;

  @Column('enum', {
    name: 'status',
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  })
  status: 'active' | 'completed' | 'cancelled';

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Subjects, (subjects) => subjects.examSchedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'subject_id', referencedColumnName: 'id' }])
  subject: Subjects;

  @OneToMany(
    () => ExamScheduleAssignments,
    (assignment) => assignment.examSchedule,
  )
  examScheduleAssignments: ExamScheduleAssignments[];
}
