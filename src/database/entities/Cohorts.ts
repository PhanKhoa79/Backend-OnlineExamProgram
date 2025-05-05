import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Classes } from './Classes';
import { Students } from './Students';

@Index('cohorts_pkey', ['id'], { unique: true })
@Entity('cohorts', { schema: 'public' })
export class Cohorts {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 255 })
  name: string;

  @Column('integer', { name: 'start_year', nullable: true })
  startYear: number | null;

  @Column('integer', { name: 'end_year', nullable: true })
  endYear: number | null;

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

  @OneToMany(() => Classes, (classes) => classes.cohort)
  classes: Classes[];

  @OneToMany(() => Students, (students) => students.cohort)
  students: Students[];
}
