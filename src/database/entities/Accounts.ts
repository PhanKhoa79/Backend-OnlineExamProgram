import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notifications } from './Notifications';
import { Students } from './Students';
import { Teachers } from './Teachers';

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

  @Column('enum', { name: 'role', enum: ['student', 'teacher', 'admin'] })
  role: 'student' | 'teacher' | 'admin';

  @Column('timestamp without time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'updated_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
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

  @OneToMany(() => Teachers, (teachers) => teachers.account)
  teachers: Teachers[];
}
