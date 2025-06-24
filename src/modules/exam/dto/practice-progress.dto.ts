export class PracticeProgressDto {
  subjectName: string;
  totalPracticeExams: number;
  completedPracticeExams: number;
  progressPercentage: number;
}

export class StudentPracticeProgressResponseDto {
  studentId: number;
  subjects: PracticeProgressDto[];
  overallProgress: {
    totalSubjects: number;
    totalPracticeExams: number;
    totalCompletedExams: number;
    overallPercentage: number;
  };
}
