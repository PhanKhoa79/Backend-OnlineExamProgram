import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AntiCheatLogs } from './AntiCheatLogs';
import { StudentAnswers } from './StudentAnswers';
import { Exams } from './Exams';
import { Students } from './Students';

@Index('student_exams_pkey', ['id'], { unique: true })
@Entity('student_exams', { schema: 'public' })
export class StudentExams {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('double precision', { name: 'score', nullable: true })
  score: number | null;

  @Column('boolean', { name: 'is_submitted', default: false })
  isSubmitted: boolean;

  @Column('timestamp without time zone', { name: 'started_at', nullable: true })
  startedAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'submitted_at',
    nullable: true,
  })
  submittedAt: Date | null;

  @OneToMany(() => AntiCheatLogs, (antiCheatLogs) => antiCheatLogs.studentExam)
  antiCheatLogs: AntiCheatLogs[];

  @OneToMany(
    () => StudentAnswers,
    (studentAnswers) => studentAnswers.studentExam,
  )
  studentAnswers: StudentAnswers[];

  @ManyToOne(() => Exams, (exams) => exams.studentExams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'exam_id', referencedColumnName: 'id' }])
  exam: Exams;

  @ManyToOne(() => Students, (students) => students.studentExams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'id' }])
  student: Students;
}
