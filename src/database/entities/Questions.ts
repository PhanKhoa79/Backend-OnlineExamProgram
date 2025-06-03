import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Answers } from './Answers';
import { Exams } from './Exams';
import { Subjects } from './Subjects';
import { StudentAnswers } from './StudentAnswers';

export enum DifficultyLevel {
  EASY = 'dễ',
  MEDIUM = 'trung bình',
  HARD = 'khó',
}

@Index('questions_pkey', ['id'], { unique: true })
@Entity('questions', { schema: 'public' })
export class Questions {
  @PrimaryGeneratedColumn()
  id: number;

  // Nội dung chính của câu hỏi (văn bản)
  @Column({ type: 'text', name: 'question_text' })
  questionText: string;

  // URL hình ảnh minh họa (nếu có)
  @Column({ type: 'text', name: 'image_url', nullable: true })
  imageUrl?: string;

  // URL audio minh họa (nếu có)
  @Column({ type: 'text', name: 'audio_url', nullable: true })
  audioUrl?: string;

  // Nếu câu hỏi dựa trên đoạn văn (reading), đoạn text đó sẽ nằm ở đây
  @Column({ type: 'text', name: 'passage_text', nullable: true })
  passageText?: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    name: 'difficulty_level',
    nullable: true,
  })
  difficultyLevel?: DifficultyLevel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Answers, (answer) => answer.question, { cascade: true })
  answers: Answers[];

  @ManyToMany(() => Exams, (exam) => exam.questions)
  exams: Exams[];

  @ManyToOne(() => Subjects, (subject) => subject.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subject_id' })
  subject: Subjects;

  @OneToMany(() => StudentAnswers, (sa) => sa.question)
  studentAnswers: StudentAnswers[];
}
