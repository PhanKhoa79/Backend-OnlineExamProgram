import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Answers } from './Answers';
import { Exams } from './Exams';
import { Subjects } from './Subjects';
import { StudentAnswers } from './StudentAnswers';

@Index('questions_pkey', ['id'], { unique: true })
@Entity('questions', { schema: 'public' })
export class Questions {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'question_text' })
  questionText: string;

  @Column('enum', {
    name: 'question_type',
    nullable: true,
    enum: [
      'multiple_choice',
      'fill_in_blank',
      'listening',
      'reading_comprehension',
      'true_false',
      'essay',
    ],
  })
  questionType:
    | 'multiple_choice'
    | 'fill_in_blank'
    | 'listening'
    | 'reading_comprehension'
    | 'true_false'
    | 'essay'
    | null;

  @Column('integer', { name: 'difficulty_level', nullable: true })
  difficultyLevel: number | null;

  @Column('text', { name: 'audio_url', nullable: true })
  audioUrl: string | null;

  @Column('text', { name: 'image_url', nullable: true })
  imageUrl: string | null;

  @Column('text', { name: 'passage_text', nullable: true })
  passageText: string | null;

  @Column('enum', {
    name: 'question_part',
    nullable: true,
    enum: [
      'Part 1',
      'Part 2',
      'Part 3',
      'Part 4',
      'Part 5',
      'Part 6',
      'Part 7',
    ],
  })
  questionPart:
    | 'Part 1'
    | 'Part 2'
    | 'Part 3'
    | 'Part 4'
    | 'Part 5'
    | 'Part 6'
    | 'Part 7'
    | null;

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

  @OneToMany(() => Answers, (answers) => answers.question)
  answers: Answers[];

  @ManyToMany(() => Exams, (exams) => exams.questions)
  exams: Exams[];

  @ManyToOne(() => Subjects, (subjects) => subjects.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'subject_id', referencedColumnName: 'id' }])
  subject: Subjects;

  @OneToMany(() => StudentAnswers, (studentAnswers) => studentAnswers.question)
  studentAnswers: StudentAnswers[];
}
