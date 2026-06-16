-- Mini Sems — Complete Database Setup
-- Consolidation of migrations: 001_initial_schema, 002_rls_policies, 003_indexes, 004_functions_triggers
-- Includes full schema drop, public RLS helper functions, table-level grants, and initial demo seed data.

-- ============================================================
-- RESET SCHEMA
-- ============================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Restore standard grants on public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA public;

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
-- TABLES
-- ============================================================

-- TABLE: colleges
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

-- TABLE: users
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

-- TABLE: sections
CREATE TABLE sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  stream      student_stream NOT NULL,
  year        SMALLINT NOT NULL CHECK (year IN (1, 2)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: subjects
CREATE TABLE subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  streams     TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: students
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

-- TABLE: parents
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

-- TABLE: faculty
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

-- TABLE: faculty_subjects
CREATE TABLE faculty_subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  faculty_id  UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(faculty_id, subject_id)
);

-- TABLE: faculty_sections
CREATE TABLE faculty_sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  faculty_id  UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE(faculty_id, section_id)
);

-- TABLE: question_banks
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

-- TABLE: questions
CREATE TABLE questions (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id                      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  bank_id                         UUID REFERENCES question_banks(id) ON DELETE SET NULL,
  created_by                      UUID REFERENCES faculty(id),
  subject_id                      UUID REFERENCES subjects(id),
  type                            question_type NOT NULL DEFAULT 'mcq',
  question_text                   TEXT NOT NULL,
  question_text_te                TEXT,
  question_image_url              TEXT,
  has_latex                       BOOLEAN NOT NULL DEFAULT false,
  option_a                        TEXT,
  option_b                        TEXT,
  option_c                        TEXT,
  option_d                        TEXT,
  option_a_te                     TEXT,
  option_b_te                     TEXT,
  option_c_te                     TEXT,
  option_d_te                     TEXT,
  correct_answer                  TEXT,
  correct_answer_explanation      TEXT,
  correct_answer_explanation_te   TEXT,
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

-- TABLE: exams
CREATE TABLE exams (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id            UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_by            UUID REFERENCES faculty(id),
  name                  TEXT NOT NULL,
  name_te               TEXT,
  subject_id            UUID REFERENCES subjects(id),
  exam_type             exam_type NOT NULL,
  status                exam_status NOT NULL DEFAULT 'draft',
  scheduled_date        DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  duration_minutes      INTEGER NOT NULL DEFAULT 60,
  total_marks           NUMERIC(7,2) NOT NULL DEFAULT 0,
  total_questions       INTEGER NOT NULL DEFAULT 0,
  pass_marks            NUMERIC(7,2),
  randomize_questions   BOOLEAN NOT NULL DEFAULT false,
  randomize_options     BOOLEAN NOT NULL DEFAULT false,
  show_score_immediately BOOLEAN NOT NULL DEFAULT true,
  allow_reattempt       BOOLEAN NOT NULL DEFAULT false,
  negative_marking      BOOLEAN NOT NULL DEFAULT true,
  negative_mark_value   NUMERIC(5,2) NOT NULL DEFAULT 0.25,
  allow_review_marking  BOOLEAN NOT NULL DEFAULT true,
  target_sections       UUID[] NOT NULL DEFAULT '{}',
  target_students       UUID[],
  instructions          TEXT,
  instructions_te       TEXT,
  total_students        INTEGER,
  submitted_count       INTEGER DEFAULT 0,
  average_score         NUMERIC(7,2),
  highest_score         NUMERIC(7,2),
  lowest_score          NUMERIC(7,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);

-- TABLE: exam_sections
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

-- TABLE: exam_questions
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

-- TABLE: exam_sessions
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

-- TABLE: student_answers
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

-- TABLE: violations
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

-- TABLE: device_registrations
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

-- TABLE: otp_logs
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

-- TABLE: results
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

-- TABLE: performance_metrics
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

-- TABLE: reports
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

-- TABLE: notifications
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

-- TABLE: audit_logs
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
-- COMMON TRIGGERS & FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER colleges_updated_at BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER student_answers_updated_at BEFORE UPDATE ON student_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- Created in public schema to bypass restricted access to auth schema.
-- Includes development fallback defaults for the 'anon' role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.college_id() RETURNS UUID AS $$
  SELECT CASE 
    WHEN COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon' THEN 'd3b07384-d113-4c9b-8e12-421739c99182'::UUID
    ELSE (auth.jwt() ->> 'college_id')::UUID
  END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT CASE 
    WHEN COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon' THEN 'admin'
    ELSE auth.jwt() ->> 'role'
  END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon' THEN true
    ELSE auth.jwt() ->> 'role' = 'super_admin'
  END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon' THEN true
    ELSE auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_faculty() RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon' THEN true
    ELSE auth.jwt() ->> 'role' = 'faculty'
  END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_student() RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon' THEN true
    ELSE auth.jwt() ->> 'role' = 'student'
  END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_parent() RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon' THEN true
    ELSE auth.jwt() ->> 'role' = 'parent'
  END;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- COLLEGES
CREATE POLICY "super_admin_all_colleges" ON colleges FOR ALL USING (public.is_super_admin());
CREATE POLICY "college_members_own_college" ON colleges FOR SELECT USING (id = public.college_id());

-- USERS
CREATE POLICY "college_isolation_users" ON users FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());

-- SECTIONS
CREATE POLICY "college_isolation_sections" ON sections FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());

-- SUBJECTS
CREATE POLICY "college_isolation_subjects" ON subjects FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());

-- STUDENTS
CREATE POLICY "admin_manage_students" ON students FOR ALL USING (public.is_super_admin() OR (public.is_admin() AND college_id = public.college_id()));
CREATE POLICY "faculty_read_students" ON students FOR SELECT USING (public.is_faculty() AND college_id = public.college_id());
CREATE POLICY "student_read_self" ON students FOR SELECT USING (
  public.is_student() AND
  college_id = public.college_id() AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    user_id = auth.uid()
  )
);
CREATE POLICY "parent_read_linked_student" ON students FOR SELECT USING (public.is_parent() AND college_id = public.college_id() AND parent_mobile = (auth.jwt() ->> 'mobile'));

-- PARENTS
CREATE POLICY "college_isolation_parents" ON parents FOR ALL USING (public.is_super_admin() OR (public.is_admin() AND college_id = public.college_id()));
CREATE POLICY "parent_read_self" ON parents FOR SELECT USING (public.is_parent() AND college_id = public.college_id() AND mobile = (auth.jwt() ->> 'mobile'));

-- FACULTY
CREATE POLICY "admin_manage_faculty" ON faculty FOR ALL USING (public.is_super_admin() OR (public.is_admin() AND college_id = public.college_id()));
CREATE POLICY "faculty_read_self" ON faculty FOR SELECT USING (
  public.is_faculty() AND
  college_id = public.college_id() AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    user_id = auth.uid()
  )
);
CREATE POLICY "faculty_update_self" ON faculty FOR UPDATE USING (
  public.is_faculty() AND
  college_id = public.college_id() AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    user_id = auth.uid()
  )
);

-- FACULTY SUBJECTS & SECTIONS
CREATE POLICY "college_isolation_faculty_subjects" ON faculty_subjects FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());
CREATE POLICY "college_isolation_faculty_sections" ON faculty_sections FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());

-- QUESTION BANKS
CREATE POLICY "college_isolation_qbanks" ON question_banks FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());

-- QUESTIONS
CREATE POLICY "admin_faculty_manage_questions" ON questions FOR ALL USING (public.is_super_admin() OR (public.is_admin() AND college_id = public.college_id()) OR (public.is_faculty() AND college_id = public.college_id()));
CREATE POLICY "student_read_questions" ON questions FOR SELECT USING (public.is_student() AND college_id = public.college_id());

-- EXAMS
CREATE POLICY "admin_manage_exams" ON exams FOR ALL USING (public.is_super_admin() OR (public.is_admin() AND college_id = public.college_id()));
CREATE POLICY "faculty_manage_own_exams" ON exams FOR ALL USING (public.is_faculty() AND college_id = public.college_id() AND created_by = (SELECT id FROM faculty WHERE user_id = auth.uid() AND college_id = public.college_id() LIMIT 1));
CREATE POLICY "faculty_read_all_exams" ON exams FOR SELECT USING (public.is_faculty() AND college_id = public.college_id());
CREATE POLICY "student_read_own_exams" ON exams FOR SELECT USING (
  public.is_student() AND
  college_id = public.college_id() AND
  status IN ('published', 'active', 'completed') AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    -- Their section is in target_sections
    (SELECT section_id FROM students WHERE user_id = auth.uid() LIMIT 1) = ANY(target_sections)
    OR
    -- Or they're specifically targeted
    (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1) = ANY(target_students)
  )
);
CREATE POLICY "parent_read_exams" ON exams FOR SELECT USING (public.is_parent() AND college_id = public.college_id());

-- EXAM SECTIONS & QUESTIONS
CREATE POLICY "college_isolation_exam_sections" ON exam_sections FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());
CREATE POLICY "college_isolation_exam_questions" ON exam_questions FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());

-- EXAM SESSIONS
CREATE POLICY "admin_faculty_read_sessions" ON exam_sessions FOR SELECT USING ((public.is_admin() OR public.is_faculty()) AND college_id = public.college_id());
CREATE POLICY "student_manage_own_session" ON exam_sessions FOR ALL USING (
  public.is_student() AND
  college_id = public.college_id() AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- STUDENT ANSWERS
CREATE POLICY "admin_faculty_read_answers" ON student_answers FOR SELECT USING ((public.is_admin() OR public.is_faculty()) AND college_id = public.college_id());
CREATE POLICY "student_manage_own_answers" ON student_answers FOR ALL USING (
  public.is_student() AND
  college_id = public.college_id() AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- VIOLATIONS
CREATE POLICY "admin_faculty_manage_violations" ON violations FOR ALL USING ((public.is_admin() OR public.is_faculty()) AND college_id = public.college_id());
CREATE POLICY "student_insert_own_violations" ON violations FOR INSERT WITH CHECK (public.is_student() AND college_id = public.college_id());

-- DEVICE REGISTRATIONS
CREATE POLICY "college_isolation_devices" ON device_registrations FOR ALL USING (
  public.is_super_admin() OR
  (public.is_admin() AND college_id = public.college_id()) OR
  (public.is_student() AND college_id = public.college_id() AND
   (
     COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
     OR
     student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
   ))
);

-- RESULTS
CREATE POLICY "admin_faculty_read_results" ON results FOR SELECT USING ((public.is_admin() OR public.is_faculty()) AND college_id = public.college_id());
CREATE POLICY "student_read_own_results" ON results FOR SELECT USING (
  public.is_student() AND
  college_id = public.college_id() AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  )
);
CREATE POLICY "parent_read_child_results" ON results FOR SELECT USING (public.is_parent() AND college_id = public.college_id());

-- System inserts results (service role bypasses RLS)

-- PERFORMANCE METRICS
CREATE POLICY "admin_faculty_read_metrics" ON performance_metrics FOR SELECT USING ((public.is_admin() OR public.is_faculty()) AND college_id = public.college_id());
CREATE POLICY "student_read_own_metrics" ON performance_metrics FOR SELECT USING (
  public.is_student() AND
  college_id = public.college_id() AND
  (
    COALESCE(auth.jwt() ->> 'role', 'anon') = 'anon'
    OR
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- NOTIFICATIONS
CREATE POLICY "college_isolation_notifications" ON notifications FOR ALL USING (public.is_super_admin() OR college_id = public.college_id());

-- AUDIT LOGS
CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT USING (public.is_admin() AND college_id = public.college_id());
CREATE POLICY "system_insert_audit_logs" ON audit_logs FOR INSERT WITH CHECK (college_id = public.college_id());

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_colleges_code ON colleges(code);
CREATE INDEX idx_colleges_active ON colleges(is_active);
CREATE INDEX idx_users_college_id ON users(college_id);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_college_role ON users(college_id, role);
CREATE INDEX idx_students_college_id ON students(college_id);
CREATE INDEX idx_students_roll_number ON students(college_id, roll_number);
CREATE INDEX idx_students_section_id ON students(section_id);
CREATE INDEX idx_students_status ON students(college_id, status);
CREATE INDEX idx_students_mobile ON students(mobile);
CREATE INDEX idx_students_parent_mobile ON students(parent_mobile);
CREATE INDEX idx_faculty_college_id ON faculty(college_id);
CREATE INDEX idx_faculty_user_id ON faculty(user_id);
CREATE INDEX idx_faculty_active ON faculty(college_id, is_active);
CREATE INDEX idx_faculty_subjects_faculty ON faculty_subjects(faculty_id);
CREATE INDEX idx_faculty_sections_faculty ON faculty_sections(faculty_id);
CREATE INDEX idx_faculty_sections_section ON faculty_sections(section_id);
CREATE INDEX idx_questions_college_id ON questions(college_id);
CREATE INDEX idx_questions_bank_id ON questions(bank_id);
CREATE INDEX idx_questions_subject_id ON questions(subject_id);
CREATE INDEX idx_questions_difficulty ON questions(college_id, difficulty);
CREATE INDEX idx_questions_type ON questions(college_id, type);
CREATE INDEX idx_questions_tags ON questions USING GIN(concept_tags);
CREATE INDEX idx_questions_exam_tags ON questions USING GIN(exam_type_tags);
CREATE INDEX idx_exams_college_id ON exams(college_id);
CREATE INDEX idx_exams_status ON exams(college_id, status);
CREATE INDEX idx_exams_scheduled_date ON exams(college_id, scheduled_date);
CREATE INDEX idx_exams_type ON exams(college_id, exam_type);
CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_exams_target_sections ON exams USING GIN(target_sections);
CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_question_id ON exam_questions(question_id);
CREATE INDEX idx_exam_questions_order ON exam_questions(exam_id, order_index);
CREATE INDEX idx_exam_sessions_exam_id ON exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_student_id ON exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(exam_id, status);
CREATE INDEX idx_exam_sessions_college_id ON exam_sessions(college_id);
CREATE INDEX idx_student_answers_session_id ON student_answers(session_id);
CREATE INDEX idx_student_answers_exam_id ON student_answers(exam_id);
CREATE INDEX idx_student_answers_student_id ON student_answers(student_id);
CREATE INDEX idx_student_answers_question_id ON student_answers(question_id);
CREATE INDEX idx_violations_session_id ON violations(session_id);
CREATE INDEX idx_violations_student_id ON violations(student_id);
CREATE INDEX idx_violations_exam_id ON violations(exam_id);
CREATE INDEX idx_results_exam_id ON results(exam_id);
CREATE INDEX idx_results_student_id ON results(student_id);
CREATE INDEX idx_results_college_id ON results(college_id);
CREATE INDEX idx_results_rank ON results(exam_id, rank);
CREATE INDEX idx_perf_student_id ON performance_metrics(student_id);
CREATE INDEX idx_perf_college_id ON performance_metrics(college_id);
CREATE INDEX idx_perf_metric_type ON performance_metrics(student_id, metric_type);
CREATE INDEX idx_audit_college_id ON audit_logs(college_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(college_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(college_id, action);
CREATE INDEX idx_notifications_college_id ON notifications(college_id);
CREATE INDEX idx_notifications_exam_id ON notifications(exam_id);
CREATE INDEX idx_notifications_sent ON notifications(college_id, is_sent);
CREATE INDEX idx_devices_student_id ON device_registrations(student_id);
CREATE INDEX idx_devices_device_id ON device_registrations(device_id);
CREATE INDEX idx_otp_mobile ON otp_logs(mobile);
CREATE INDEX idx_otp_expires ON otp_logs(expires_at);

-- ============================================================
-- COMPLEX DATABASE FUNCTIONS & TRIGGERS
-- ============================================================

-- compute_exam_results
CREATE OR REPLACE FUNCTION compute_exam_results(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_session exam_sessions%ROWTYPE;
  v_exam exams%ROWTYPE;
  v_score NUMERIC := 0;
  v_max_score NUMERIC := 0;
  v_correct INTEGER := 0;
  v_wrong INTEGER := 0;
  v_skipped INTEGER := 0;
  v_percentage NUMERIC;
  v_rank INTEGER;
  v_section_rank INTEGER;
  v_student students%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM exam_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  SELECT * INTO v_exam FROM exams WHERE id = v_session.exam_id;
  SELECT * INTO v_student FROM students WHERE id = v_session.student_id;

  WITH answer_eval AS (
    SELECT
      sa.id,
      sa.question_id,
      sa.selected_option,
      sa.text_answer,
      q.correct_answer,
      q.type,
      eq.marks,
      eq.negative_marks,
      CASE
        WHEN q.type = 'mcq' OR q.type = 'true_false' THEN
          sa.selected_option = q.correct_answer
        ELSE NULL
      END AS is_correct,
      CASE
        WHEN q.type IN ('mcq', 'true_false') THEN
          CASE
            WHEN sa.selected_option IS NULL THEN 0
            WHEN sa.selected_option = q.correct_answer THEN eq.marks
            ELSE -eq.negative_marks
          END
        ELSE 0
      END AS marks_awarded
    FROM student_answers sa
    JOIN exam_questions eq ON eq.question_id = sa.question_id AND eq.exam_id = sa.exam_id
    JOIN questions q ON q.id = sa.question_id
    WHERE sa.session_id = p_session_id
  )
  SELECT
    COALESCE(SUM(marks_awarded), 0),
    COALESCE(COUNT(*) FILTER (WHERE is_correct = true), 0),
    COALESCE(COUNT(*) FILTER (WHERE is_correct = false AND selected_option IS NOT NULL), 0),
    COALESCE(COUNT(*) FILTER (WHERE selected_option IS NULL AND text_answer IS NULL), 0)
  INTO v_score, v_correct, v_wrong, v_skipped
  FROM answer_eval;

  UPDATE student_answers sa
  SET
    is_correct = ae.is_correct,
    marks_awarded = ae.marks_awarded,
    updated_at = NOW()
  FROM (
    SELECT
      sa2.id,
      sa2.selected_option = q.correct_answer AS is_correct,
      CASE
        WHEN q.type IN ('mcq', 'true_false') THEN
          CASE
            WHEN sa2.selected_option IS NULL THEN 0
            WHEN sa2.selected_option = q.correct_answer THEN eq.marks
            ELSE -eq.negative_marks
          END
        ELSE 0
      END AS marks_awarded
    FROM student_answers sa2
    JOIN exam_questions eq ON eq.question_id = sa2.question_id AND eq.exam_id = sa2.exam_id
    JOIN questions q ON q.id = sa2.question_id
    WHERE sa2.session_id = p_session_id
  ) ae
  WHERE sa.id = ae.id;

  SELECT COALESCE(SUM(marks), 0) INTO v_max_score
  FROM exam_questions WHERE exam_id = v_session.exam_id;

  v_score := GREATEST(0, v_score);
  v_percentage := CASE WHEN v_max_score > 0 THEN (v_score / v_max_score * 100) ELSE 0 END;

  INSERT INTO results (
    college_id, exam_id, student_id, session_id,
    score, max_score, percentage,
    rank, section_rank,
    correct_count, wrong_count, skipped_count,
    time_taken_seconds, computed_at
  ) VALUES (
    v_session.college_id, v_session.exam_id, v_session.student_id, p_session_id,
    v_score, v_max_score, v_percentage,
    0, 0,
    v_correct, v_wrong, v_skipped,
    v_session.time_taken_seconds, NOW()
  )
  ON CONFLICT (exam_id, student_id) DO UPDATE SET
    score = EXCLUDED.score,
    max_score = EXCLUDED.max_score,
    percentage = EXCLUDED.percentage,
    correct_count = EXCLUDED.correct_count,
    wrong_count = EXCLUDED.wrong_count,
    skipped_count = EXCLUDED.skipped_count,
    time_taken_seconds = EXCLUDED.time_taken_seconds,
    computed_at = NOW();

  UPDATE exam_sessions SET
    score = v_score,
    max_score = v_max_score,
    percentage = v_percentage,
    correct_count = v_correct,
    wrong_count = v_wrong,
    skipped_count = v_skipped
  WHERE id = p_session_id;

  PERFORM compute_exam_ranks(v_session.exam_id, v_session.college_id);

  RETURN jsonb_build_object(
    'score', v_score,
    'max_score', v_max_score,
    'percentage', v_percentage,
    'correct', v_correct,
    'wrong', v_wrong,
    'skipped', v_skipped
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- compute_exam_ranks
CREATE OR REPLACE FUNCTION compute_exam_ranks(p_exam_id UUID, p_college_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH ranked AS (
    SELECT
      r.id,
      r.student_id,
      RANK() OVER (ORDER BY r.score DESC, r.time_taken_seconds ASC) AS computed_rank
    FROM results r
    WHERE r.exam_id = p_exam_id AND r.college_id = p_college_id
  )
  UPDATE results r
  SET rank = ranked.computed_rank
  FROM ranked
  WHERE r.id = ranked.id;

  WITH section_ranked AS (
    SELECT
      r.id,
      RANK() OVER (
        PARTITION BY s.section_id
        ORDER BY r.score DESC, r.time_taken_seconds ASC
      ) AS section_rank
    FROM results r
    JOIN students s ON s.id = r.student_id
    WHERE r.exam_id = p_exam_id AND r.college_id = p_college_id
  )
  UPDATE results r
  SET section_rank = section_ranked.section_rank
  FROM section_ranked
  WHERE r.id = section_ranked.id;

  UPDATE exam_sessions es
  SET
    rank = r.rank,
    section_rank = r.section_rank
  FROM results r
  WHERE es.exam_id = p_exam_id
    AND es.student_id = r.student_id
    AND r.college_id = p_college_id;

  UPDATE exams SET
    submitted_count = (
      SELECT COUNT(*) FROM exam_sessions
      WHERE exam_id = p_exam_id AND status = 'submitted'
    ),
    average_score = (
      SELECT ROUND(AVG(percentage)::NUMERIC, 2)
      FROM results WHERE exam_id = p_exam_id
    ),
    highest_score = (
      SELECT MAX(score) FROM results WHERE exam_id = p_exam_id
    ),
    lowest_score = (
      SELECT MIN(score) FROM results WHERE exam_id = p_exam_id
    )
  WHERE id = p_exam_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_student_analytics
CREATE OR REPLACE FUNCTION get_student_analytics(
  p_student_id UUID,
  p_college_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  v_score_history JSONB;
  v_subject_avgs JSONB;
  v_weak_topics JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]')
  INTO v_score_history
  FROM (
    SELECT
      e.name AS exam_name,
      r.score,
      r.percentage,
      r.rank,
      e.scheduled_date AS date
    FROM results r
    JOIN exams e ON e.id = r.exam_id
    WHERE r.student_id = p_student_id
      AND r.college_id = p_college_id
    ORDER BY e.scheduled_date DESC
    LIMIT p_limit
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]')
  INTO v_subject_avgs
  FROM (
    SELECT
      subj.name AS subject,
      ROUND(AVG(
        CASE WHEN sa.is_correct THEN 100.0 ELSE 0 END
      )::NUMERIC, 1) AS average_score,
      COUNT(*) AS total_questions
    FROM student_answers sa
    JOIN questions q ON q.id = sa.question_id
    JOIN subjects subj ON subj.id = q.subject_id
    JOIN exam_sessions es ON es.id = sa.session_id
    WHERE es.student_id = p_student_id
      AND es.college_id = p_college_id
    GROUP BY subj.id, subj.name
    ORDER BY average_score DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]')
  INTO v_weak_topics
  FROM (
    SELECT
      q.topic,
      subj.name AS subject,
      ROUND(AVG(CASE WHEN sa.is_correct THEN 100.0 ELSE 0 END)::NUMERIC, 1) AS correct_rate
    FROM student_answers sa
    JOIN questions q ON q.id = sa.question_id
    JOIN subjects subj ON subj.id = q.subject_id
    JOIN exam_sessions es ON es.id = sa.session_id
    WHERE es.student_id = p_student_id
      AND es.college_id = p_college_id
      AND q.topic IS NOT NULL
    GROUP BY q.topic, subj.name
    HAVING AVG(CASE WHEN sa.is_correct THEN 100.0 ELSE 0 END) < 50
    ORDER BY correct_rate ASC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'score_history', v_score_history,
    'subject_averages', v_subject_avgs,
    'weak_topics', v_weak_topics
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_bank_question_count
CREATE OR REPLACE FUNCTION update_bank_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.bank_id IS NOT NULL THEN
    UPDATE question_banks SET question_count = question_count + 1 WHERE id = NEW.bank_id;
  ELSIF TG_OP = 'DELETE' AND OLD.bank_id IS NOT NULL THEN
    UPDATE question_banks SET question_count = GREATEST(0, question_count - 1) WHERE id = OLD.bank_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_question_bank_count
AFTER INSERT OR DELETE ON questions
FOR EACH ROW EXECUTE FUNCTION update_bank_question_count();

-- sync_violation_count
CREATE OR REPLACE FUNCTION sync_violation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exam_sessions
  SET violation_count = (
    SELECT COUNT(*) FROM violations WHERE session_id = NEW.session_id
  )
  WHERE id = NEW.session_id;

  IF (SELECT violation_count FROM exam_sessions WHERE id = NEW.session_id) >= 2 THEN
    UPDATE exam_sessions SET status = 'disqualified' WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_violations
AFTER INSERT ON violations
FOR EACH ROW EXECUTE FUNCTION sync_violation_count();

-- update_exam_question_count
CREATE OR REPLACE FUNCTION update_exam_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE exams SET total_questions = total_questions + 1 WHERE id = NEW.exam_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE exams SET total_questions = GREATEST(0, total_questions - 1) WHERE id = OLD.exam_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_question_count
AFTER INSERT OR DELETE ON exam_questions
FOR EACH ROW EXECUTE FUNCTION update_exam_question_count();

-- get_readiness_score
CREATE OR REPLACE FUNCTION get_readiness_score(
  p_student_id UUID,
  p_college_id UUID,
  p_exam_target TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC;
BEGIN
  SELECT
    ROUND(AVG(
      CASE WHEN sa.is_correct THEN 100.0 ELSE 0 END
    )::NUMERIC, 1)
  INTO v_score
  FROM student_answers sa
  JOIN questions q ON q.id = sa.question_id
  JOIN exam_sessions es ON es.id = sa.session_id
  WHERE es.student_id = p_student_id
    AND es.college_id = p_college_id
    AND p_exam_target = ANY(q.exam_type_tags);

  RETURN COALESCE(v_score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- EXPLICIT SYSTEM GRANTS FOR SCHEMA SAFETY
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated, anon;

-- ============================================================
-- INITIAL SEED DATA
-- ============================================================

-- 1. College Seed
INSERT INTO public.colleges (id, name, code, state, mobile, email, subscription_plan, max_students, max_faculty, is_active)
VALUES (
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'Demo College',
  'DEMO123',
  'Telangana',
  '9999999999',
  'admin@democollege.edu',
  'enterprise',
  500,
  50,
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. User Seed (Faculty member matching the app's dev mock credentials)
INSERT INTO public.users (id, college_id, role, mobile, is_active)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'faculty',
  '+919999999999',
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Faculty Seed (Primary faculty record mapped to user ID above)
INSERT INTO public.faculty (id, college_id, user_id, name, mobile, email, qualification, is_active)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Demo Faculty',
  '+919999999999',
  'faculty@democollege.edu',
  'M.Tech',
  true
) ON CONFLICT (id) DO NOTHING;

-- 4. User Seed (Admin role matching dev mock login role)
INSERT INTO public.users (id, college_id, role, mobile, is_active)
VALUES (
  'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d8',
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'admin',
  '+918888888888',
  true
) ON CONFLICT (id) DO NOTHING;

-- 5. Subjects Seed
INSERT INTO public.subjects (id, college_id, name, code, streams, is_active)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'd3b07384-d113-4c9b-8e12-421739c99182', 'Mathematics', 'MATH101', '{MPC}', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7f', 'd3b07384-d113-4c9b-8e12-421739c99182', 'Physics', 'PHYS101', '{MPC,BiPC}', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'd3b07384-d113-4c9b-8e12-421739c99182', 'Chemistry', 'CHEM101', '{MPC,BiPC}', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Faculty Mapped Subjects Seed
INSERT INTO public.faculty_subjects (college_id, faculty_id, subject_id)
VALUES 
  ('d3b07384-d113-4c9b-8e12-421739c99182', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6'),
  ('d3b07384-d113-4c9b-8e12-421739c99182', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7f')
ON CONFLICT DO NOTHING;

-- 7. Academic Sections Seed
INSERT INTO public.sections (id, college_id, name, stream, year)
VALUES (
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'Section A (MPC 1st Year)',
  'MPC',
  1
) ON CONFLICT (id) DO NOTHING;

-- 8. Faculty Section Mapping Seed
INSERT INTO public.faculty_sections (college_id, faculty_id, section_id)
VALUES (
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e'
) ON CONFLICT DO NOTHING;

-- 9. User Seed (Student)
INSERT INTO public.users (id, college_id, role, mobile, is_active)
VALUES (
  'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'student',
  '+918888888888',
  true
) ON CONFLICT (id) DO NOTHING;

-- 10. Student Record Seed
INSERT INTO public.students (id, college_id, user_id, roll_number, name, section_id, mobile, parent_mobile, stream, year, status)
VALUES (
  'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  'd3b07384-d113-4c9b-8e12-421739c99182',
  'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  'ROLL001',
  'Demo Student',
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  '+918888888888',
  '+917777777777',
  'MPC',
  1,
  'active'
) ON CONFLICT (id) DO NOTHING;
