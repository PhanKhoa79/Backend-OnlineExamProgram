import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Answers } from './Answers';
import { Questions } from './Questions';
import { StudentExams } from './StudentExams';

@Index('student_answers_pkey', ['questionId', 'studentExamId'], {
  unique: true,
})
@Entity('student_answers', { schema: 'public' })
export class StudentAnswers {
  @PrimaryColumn({ name: 'student_exam_id', type: 'integer' })
  studentExamId: number;

  @PrimaryColumn({ name: 'question_id', type: 'integer' })
  questionId: number;

  @Column('integer', { name: 'answer_id', nullable: true })
  answerId: number | null;

  @Column('timestamp', {
    name: 'answered_at',
    nullable: true,
    default: () => 'now()',
  })
  answeredAt: Date | null;

  @Column('boolean', { name: 'is_marked', default: false })
  isMarked: boolean;

  @ManyToOne(() => Answers, (answers) => answers.studentAnswers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'answer_id', referencedColumnName: 'id' }])
  answer: Answers;

  @ManyToOne(() => Questions, (questions) => questions.studentAnswers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'question_id', referencedColumnName: 'id' }])
  question: Questions;

  @ManyToOne(
    () => StudentExams,
    (studentExams) => studentExams.studentAnswers,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([{ name: 'student_exam_id', referencedColumnName: 'id' }])
  studentExam: StudentExams;
}
