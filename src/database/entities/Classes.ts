import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Students } from './Students';
import { ExamScheduleAssignments } from './ExamScheduleAssignments';

@Index('classes_pkey', ['id'], { unique: true })
@Entity('classes', { schema: 'public' })
export class Classes {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Students, (students) => students.class)
  students: Students[];

  @OneToMany(() => ExamScheduleAssignments, (assignment) => assignment.class)
  examScheduleAssignments: ExamScheduleAssignments[];
}
