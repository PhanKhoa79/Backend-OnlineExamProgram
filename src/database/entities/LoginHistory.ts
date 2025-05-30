import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Accounts } from './Accounts';

@Entity('login_history', { schema: 'public' })
export class LoginHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Accounts, (account) => account.loginHistories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: Accounts;

  @Column('timestamp without time zone', {
    name: 'login_time',
    default: () => 'CURRENT_TIMESTAMP',
  })
  loginTime: Date;

  @Column('character varying', { name: 'ip_address', length: 50 })
  ipAddress: string;

  @Column('character varying', { name: 'user_agent', length: 255 })
  userAgent: string;
}
