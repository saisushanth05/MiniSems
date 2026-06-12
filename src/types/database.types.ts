// Mini Sems — Complete Database Type Definitions
// Maps 1:1 to Supabase PostgreSQL schema

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'faculty' | 'student' | 'parent';
export type ExamStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled';
export type ExamType = 'weekly_test' | 'unit_test' | 'grand_test' | 'practice_test';
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'descriptive';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type SessionStatus = 'not_started' | 'in_progress' | 'submitted' | 'disqualified' | 'timed_out';
export type ViolationType = 'tab_switch' | 'screenshot_attempt' | 'split_screen' | 'app_background' | 'device_change' | 'multiple_login';
export type NotificationType = 'exam_scheduled' | 'exam_starting' | 'exam_completed' | 'result_published' | 'new_login' | 'violation_detected';
export type SubscriptionPlan = 'trial' | 'basic' | 'standard' | 'enterprise';
export type StudentStatus = 'active' | 'inactive' | 'suspended';

// ============================================================
// CORE TABLES
// ============================================================

export interface College {
  id: string;
  name: string;
  code: string; // Unique college code e.g. "MITS2024"
  logo_url?: string;
  address?: string;
  district: string;
  state: 'Andhra Pradesh' | 'Telangana';
  mobile: string;
  email?: string;
  subscription_plan: SubscriptionPlan;
  subscription_expires_at?: string;
  is_active: boolean;
  max_students: number;
  max_faculty: number;
  settings: CollegeSettings;
  created_at: string;
  updated_at: string;
}

export interface CollegeSettings {
  allow_reattempt: boolean;
  show_score_immediately: boolean;
  negative_marking_default: boolean;
  default_exam_duration: number; // minutes
  otp_provider: 'twilio' | 'msg91' | 'fast2sms';
  otp_sender_id?: string;
  whatsapp_enabled: boolean;
  bilingual_enabled: boolean;
  default_language: 'en' | 'te';
}

export interface User {
  id: string;
  college_id: string;
  role: UserRole;
  mobile: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// STUDENT
// ============================================================

export interface Student {
  id: string;
  college_id: string;
  user_id: string;
  roll_number: string;
  name: string;
  section_id: string;
  mobile: string;
  parent_mobile: string;
  email?: string;
  date_of_birth?: string;
  profile_photo_url?: string;
  stream: 'MPC' | 'BiPC' | 'MEC' | 'CEC' | 'HEC';
  year: 1 | 2; // Inter 1st / 2nd year
  status: StudentStatus;
  created_at: string;
  updated_at: string;
  // Joined
  section?: Section;
  user?: User;
}

export interface Parent {
  id: string;
  college_id: string;
  student_id: string;
  name?: string;
  mobile: string;
  relation: 'father' | 'mother' | 'guardian';
  is_active: boolean;
  created_at: string;
}

// ============================================================
// FACULTY
// ============================================================

export interface Faculty {
  id: string;
  college_id: string;
  user_id: string;
  name: string;
  mobile: string;
  email?: string;
  qualification?: string;
  profile_photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_subjects?: Subject[];
  assigned_sections?: Section[];
}

export interface FacultySubject {
  id: string;
  college_id: string;
  faculty_id: string;
  subject_id: string;
}

export interface FacultySection {
  id: string;
  college_id: string;
  faculty_id: string;
  section_id: string;
}

// ============================================================
// ACADEMIC STRUCTURE
// ============================================================

export interface Section {
  id: string;
  college_id: string;
  name: string; // e.g., "MPC-A", "BiPC-B"
  stream: string;
  year: 1 | 2;
  student_count?: number;
  created_at: string;
}

export interface Subject {
  id: string;
  college_id: string;
  name: string;
  code: string; // e.g., "PHY", "CHEM", "MATH"
  stream: string[];
  is_active: boolean;
  created_at: string;
}

// ============================================================
// QUESTION BANK
// ============================================================

export interface QuestionBank {
  id: string;
  college_id: string;
  name: string;
  subject_id: string;
  created_by: string; // faculty_id
  is_college_bank: boolean; // shared across college
  is_bieap_bank: boolean;   // official BIEAP pattern
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  college_id: string;
  bank_id?: string;
  created_by: string; // faculty_id
  subject_id: string;
  type: QuestionType;
  // Content
  question_text: string;
  question_text_te?: string;    // Telugu translation
  question_image_url?: string;
  has_latex: boolean;
  // MCQ Options
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_a_te?: string;
  option_b_te?: string;
  option_c_te?: string;
  option_d_te?: string;
  // Answers
  correct_answer?: string;      // 'A', 'B', 'C', 'D', 'True', 'False', or text
  correct_answer_explanation?: string;
  correct_answer_explanation_te?: string;
  // Metadata
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks: number;
  concept_tags: string[];
  chapter?: string;
  topic?: string;
  exam_type_tags: string[]; // ['EAMCET', 'JEE', 'NEET', 'BITSAT']
  is_verified: boolean;
  usage_count: number;
  correct_rate?: number; // 0-100 percentage
  created_at: string;
  updated_at: string;
  // Joined
  subject?: Subject;
}

// ============================================================
// EXAM
// ============================================================

export interface Exam {
  id: string;
  college_id: string;
  created_by: string; // faculty_id
  name: string;
  name_te?: string;
  subject_id?: string; // null for multi-subject exams
  exam_type: ExamType;
  status: ExamStatus;
  // Schedule
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  // Configuration
  total_marks: number;
  total_questions: number;
  pass_marks?: number;
  // Settings
  randomize_questions: boolean;
  randomize_options: boolean;
  show_score_immediately: boolean;
  allow_reattempt: boolean;
  negative_marking: boolean;
  negative_mark_value: number;
  allow_review_marking: boolean;
  // Target
  target_sections: string[]; // section_ids
  target_students?: string[]; // specific student_ids (optional)
  instructions?: string;
  instructions_te?: string;
  // Stats (computed)
  total_students?: number;
  submitted_count?: number;
  average_score?: number;
  highest_score?: number;
  lowest_score?: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  // Joined
  sections?: Section[];
  subject?: Subject;
}

export interface ExamSection {
  id: string;
  college_id: string;
  exam_id: string;
  subject_id: string;
  section_name: string; // e.g., "Physics Section"
  total_questions: number;
  marks_per_question: number;
  negative_marks: number;
  order_index: number;
}

export interface ExamQuestion {
  id: string;
  college_id: string;
  exam_id: string;
  question_id: string;
  exam_section_id?: string;
  order_index: number;
  marks: number;
  negative_marks: number;
  // Joined
  question?: Question;
}

// ============================================================
// EXAM SESSION
// ============================================================

export interface ExamSession {
  id: string;
  college_id: string;
  exam_id: string;
  student_id: string;
  device_id: string;
  status: SessionStatus;
  started_at?: string;
  submitted_at?: string;
  last_activity_at?: string;
  time_taken_seconds?: number;
  score?: number;
  max_score?: number;
  percentage?: number;
  rank?: number;
  section_rank?: number;
  correct_count?: number;
  wrong_count?: number;
  skipped_count?: number;
  violation_count: number;
  ip_address?: string;
  created_at: string;
  // Joined
  student?: Student;
  exam?: Exam;
}

export interface StudentAnswer {
  id: string;
  college_id: string;
  session_id: string;
  exam_id: string;
  student_id: string;
  question_id: string;
  selected_option?: string;
  text_answer?: string;
  is_marked_review: boolean;
  is_correct?: boolean;
  marks_awarded: number;
  time_spent_seconds: number;
  answered_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  question?: Question;
}

// ============================================================
// SECURITY
// ============================================================

export interface Violation {
  id: string;
  college_id: string;
  session_id: string;
  student_id: string;
  exam_id: string;
  type: ViolationType;
  description?: string;
  is_disqualifying: boolean;
  occurred_at: string;
  created_at: string;
}

export interface DeviceRegistration {
  id: string;
  college_id: string;
  student_id: string;
  device_id: string; // Android: ANDROID_ID, iOS: identifierForVendor
  device_model?: string;
  os_version?: string;
  app_version?: string;
  is_active: boolean;
  registered_at: string;
  last_used_at: string;
}

export interface OTPLog {
  id: string;
  mobile: string;
  otp_hash: string; // Never store plain OTP
  purpose: 'login' | 'verification';
  is_verified: boolean;
  attempts: number;
  expires_at: string;
  verified_at?: string;
  created_at: string;
}

// ============================================================
// RESULTS & PERFORMANCE
// ============================================================

export interface Result {
  id: string;
  college_id: string;
  exam_id: string;
  student_id: string;
  session_id: string;
  score: number;
  max_score: number;
  percentage: number;
  rank: number;
  section_rank: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  time_taken_seconds: number;
  subject_scores: SubjectScore[];
  is_pass?: boolean;
  computed_at: string;
  created_at: string;
  // Joined
  student?: Student;
  exam?: Exam;
}

export interface SubjectScore {
  subject_id: string;
  subject_name: string;
  score: number;
  max_score: number;
  correct: number;
  wrong: number;
  skipped: number;
}

export interface PerformanceMetric {
  id: string;
  college_id: string;
  student_id: string;
  subject_id?: string;
  metric_type: 'score_trend' | 'rank_trend' | 'weak_topics' | 'strong_topics' | 'readiness_score';
  data: Record<string, unknown>;
  computed_at: string;
  created_at: string;
}

// ============================================================
// REPORTS & NOTIFICATIONS
// ============================================================

export interface Report {
  id: string;
  college_id: string;
  exam_id?: string;
  generated_by: string;
  report_type: 'exam_result' | 'class_heatmap' | 'student_progress' | 'faculty_effectiveness' | 'rank_list';
  file_url: string;
  file_type: 'pdf' | 'excel';
  created_at: string;
}

export interface Notification {
  id: string;
  college_id: string;
  type: NotificationType;
  title: string;
  title_te?: string;
  body: string;
  body_te?: string;
  target_role?: UserRole;
  target_user_ids?: string[];
  exam_id?: string;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  college_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  device_id?: string;
  created_at: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  examsThisWeek: number;
  examsThisMonth: number;
  averageScoreThisMonth: number;
  activeFaculty: number;
  totalExams: number;
  completedExams: number;
}

export interface AnalyticsData {
  scoreHistory: {exam_name: string; score: number; date: string}[];
  rankHistory: {exam_name: string; rank: number; date: string}[];
  subjectAverages: {subject: string; average: number}[];
  weakTopics: {topic: string; correct_rate: number; subject: string}[];
  strongTopics: {topic: string; correct_rate: number; subject: string}[];
  eamcetReadiness: number;
  jeeReadiness: number;
  neetReadiness: number;
}
