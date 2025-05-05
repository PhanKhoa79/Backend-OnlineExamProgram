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

  @Column('timestamp without time zone', {
    name: 'start_time',
    nullable: true,
    default: () => 'now()',
  })
  startTime: Date | null;

  @Column('timestamp without time zone', { name: 'end_time', nullable: true })
  endTime: Date | null;

  @Column('double precision', { name: 'score', nullable: true, precision: 53 })
  score: number | null;

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
