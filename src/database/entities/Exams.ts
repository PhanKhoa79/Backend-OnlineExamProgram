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
import { Questions } from './Questions';
import { ExamSchedule } from './ExamSchedule';
import { ExamScheduleAssignments } from './ExamScheduleAssignments';
import { Subjects } from './Subjects';
import { StudentExams } from './StudentExams';

@Index('exams_pkey', ['id'], { unique: true })
@Entity('exams', { schema: 'public' })
export class Exams {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 255 })
  name: string;

  @Column('integer', { name: 'duration', nullable: true })
  duration: number | null;

  @Column('boolean', {
    name: 'is_practice',
    nullable: true,
    default: () => 'false',
  })
  isPractice: boolean | null;

  @Column('enum', {
    name: 'exam_type',
    enum: ['practice', 'revision', 'official'],
  })
  examType: 'practice' | 'revision' | 'official';

  @Column('timestamp without time zone', { name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column('timestamp without time zone', { name: 'end_date', nullable: true })
  endDate: Date | null;

  @Column('integer', { name: 'total_questions', nullable: true })
  totalQuestions: number | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToMany(() => Questions, (questions) => questions.exams)
  @JoinTable({
    name: 'exam_questions',
    joinColumns: [{ name: 'exam_id', referencedColumnName: 'id' }],
    inverseJoinColumns: [{ name: 'question_id', referencedColumnName: 'id' }],
    schema: 'public',
  })
  questions: Questions[];

  @OneToMany(() => ExamSchedule, (examSchedule) => examSchedule.exam)
  examSchedules: ExamSchedule[];

  @OneToMany(
    () => ExamScheduleAssignments,
    (examScheduleAssignments) => examScheduleAssignments.exam,
  )
  examScheduleAssignments: ExamScheduleAssignments[];

  @ManyToOne(() => Subjects, (subjects) => subjects.exams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'subject_id', referencedColumnName: 'id' }])
  subject: Subjects;

  @OneToMany(() => StudentExams, (studentExams) => studentExams.exam)
  studentExams: StudentExams[];
}
