// Mini Sems — Supabase Client Configuration

import {createClient} from '@supabase/supabase-js';
import {MMKV} from 'react-native-mmkv';

declare const process: {
  env: {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
};

// ── MMKV Storage for Supabase Auth ──
const mmkvStorage = new MMKV({id: 'supabase-auth'});

const supabaseStorageAdapter = {
  getItem: (key: string): string | null => {
    return mmkvStorage.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    mmkvStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    mmkvStorage.delete(key);
  },
};

// ── Configuration ──
// Replace with your Supabase project credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

// ── Client ──
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-app-version': '1.0.0',
      'x-app-name': 'MiniSems',
    },
  },
});

// ── Typed table helpers ──
export const db = {
  colleges: () => supabase.from('colleges'),
  users: () => supabase.from('users'),
  students: () => supabase.from('students'),
  parents: () => supabase.from('parents'),
  faculty: () => supabase.from('faculty'),
  sections: () => supabase.from('sections'),
  subjects: () => supabase.from('subjects'),
  questionBanks: () => supabase.from('question_banks'),
  questions: () => supabase.from('questions'),
  exams: () => supabase.from('exams'),
  examSections: () => supabase.from('exam_sections'),
  examQuestions: () => supabase.from('exam_questions'),
  examSessions: () => supabase.from('exam_sessions'),
  studentAnswers: () => supabase.from('student_answers'),
  violations: () => supabase.from('violations'),
  reports: () => supabase.from('reports'),
  notifications: () => supabase.from('notifications'),
  auditLogs: () => supabase.from('audit_logs'),
  deviceRegistrations: () => supabase.from('device_registrations'),
  otpLogs: () => supabase.from('otp_logs'),
  results: () => supabase.from('results'),
  performanceMetrics: () => supabase.from('performance_metrics'),
  facultySubjects: () => supabase.from('faculty_subjects'),
  facultySections: () => supabase.from('faculty_sections'),
};

// ── Realtime channel helpers ──
export const realtimeChannels = {
  examSession: (examId: string) => `exam-session:${examId}`,
  studentAnswers: (sessionId: string) => `student-answers:${sessionId}`,
  liveMonitor: (examId: string) => `live-monitor:${examId}`,
  notifications: (userId: string) => `notifications:${userId}`,
};

export default supabase;
