import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StudentExams } from './StudentExams';
import { Accounts } from './Accounts';
import { Classes } from './Classes';
import { Cohorts } from './Cohorts';

@Index('students_email_key', ['email'], { unique: true })
@Index('students_pkey', ['id'], { unique: true })
@Index('students_student_code_key', ['studentCode'], { unique: true })
@Entity('students', { schema: 'public' })
export class Students {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'student_code',
    unique: true,
    length: 50,
  })
  studentCode: string;

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

  @OneToMany(() => StudentExams, (studentExams) => studentExams.student)
  studentExams: StudentExams[];

  @ManyToOne(() => Accounts, (accounts) => accounts.students, {
    onDelete: 'SET NULL',
  })
  @JoinColumn([{ name: 'account_id', referencedColumnName: 'id' }])
  account: Accounts;

  @ManyToOne(() => Classes, (classes) => classes.students, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn([{ name: 'class_id', referencedColumnName: 'id' }])
  class: Classes;

  @ManyToOne(() => Cohorts, (cohorts) => cohorts.students, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn([{ name: 'cohort_id', referencedColumnName: 'id' }])
  cohort: Cohorts;
}
