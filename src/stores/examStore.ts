// Mini Sems — Exam Store (Zustand)
// Local exam state management with MMKV persistence for offline

import {create} from 'zustand';
import {MMKV} from 'react-native-mmkv';
import type {ExamState, LocalAnswer, QuestionStatus} from '@apptypes/exam.types';
import type {ExamQuestion} from '@apptypes/exam.types';

const storage = new MMKV({id: 'exam-store'});

interface ExamStoreState extends ExamState {
  // Actions
  initExam: (params: {
    sessionId: string;
    examId: string;
    questions: ExamQuestion[];
    durationSeconds: number;
  }) => void;
  setAnswer: (questionId: string, answer: Partial<LocalAnswer>) => void;
  toggleMarkReview: (questionId: string) => void;
  clearAnswer: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  setTimeRemaining: (seconds: number) => void;
  setSubmitted: (submitted: boolean) => void;
  incrementViolation: () => void;
  setOnline: (online: boolean) => void;
  markSynced: (questionIds: string[]) => void;
  getQuestionStatus: (questionId: string, index: number) => QuestionStatus;
  getAllAnswers: () => LocalAnswer[];
  getAttemptedCount: () => number;
  resetExam: () => void;
  persistToMMKV: () => void;
  loadFromMMKV: (sessionId: string) => boolean;
}

const INITIAL_STATE: ExamState = {
  sessionId: '',
  examId: '',
  questions: [],
  answers: {},
  currentIndex: 0,
  timeRemainingSeconds: 0,
  isSubmitted: false,
  isLoading: false,
  lastSyncedAt: undefined,
  violationCount: 0,
  isFullscreen: false,
  isOnline: true,
};

export const useExamStore = create<ExamStoreState>((set, get) => ({
  ...INITIAL_STATE,

  initExam: ({sessionId, examId, questions, durationSeconds}) => {
    const state = {
      ...INITIAL_STATE,
      sessionId,
      examId,
      questions,
      timeRemainingSeconds: durationSeconds,
    };
    set(state);
    // Also try to restore saved progress from MMKV
    get().loadFromMMKV(sessionId);
  },

  setAnswer: (questionId, answer) => {
    set(state => {
      const existing = state.answers[questionId] || {
        questionId,
        isMarkedReview: false,
        timeSpentSeconds: 0,
        isSynced: false,
      };
      const updated = {
        ...existing,
        ...answer,
        answeredAt: Date.now(),
        isSynced: false,
      };
      const newAnswers = {...state.answers, [questionId]: updated};
      return {answers: newAnswers};
    });
    get().persistToMMKV();
  },

  toggleMarkReview: (questionId) => {
    set(state => {
      const existing = state.answers[questionId] || {
        questionId,
        isMarkedReview: false,
        timeSpentSeconds: 0,
        isSynced: false,
      };
      return {
        answers: {
          ...state.answers,
          [questionId]: {...existing, isMarkedReview: !existing.isMarkedReview, isSynced: false},
        },
      };
    });
    get().persistToMMKV();
  },

  clearAnswer: (questionId) => {
    set(state => {
      const existing = state.answers[questionId];
      if (!existing) return state;
      return {
        answers: {
          ...state.answers,
          [questionId]: {
            ...existing,
            selectedOption: undefined,
            textAnswer: undefined,
            isSynced: false,
          },
        },
      };
    });
    get().persistToMMKV();
  },

  setCurrentIndex: (index) => set({currentIndex: index}),

  setTimeRemaining: (seconds) => set({timeRemainingSeconds: seconds}),

  setSubmitted: (isSubmitted) => {
    set({isSubmitted});
    if (isSubmitted) {
      // Clear MMKV on submit
      const {sessionId} = get();
      storage.delete(`exam_${sessionId}`);
    }
  },

  incrementViolation: () =>
    set(state => ({violationCount: state.violationCount + 1})),

  setOnline: (isOnline) => set({isOnline}),

  markSynced: (questionIds) => {
    set(state => {
      const newAnswers = {...state.answers};
      questionIds.forEach(id => {
        if (newAnswers[id]) {
          newAnswers[id] = {...newAnswers[id], isSynced: true};
        }
      });
      return {answers: newAnswers, lastSyncedAt: Date.now()};
    });
  },

  getQuestionStatus: (questionId, index): QuestionStatus => {
    const {answers} = get();
    const answer = answers[questionId];
    if (!answer) return 'not_visited';
    const hasAnswer = !!answer.selectedOption || !!answer.textAnswer;
    if (hasAnswer && answer.isMarkedReview) return 'answered_marked';
    if (hasAnswer) return 'answered';
    if (answer.isMarkedReview) return 'marked_review';
    if (answer.answeredAt) return 'not_answered';
    return 'not_visited';
  },

  getAllAnswers: () => {
    return Object.values(get().answers);
  },

  getAttemptedCount: () => {
    const {answers} = get();
    return Object.values(answers).filter(
      a => !!a.selectedOption || !!a.textAnswer,
    ).length;
  },

  resetExam: () => set(INITIAL_STATE),

  persistToMMKV: () => {
    const state = get();
    const toSave = {
      answers: state.answers,
      currentIndex: state.currentIndex,
      violationCount: state.violationCount,
      savedAt: Date.now(),
    };
    storage.set(`exam_${state.sessionId}`, JSON.stringify(toSave));
  },

  loadFromMMKV: (sessionId) => {
    try {
      const raw = storage.getString(`exam_${sessionId}`);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      set(state => ({
        answers: {...state.answers, ...saved.answers},
        currentIndex: saved.currentIndex ?? 0,
        violationCount: saved.violationCount ?? 0,
      }));
      return true;
    } catch {
      return false;
    }
  },
}));
