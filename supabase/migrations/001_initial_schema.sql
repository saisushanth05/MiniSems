-- Mini Sems — Complete Database Schema
-- Migration 001: Initial Schema
-- PostgreSQL via Supabase

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'faculty', 'student', 'parent');
CREATE TYPE exam_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled');
CREATE TYPE exam_type AS ENUM ('weekly_test', 'unit_test', 'grand_test', 'practice_test');
CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'fill_blank', 'descriptive');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE session_status AS ENUM ('not_started', 'in_progress', 'submitted', 'disqualified', 'timed_out');
CREATE TYPE violation_type AS ENUM ('tab_switch', 'screenshot_attempt', 'split_screen', 'app_background', 'device_change', 'multiple_login');
CREATE TYPE notification_type AS ENUM ('exam_scheduled', 'exam_starting', 'exam_completed', 'result_published', 'new_login', 'violation_detected');
CREATE TYPE subscription_plan AS ENUM ('trial', 'basic', 'standard', 'enterprise');
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE student_stream AS ENUM ('MPC', 'BiPC', 'MEC', 'CEC', 'HEC');
CREATE TYPE state_name AS ENUM ('Andhra Pradesh', 'Telangana');

-- ============================================================
-- TABLE: colleges
-- Multi-tenant root — every other table references this
-- ============================================================

CREATE TABLE colleges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  code                TEXT NOT NULL UNIQUE,
  logo_url            TEXT,
  address             TEXT,
  district            TEXT,
  state               state_name NOT NULL,
  mobile              TEXT NOT NULL,
  email               TEXT,
  subscription_plan   subscription_plan NOT NULL DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  max_students        INTEGER NOT NULL DEFAULT 500,
  max_faculty         INTEGER NOT NULL DEFAULT 50,
  settings            JSONB NOT NULL DEFAULT '{
    "allow_reattempt": false,
    "show_score_immediately": true,
    "negative_marking_default": true,
    "default_exam_duration": 180,
    "otp_provider": "msg91",
    "whatsapp_enabled": false,
    "bilingual_enabled": true,
    "default_language": "en"
  }'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: users
-- One per login identity
-- ============================================================

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  mobile      TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(college_id, mobile, role)
);

-- ============================================================
-- TABLE: sections
-- Academic class sections
-- ============================================================

CREATE TABLE sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  stream      student_stream NOT NULL,
  year        SMALLINT NOT NULL CHECK (year IN (1, 2)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: subjects
-- ============================================================

CREATE TABLE subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  streams     TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: students
-- ============================================================

CREATE TABLE students (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id        UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  roll_number       TEXT NOT NULL,
  name              TEXT NOT NULL,
  section_id        UUID REFERENCES sections(id),
  mobile            TEXT NOT NULL,
  parent_mobile     TEXT NOT NULL,
  email             TEXT,
  date_of_birth     DATE,
  profile_photo_url TEXT,
  stream            student_stream NOT NULL,
  year              SMALLINT NOT NULL CHECK (year IN (1, 2)),
  status            student_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(college_id, roll_number)
);

-- ============================================================
-- TABLE: parents
-- ============================================================

CREATE TABLE parents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name        TEXT,
  mobile      TEXT NOT NULL,
  relation    TEXT NOT NULL DEFAULT 'parent',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: faculty
-- ============================================================

CREATE TABLE faculty (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id        UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  mobile            TEXT NOT NULL,
  email             TEXT,
  qualification     TEXT,
  profile_photo_url TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE faculty_subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  faculty_id  UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(faculty_id, subject_id)
);

CREATE TABLE faculty_sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  faculty_id  UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE(faculty_id, section_id)
);

-- ============================================================
-- TABLE: question_banks
-- ============================================================

CREATE TABLE question_banks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  subject_id      UUID REFERENCES subjects(id),
  created_by      UUID REFERENCES faculty(id),
  is_college_bank BOOLEAN NOT NULL DEFAULT false,
  is_bieap_bank   BOOLEAN NOT NULL DEFAULT false,
  question_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: questions
-- ============================================================

CREATE TABLE questions (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id                      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  bank_id                         UUID REFERENCES question_banks(id) ON DELETE SET NULL,
  created_by                      UUID REFERENCES faculty(id),
  subject_id                      UUID REFERENCES subjects(id),
  type                            question_type NOT NULL DEFAULT 'mcq',
  -- Content
  question_text                   TEXT NOT NULL,
  question_text_te                TEXT,
  question_image_url              TEXT,
  has_latex                       BOOLEAN NOT NULL DEFAULT false,
  -- MCQ Options
  option_a                        TEXT,
  option_b                        TEXT,
  option_c                        TEXT,
  option_d                        TEXT,
  option_a_te                     TEXT,
  option_b_te                     TEXT,
  option_c_te                     TEXT,
  option_d_te                     TEXT,
  -- Answers
  correct_answer                  TEXT,
  correct_answer_explanation      TEXT,
  correct_answer_explanation_te   TEXT,
  -- Metadata
  difficulty                      difficulty_level NOT NULL DEFAULT 'medium',
  marks                           NUMERIC(5,2) NOT NULL DEFAULT 1,
  negative_marks                  NUMERIC(5,2) NOT NULL DEFAULT 0,
  concept_tags                    TEXT[] NOT NULL DEFAULT '{}',
  chapter                         TEXT,
  topic                           TEXT,
  exam_type_tags                  TEXT[] NOT NULL DEFAULT '{}',
  is_verified                     BOOLEAN NOT NULL DEFAULT false,
  usage_count                     INTEGER NOT NULL DEFAULT 0,
  correct_rate                    NUMERIC(5,2),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: exams
-- ============================================================

CREATE TABLE exams (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id            UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_by            UUID REFERENCES faculty(id),
  name                  TEXT NOT NULL,
  name_te               TEXT,
  subject_id            UUID REFERENCES subjects(id),
  exam_type             exam_type NOT NULL,
  status                exam_status NOT NULL DEFAULT 'draft',
  -- Schedule
  scheduled_date        DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  duration_minutes      INTEGER NOT NULL DEFAULT 60,
  -- Configuration
  total_marks           NUMERIC(7,2) NOT NULL DEFAULT 0,
  total_questions       INTEGER NOT NULL DEFAULT 0,
  pass_marks            NUMERIC(7,2),
  -- Settings
  randomize_questions   BOOLEAN NOT NULL DEFAULT false,
  randomize_options     BOOLEAN NOT NULL DEFAULT false,
  show_score_immediately BOOLEAN NOT NULL DEFAULT true,
  allow_reattempt       BOOLEAN NOT NULL DEFAULT false,
  negative_marking      BOOLEAN NOT NULL DEFAULT true,
  negative_mark_value   NUMERIC(5,2) NOT NULL DEFAULT 0.25,
  allow_review_marking  BOOLEAN NOT NULL DEFAULT true,
  -- Target
  target_sections       UUID[] NOT NULL DEFAULT '{}',
  target_students       UUID[],
  instructions          TEXT,
  instructions_te       TEXT,
  -- Stats (denormalized for performance)
  total_students        INTEGER,
  submitted_count       INTEGER DEFAULT 0,
  average_score         NUMERIC(7,2),
  highest_score         NUMERIC(7,2),
  lowest_score          NUMERIC(7,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);

-- ============================================================
-- TABLE: exam_sections
-- Groups questions by subject within an exam
-- ============================================================

CREATE TABLE exam_sections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id      UUID REFERENCES subjects(id),
  section_name    TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  marks_per_question NUMERIC(5,2) NOT NULL DEFAULT 1,
  negative_marks  NUMERIC(5,2) NOT NULL DEFAULT 0.25,
  order_index     INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE: exam_questions
-- Maps questions to exams
-- ============================================================

CREATE TABLE exam_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  exam_section_id UUID REFERENCES exam_sections(id) ON DELETE SET NULL,
  order_index     INTEGER NOT NULL DEFAULT 0,
  marks           NUMERIC(5,2) NOT NULL DEFAULT 1,
  negative_marks  NUMERIC(5,2) NOT NULL DEFAULT 0.25,
  UNIQUE(exam_id, question_id)
);

-- ============================================================
-- TABLE: exam_sessions
-- Per-student exam attempt
-- ============================================================

CREATE TABLE exam_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id          UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  exam_id             UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  device_id           TEXT NOT NULL,
  status              session_status NOT NULL DEFAULT 'not_started',
  started_at          TIMESTAMPTZ,
  submitted_at        TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ,
  time_taken_seconds  INTEGER,
  score               NUMERIC(9,2),
  max_score           NUMERIC(9,2),
  percentage          NUMERIC(6,2),
  rank                INTEGER,
  section_rank        INTEGER,
  correct_count       INTEGER DEFAULT 0,
  wrong_count         INTEGER DEFAULT 0,
  skipped_count       INTEGER DEFAULT 0,
  violation_count     INTEGER NOT NULL DEFAULT 0,
  ip_address          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- ============================================================
-- TABLE: student_answers
-- Individual question responses
-- ============================================================

CREATE TABLE student_answers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id          UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  session_id          UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  exam_id             UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_option     TEXT,
  text_answer         TEXT,
  is_marked_review    BOOLEAN NOT NULL DEFAULT false,
  is_correct          BOOLEAN,
  marks_awarded       NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_spent_seconds  INTEGER NOT NULL DEFAULT 0,
  answered_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- ============================================================
-- TABLE: violations
-- Security violation log
-- ============================================================

CREATE TABLE violations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id        UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id           UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  type              violation_type NOT NULL,
  description       TEXT,
  is_disqualifying  BOOLEAN NOT NULL DEFAULT false,
  occurred_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: device_registrations
-- Device binding per student
-- ============================================================

CREATE TABLE device_registrations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id    UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  device_model  TEXT,
  os_version    TEXT,
  app_version   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, device_id)
);

-- ============================================================
-- TABLE: otp_logs
-- ============================================================

CREATE TABLE otp_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mobile      TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,
  purpose     TEXT NOT NULL DEFAULT 'login',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: results
-- Computed exam results
-- ============================================================

CREATE TABLE results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  score           NUMERIC(9,2) NOT NULL DEFAULT 0,
  max_score       NUMERIC(9,2) NOT NULL DEFAULT 0,
  percentage      NUMERIC(6,2) NOT NULL DEFAULT 0,
  rank            INTEGER NOT NULL DEFAULT 0,
  section_rank    INTEGER NOT NULL DEFAULT 0,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  wrong_count     INTEGER NOT NULL DEFAULT 0,
  skipped_count   INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  subject_scores  JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_pass         BOOLEAN,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- ============================================================
-- TABLE: performance_metrics
-- Aggregated analytics
-- ============================================================

CREATE TABLE performance_metrics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id  UUID REFERENCES subjects(id),
  metric_type TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: reports
-- ============================================================

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  exam_id         UUID REFERENCES exams(id),
  generated_by    UUID NOT NULL,
  report_type     TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       TEXT NOT NULL DEFAULT 'pdf',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  title_te        TEXT,
  body            TEXT NOT NULL,
  body_te         TEXT,
  target_role     user_role,
  target_user_ids UUID[],
  exam_id         UUID REFERENCES exams(id),
  is_sent         BOOLEAN NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: audit_logs
-- Every system action
-- ============================================================

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id    UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    TEXT,
  device_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER colleges_updated_at BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER student_answers_updated_at BEFORE UPDATE ON student_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
