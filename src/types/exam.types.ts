// Mini Sems — Exam Engine Types

import {Question, StudentAnswer} from './database.types';

export interface ExamState {
  sessionId: string;
  examId: string;
  questions: ExamQuestion[];
  answers: Record<string, LocalAnswer>; // questionId -> answer
  currentIndex: number;
  timeRemainingSeconds: number;
  isSubmitted: boolean;
  isLoading: boolean;
  lastSyncedAt?: number; // timestamp
  violationCount: number;
  isFullscreen: boolean;
  isOnline: boolean;
}

export interface ExamQuestion extends Question {
  orderIndex: number;
  examQuestionId: string;
  marks: number;
  negativeMarks: number;
}

export interface LocalAnswer {
  questionId: string;
  selectedOption?: string;
  textAnswer?: string;
  isMarkedReview: boolean;
  timeSpentSeconds: number;
  answeredAt?: number; // timestamp
  isSynced: boolean;
}

export type QuestionStatus =
  | 'not_visited'
  | 'answered'
  | 'marked_review'
  | 'answered_marked'
  | 'not_answered';

export interface ExamSubmitPayload {
  sessionId: string;
  examId: string;
  studentId: string;
  answers: LocalAnswer[];
  submittedAt: number;
  timeTakenSeconds: number;
  violationCount: number;
  deviceId: string;
}

export interface LiveStudentCard {
  studentId: string;
  studentName: string;
  rollNumber: string;
  section: string;
  status: 'active' | 'suspicious' | 'submitted' | 'not_started' | 'disqualified';
  questionsAttempted: number;
  totalQuestions: number;
  timeRemainingSeconds: number;
  violationCount: number;
  lastActivityAt?: string;
}

export interface AutoSavePayload {
  sessionId: string;
  answers: LocalAnswer[];
  savedAt: number;
}

export interface SyncConflict {
  questionId: string;
  localAnswer: LocalAnswer;
  serverAnswer?: StudentAnswer;
  resolution: 'use_local' | 'use_server';
}
