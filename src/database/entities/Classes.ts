import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cohorts } from './Cohorts';
import { ExamSchedule } from './ExamSchedule';
import { Students } from './Students';

@Index('classes_pkey', ['id'], { unique: true })
@Entity('classes', { schema: 'public' })
export class Classes {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 255 })
  name: string;

  @ManyToOne(() => Cohorts, (cohorts) => cohorts.classes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn([{ name: 'cohort_id', referencedColumnName: 'id' }])
  cohort: Cohorts;

  @ManyToMany(() => ExamSchedule, (examSchedule) => examSchedule.classes)
  @JoinTable({
    name: 'exam_schedule_classes',
    joinColumns: [{ name: 'class_id', referencedColumnName: 'id' }],
    inverseJoinColumns: [
      { name: 'exam_schedule_id', referencedColumnName: 'id' },
    ],
    schema: 'public',
  })
  examSchedules: ExamSchedule[];

  @OneToMany(() => Students, (students) => students.class)
  students: Students[];
}
