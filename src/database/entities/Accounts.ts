import {
  Column,
  Entity,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Notifications } from './Notifications';
import { Students } from './Students';
import { Role } from './Role';
import { LoginHistory } from './LoginHistory';
import { StudentExamSessions } from './StudentExamSessions';

@Index('accounts_accountname_key', ['accountname'], { unique: true })
@Index('accounts_email_key', ['email'], { unique: true })
@Index('accounts_pkey', ['id'], { unique: true })
@Entity('accounts', { schema: 'public' })
export class Accounts {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'accountname',
    length: 255,
  })
  accountname: string;

  @Column('character varying', { name: 'password', length: 255 })
  password: string;

  @Column('character varying', { name: 'email', unique: true, length: 255 })
  email: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date | null;

  @Column('boolean', {
    name: 'is_active',
    nullable: true,
    default: () => 'false',
  })
  isActive: boolean | null;

  @Column('character varying', {
    name: 'activation_token',
    nullable: true,
    length: 255,
  })
  activationToken: string | null;

  @Column('timestamp without time zone', {
    name: 'activation_token_expires_at',
    nullable: true,
  })
  activationTokenExpiresAt: Date | null;

  @Column('character varying', {
    name: 'url_avatar',
    length: 255,
    nullable: true,
  })
  urlAvatar: string | null;

  @Column('character varying', {
    name: 'reset_password_code',
    length: 6,
    nullable: true,
  })
  resetPasswordCode: string | null;

  @Column('timestamp without time zone', {
    name: 'reset_password_expires_at',
    nullable: true,
  })
  resetPasswordExpiresAt: Date | null;

  @OneToMany(() => Notifications, (notifications) => notifications.account)
  notifications: Notifications[];

  @OneToMany(() => Students, (students) => students.account)
  students: Students[];

  @OneToMany(() => LoginHistory, (loginHistory) => loginHistory.account)
  loginHistories: LoginHistory[];

  @OneToMany(() => StudentExamSessions, (session) => session.student)
  studentExamSessions: StudentExamSessions[];
  username: any;
}
