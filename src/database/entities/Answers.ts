import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Questions } from './Questions';
import { StudentAnswers } from './StudentAnswers';

@Index('answers_pkey', ['id'], { unique: true })
@Entity('answers', { schema: 'public' })
export class Answers {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'answer_text' })
  answerText: string;

  @Column('boolean', {
    name: 'is_correct',
    nullable: true,
    default: () => 'false',
  })
  isCorrect: boolean | null;

  @ManyToOne(() => Questions, (questions) => questions.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'question_id', referencedColumnName: 'id' }])
  question: Questions;

  @OneToMany(() => StudentAnswers, (studentAnswers) => studentAnswers.answer)
  studentAnswers: StudentAnswers[];
}
