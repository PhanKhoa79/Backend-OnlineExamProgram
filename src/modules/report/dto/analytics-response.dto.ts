// 1. Analytics Summary Response
export interface AnalyticsSummaryResponse {
  totalExams: number;
  totalStudents: number;
  averageScore: number;
  passRate: number;
  completionRate: number;
  weeklyGrowth: {
    exams: number;
    score: number;
    students: number;
  };
}

// 2. Score Trends Response
export interface ScoreTrendsResponse {
  labels: string[];
  datasets: {
    averageScores: number[];
    practiceScores: number[];
    officialScores: number[];
    passRates: number[];
  };
}

// 3. Subject Performance Response
export interface SubjectPerformanceResponse {
  subjects: {
    id: number;
    name: string;
    averageScore: number;
    passRate: number;
    totalExams: number;
    totalStudents: number;
    difficulty: 'easy' | 'medium' | 'hard';
    trend: 'up' | 'down' | 'stable';
  }[];
}

// 4. Class Performance Response
export interface ClassPerformanceResponse {
  classes: {
    id: number;
    name: string;
    averageScore: number;
    passRate: number;
    totalExams: number;
    activeStudents: number;
    rank: number;
    improvement: number;
  }[];
  comparison: {
    subjectId: number;
    subjectName: string;
    classScores: {
      classId: number;
      className: string;
      averageScore: number;
    }[];
  }[];
}

// 5. Student Performance Response
export interface StudentPerformanceResponse {
  topPerformers: {
    id: number;
    name: string;
    className: string;
    averageScore: number;
    totalExams: number;
    improvement: number;
  }[];
  strugglingStudents: {
    id: number;
    name: string;
    className: string;
    averageScore: number;
    weakSubjects: string[];
    recommendedActions: string[];
  }[];
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    belowAverage: number;
    poor: number;
  };
}

// 6. Time Analysis Response
export interface TimeAnalysisResponse {
  averageCompletionTime: number;
  timeVsScoreCorrelation: number;
  peakHours: {
    hour: number;
    submissions: number;
  }[];
  completionRateByTime: {
    [timeSlot: string]: number;
  };
  timeDistribution: {
    under30: number;
    between30And60: number;
    between60And90: number;
    over90: number;
  };
}

// 7. Score Distribution Response
export interface ScoreDistributionResponse {
  histogram: {
    range: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  statistics: {
    mean: number;
    median: number;
    mode: number;
    standardDeviation: number;
    skewness: number;
    kurtosis: number;
  };
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
    iqr: number;
  };
  outliers: {
    lower: number[];
    upper: number[];
  };
}

// 8. Progress Tracking Response
export interface ProgressTrackingResponse {
  learningCurves: {
    studentId: number;
    studentName: string;
    className: string;
    trend: 'improving' | 'declining' | 'stable';
    improvement: number;
    averageScore: number;
    totalExams: number;
    progressData: {
      date: string;
      score: number;
      subjectName: string;
      examType: string;
    }[];
  }[];
  classTrends: {
    className: string;
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    improvement: number;
    totalExams: number;
  }[];
  subjectProgress: {
    subjectName: string;
    averageScore: number;
    improvement: number;
    totalExams: number;
  }[];
}

// 9. Comparative Analysis Response
export interface ComparativeAnalysisResponse {
  summary: {
    groupA: {
      name: string;
      averageScore: number;
      passRate: number;
      totalExams: number;
    };
    groupB: {
      name: string;
      averageScore: number;
      passRate: number;
      totalExams: number;
    };
    difference: {
      scoreDiff: number;
      passRateDiff: number;
      significance: 'high' | 'medium' | 'low' | 'none';
    };
  };
  detailedComparison: {
    subjectId: number;
    subjectName: string;
    groupAScore: number;
    groupBScore: number;
    difference: number;
    winner: 'A' | 'B' | 'tie';
  }[];
  recommendations: string[];
}

// 10. Alerts & Insights Response
export interface AlertsInsightsResponse {
  alerts: {
    id: string;
    type: 'performance' | 'participation' | 'difficulty' | 'anomaly';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    affectedEntities: {
      type: 'student' | 'class' | 'subject';
      id: number;
      name: string;
    }[];
    recommendations: string[];
    createdAt: string;
    priority: number;
  }[];
  insights: {
    id: string;
    category: 'trend' | 'achievement' | 'opportunity' | 'risk';
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    confidence: number;
    actionable: boolean;
    relatedData: any;
  }[];
  kpis: {
    name: string;
    current: number;
    target: number;
    status: 'on_track' | 'at_risk' | 'off_track';
    trend: 'up' | 'down' | 'stable';
  }[];
}

// Exam Volume Statistics Response
export interface ExamVolumeResponse {
  // Cấu hình và metadata
  config: {
    timeRange: string;
    granularity: 'daily' | 'weekly' | 'monthly';
    isSpecificDate: boolean;
    comparisonEnabled: boolean;
  };

  // Dữ liệu chính
  data: {
    labels: string[]; // dates, weeks, or months
    practiceExams: number[]; // số lượng bài luyện tập
    officialExams: number[]; // số lượng bài chính thức
    totalExams: number[]; // tổng số bài thi
    practicePercentage: number[]; // % bài luyện tập
    officialPercentage: number[]; // % bài chính thức
  };

  // So sánh với kỳ trước (nếu có)
  comparison?: {
    labels: string[];
    practiceExams: number[];
    officialExams: number[];
    totalExams: number[];
    changes: {
      practiceChange: number; // % thay đổi
      officialChange: number;
      totalChange: number;
    };
  };

  // Thống kê tổng hợp
  summary: {
    totalPracticeExams: number;
    totalOfficialExams: number;
    totalExams: number;
    practiceToOfficialRatio: number; // tỷ lệ luyện tập/chính thức
    averageExamsPerDay: number;
    peakDay?: {
      date: string;
      count: number;
      type: 'practice' | 'official' | 'both';
    };
    trends: {
      practice: 'increasing' | 'decreasing' | 'stable';
      official: 'increasing' | 'decreasing' | 'stable';
      overall: 'increasing' | 'decreasing' | 'stable';
    };
  };

  // Insights và đề xuất
  insights: {
    practiceUsage: string; // Ví dụ: "Học sinh sử dụng bài luyện tập nhiều hơn 3.2 lần so với bài chính thức"
    peakTimes: string; // Ví dụ: "Thời gian thi cao điểm là 14:00-16:00"
    recommendations: string[]; // Đề xuất cải thiện
  };

  // Metadata
  metadata: {
    dateRange: {
      start: string;
      end: string;
    };
    appliedFilters: {
      classes?: string[];
      subjects?: string[];
      students?: string[];
    };
    dataQuality: {
      completeness: number; // % dữ liệu đầy đủ
      lastUpdated: string;
    };
  };
}

// Exam Volume Response - đơn giản cho biểu đồ frontend
export interface ExamVolumeDataPoint {
  date: string; // YYYY-MM-DD hoặc YYYY-MM hoặc YYYY-WW
  practiceCount: number; // Số lượng đề luyện tập đã hoàn thành
  officialCount: number; // Số lượng đề chính thức đã hoàn thành
  totalCount: number; // Tổng số đề đã hoàn thành
}

export interface ExamVolumeSummary {
  totalPractice: number; // Tổng đề luyện tập trong kỳ
  totalOfficial: number; // Tổng đề chính thức trong kỳ
  totalExams: number; // Tổng tất cả đề trong kỳ
  averagePerDay: number; // Trung bình số đề/ngày
}

export interface ExamVolumeResponseDto {
  success: boolean;
  summary: ExamVolumeSummary;
  data: ExamVolumeDataPoint[];
  filters: {
    examType: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
    classIds?: number[];
    subjectIds?: number[];
    studentIds?: number[];
    groupBy: string;
  };
}

export interface ScoreStatisticsDataPoint {
  date: string; // YYYY-MM-DD hoặc YYYY-MM hoặc YYYY-WW
  practiceStats: {
    averageScore: number; // Điểm trung bình đề luyện tập
    minScore: number; // Điểm thấp nhất
    maxScore: number; // Điểm cao nhất
    count: number; // Số bài thi
    standardDeviation: number; // Độ lệch chuẩn
  };
  officialStats: {
    averageScore: number; // Điểm trung bình đề chính thức
    minScore: number; // Điểm thấp nhất
    maxScore: number; // Điểm cao nhất
    count: number; // Số bài thi
    standardDeviation: number; // Độ lệch chuẩn
  };
  overallStats: {
    averageScore: number; // Điểm trung bình tổng thể
    minScore: number; // Điểm thấp nhất tổng thể
    maxScore: number; // Điểm cao nhất tổng thể
    count: number; // Tổng số bài thi
    standardDeviation: number; // Độ lệch chuẩn tổng thể
  };
}

export interface ScoreStatisticsSummary {
  practiceExams: {
    totalCount: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    standardDeviation: number;
    scoreDistribution: {
      excellent: number; // 90-100 điểm
      good: number; // 80-89 điểm
      average: number; // 70-79 điểm
      belowAverage: number; // 60-69 điểm
      poor: number; // < 60 điểm
    };
  };
  officialExams: {
    totalCount: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    standardDeviation: number;
    scoreDistribution: {
      excellent: number; // 90-100 điểm
      good: number; // 80-89 điểm
      average: number; // 70-79 điểm
      belowAverage: number; // 60-69 điểm
      poor: number; // < 60 điểm
    };
  };
  comparison: {
    averageScoreDifference: number; // Chênh lệch điểm TB (practice - official)
    performanceTrend: 'practice_better' | 'official_better' | 'similar'; // Xu hướng hiệu suất
    consistencyComparison:
      | 'practice_more_consistent'
      | 'official_more_consistent'
      | 'similar'; // So sánh độ ổn định
  };
}

export interface ScoreStatisticsResponseDto {
  success: boolean;
  summary: ScoreStatisticsSummary;
  data: ScoreStatisticsDataPoint[];
  filters: {
    examType: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
    classIds?: number[];
    subjectIds?: number[];
    studentIds?: number[];
    groupBy: string;
  };
  insights: {
    scoreImprovement: string; // Nhận xét về xu hướng điểm số
    consistencyAnalysis: string; // Phân tích độ ổn định
    recommendations: string[]; // Đề xuất cải thiện
  };
}

export interface TopStudentItem {
  rank: number;
  studentId: string;
  studentName: string;
  className: string;
  averageScore: number;
  examCount: number;
}

export interface TopStudentsResponseDto {
  success: boolean;
  data: TopStudentItem[];
}

export interface FailingStudentItem {
  studentId: string;
  studentName: string;
  className: string;
  examName: string;
  subject: string;
  score: number;
  maxScore: number;
  examDate: string; // ISO format
  examType: 'practice' | 'official';
  failureLevel: 'severe' | 'moderate';
}

export interface FailingStudentsResponseDto {
  success: boolean;
  data: FailingStudentItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  summary: {
    totalFailingStudents: number;
    severeFailures: number; // < 30 điểm
    moderateFailures: number; // 30-49 điểm
  };
  filters: {
    classIds?: number[];
    subjectIds?: number[];
    specificDate?: string;
    startDate?: string;
    endDate?: string;
    failureLevel?: string;
  };
}
