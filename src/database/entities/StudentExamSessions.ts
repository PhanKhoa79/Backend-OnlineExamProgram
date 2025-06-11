import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExamScheduleAssignments } from './ExamScheduleAssignments';
import { Accounts } from './Accounts';

@Index('student_exam_sessions_pkey', ['id'], { unique: true })
@Index('student_assignment_unique', ['student', 'assignment'], { unique: true })
@Entity('student_exam_sessions', { schema: 'public' })
export class StudentExamSessions {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('timestamp', {
    name: 'join_time',
    nullable: true,
    comment: 'Thời gian học sinh vào phòng thi',
  })
  joinTime: Date | null;

  @Column('timestamp', {
    name: 'leave_time',
    nullable: true,
    comment: 'Thời gian học sinh rời phòng thi',
  })
  leaveTime: Date | null;

  @Column('enum', {
    name: 'status',
    enum: ['active', 'completed', 'disconnected', 'kicked'],
    default: 'active',
    comment: 'Trạng thái của học sinh trong phòng thi',
  })
  status: 'active' | 'completed' | 'disconnected' | 'kicked';

  @Column('integer', {
    name: 'violation_count',
    default: 0,
    comment: 'Số lần vi phạm anti-cheat (từ AntiCheatLogs)',
  })
  violationCount: number;

  @Column('timestamp', {
    name: 'last_heartbeat',
    nullable: true,
    comment: 'Lần cuối cùng nhận được heartbeat',
  })
  lastHeartbeat: Date | null;

  @Column('text', {
    name: 'notes',
    nullable: true,
    comment: 'Ghi chú về session (lý do kick, disconnect, etc.)',
  })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Accounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'id' }])
  student: Accounts;

  @ManyToOne(() => ExamScheduleAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'assignment_id', referencedColumnName: 'id' }])
  assignment: ExamScheduleAssignments;
}
