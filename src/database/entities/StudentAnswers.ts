import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Answers } from './Answers';
import { Questions } from './Questions';
import { StudentExams } from './StudentExams';

@Index('student_answers_pkey', ['questionId', 'studentExamId'], {
  unique: true,
})
@Entity('student_answers', { schema: 'public' })
export class StudentAnswers {
  @Column('integer', { primary: true, name: 'student_exam_id' })
  studentExamId: number;

  @Column('integer', { primary: true, name: 'question_id' })
  questionId: number;

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
