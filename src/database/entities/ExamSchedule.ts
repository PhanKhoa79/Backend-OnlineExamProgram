import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exams } from './Exams';
import { Subjects } from './Subjects';
import { ExamScheduleAssignments } from './ExamScheduleAssignments';
import { Classes } from './Classes';
import { Teachers } from './Teachers';

@Index('exam_schedule_pkey', ['id'], { unique: true })
@Entity('exam_schedule', { schema: 'public' })
export class ExamSchedule {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('date', { name: 'schedule_date' })
  scheduleDate: string;

  @Column('time without time zone', { name: 'start_time' })
  startTime: string;

  @Column('time without time zone', { name: 'end_time' })
  endTime: string;

  @Column('enum', { name: 'status', enum: ['scheduled', 'done', 'cancelled'] })
  status: 'scheduled' | 'done' | 'cancelled';

  @Column('text', { name: 'note', nullable: true })
  note: string | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'updated_at',
    nullable: true,
    default: () => 'now()',
  })
  updatedAt: Date | null;

  @ManyToOne(() => Exams, (exams) => exams.examSchedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'exam_id', referencedColumnName: 'id' }])
  exam: Exams;

  @ManyToOne(() => Subjects, (subjects) => subjects.examSchedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'subject_id', referencedColumnName: 'id' }])
  subject: Subjects;

  @OneToMany(
    () => ExamScheduleAssignments,
    (examScheduleAssignments) => examScheduleAssignments.examSchedule,
  )
  examScheduleAssignments: ExamScheduleAssignments[];

  @ManyToMany(() => Classes, (classes) => classes.examSchedules)
  classes: Classes[];

  @ManyToMany(() => Teachers, (teachers) => teachers.examSchedules)
  @JoinTable({
    name: 'exam_schedule_invigilators',
    joinColumns: [{ name: 'exam_schedule_id', referencedColumnName: 'id' }],
    inverseJoinColumns: [
      { name: 'invigilator_id', referencedColumnName: 'id' },
    ],
    schema: 'public',
  })
  teachers: Teachers[];
}
