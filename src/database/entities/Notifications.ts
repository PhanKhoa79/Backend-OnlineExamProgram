import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Accounts } from './Accounts';

@Index('notifications_pkey', ['id'], { unique: true })
@Entity('notifications', { schema: 'public' })
export class Notifications {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'message' })
  message: string;

  @Column('timestamp without time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('boolean', {
    name: 'is_read',
    nullable: true,
    default: () => 'false',
  })
  isRead: boolean | null;

  @ManyToOne(() => Accounts, (accounts) => accounts.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'account_id', referencedColumnName: 'id' }])
  account: Accounts;
}
