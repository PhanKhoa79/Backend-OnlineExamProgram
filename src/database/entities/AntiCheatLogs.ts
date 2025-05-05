import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StudentExams } from './StudentExams';

@Index('anti_cheat_logs_pkey', ['id'], { unique: true })
@Entity('anti_cheat_logs', { schema: 'public' })
export class AntiCheatLogs {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'event_type', length: 255 })
  eventType: string;

  @Column('timestamp without time zone', {
    name: 'timestamp',
    nullable: true,
    default: () => 'now()',
  })
  timestamp: Date | null;

  @ManyToOne(() => StudentExams, (studentExams) => studentExams.antiCheatLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'student_exam_id', referencedColumnName: 'id' }])
  studentExam: StudentExams;
}
