import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Accounts } from './Accounts';

@Entity('activity_logs')
export class ActivityLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'account_id' })
  accountId: number;

  @Column({ length: 50 })
  action: string; // CREATE, UPDATE, DELETE

  @Column({ length: 100 })
  module: string; // subject, exam, class, question, etc.

  @Column({ name: 'target_id', nullable: true })
  targetId: number; // ID của đối tượng bị tác động

  @Column({ name: 'target_name', length: 255, nullable: true })
  targetName: string; // Tên của đối tượng bị tác động

  @Column({ type: 'text', nullable: true })
  description: string; // Mô tả chi tiết hoạt động

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Accounts, (account) => account.id)
  @JoinColumn({ name: 'account_id' })
  account: Accounts;
}
