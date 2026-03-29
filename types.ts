export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  SUBJECTIVE = 'SUBJECTIVE', // 주관식 (서술형)
}

export interface Question {
  id: number;
  type: QuestionType;
  questionText: string;
  options?: string[]; // Only for Multiple Choice
  optionsExplanations?: string[]; // 선지별 개별 해설 (인덱스 매핑)
  correctAnswer: string;
  correctAnswerIndex?: number; // 정답 선지의 인덱스 (0-3), 데이터 무결성을 위해 추가
  explanation: string; // 전체 통합 해설
}

export interface ExamConfig {
  totalQuestions: number;
  mcCount: number;
  saCount: number;
  subjCount: number;
  additionalInstructions?: string;
  confusionMode?: boolean; // 헷갈림 모드 추가
}

export interface UserAnswer {
  questionId: number;
  answer: string;
}

export interface FileData {
  name: string;
  content: string; // Text content or base64
  mimeType: string;
}

export type AppState = 'DASHBOARD' | 'SETUP' | 'ANALYZING' | 'MATERIAL_ANALYZING' | 'GENERATING' | 'EXAM' | 'REVIEW' | 'SUMMARY_GENERATING' | 'SUMMARY_VIEW' | 'FEEDBACK_GENERATING' | 'FEEDBACK_VIEW' | 'SETTINGS';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface User {
  name: string;
  email: string;
  imageUrl?: string;
  geminiApiKey?: string;
}

export interface SavedExam {
  id: string;
  title: string;
  createdAt: number;
  questions: Question[];
  config: ExamConfig;
  userAnswers?: UserAnswer[]; // Save progress if needed
  score?: number;
  // Fields for Project Reuse
  styleAnalysis?: string;
  materialAnalysis?: string;
}

export interface SavedSummary {
  id: string;
  title: string;
  createdAt: number;
  content: string;
}