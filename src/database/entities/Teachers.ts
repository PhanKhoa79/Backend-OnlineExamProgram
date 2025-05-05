import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamSchedule } from './ExamSchedule';
import { Accounts } from './Accounts';

@Index('teachers_email_key', ['email'], { unique: true })
@Index('teachers_pkey', ['id'], { unique: true })
@Index('teachers_teacher_code_key', ['teacherCode'], { unique: true })
@Entity('teachers', { schema: 'public' })
export class Teachers {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'teacher_code',
    unique: true,
    length: 50,
  })
  teacherCode: string;

  @Column('character varying', { name: 'full_name', length: 255 })
  fullName: string;

  @Column('enum', { name: 'gender', enum: ['Nam', 'Nữ', 'Khác'] })
  gender: 'Nam' | 'Nữ' | 'Khác';

  @Column('date', { name: 'date_of_birth' })
  dateOfBirth: string;

  @Column('character varying', {
    name: 'phone_number',
    nullable: true,
    length: 15,
  })
  phoneNumber: string | null;

  @Column('character varying', {
    name: 'email',
    nullable: true,
    unique: true,
    length: 255,
  })
  email: string | null;

  @Column('text', { name: 'address', nullable: true })
  address: string | null;

  @Column('character varying', {
    name: 'academic_title',
    nullable: true,
    length: 255,
  })
  academicTitle: string | null;

  @Column('character varying', {
    name: 'department',
    nullable: true,
    length: 255,
  })
  department: string | null;

  @Column('character varying', {
    name: 'specialization',
    nullable: true,
    length: 255,
  })
  specialization: string | null;

  @Column('timestamp without time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('timestamp without time zone', {
    name: 'updated_at',
    nullable: true,
    default: () => 'now()',
  })
  updatedAt: Date | null;

  @ManyToMany(() => ExamSchedule, (examSchedule) => examSchedule.teachers)
  examSchedules: ExamSchedule[];

  @ManyToOne(() => Accounts, (accounts) => accounts.teachers, {
    onDelete: 'SET NULL',
  })
  @JoinColumn([{ name: 'account_id', referencedColumnName: 'id' }])
  account: Accounts;
}
