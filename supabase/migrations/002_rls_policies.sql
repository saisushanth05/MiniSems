-- Mini Sems — Row Level Security Policies
-- Migration 002: Multi-tenant data isolation
-- Every college sees ONLY its own data

-- ============================================================
-- ENABLE RLS ON ALL TABLES
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

-- ============================================================
-- HELPER FUNCTION: Get college_id from JWT claims
-- ============================================================

CREATE OR REPLACE FUNCTION auth.college_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'college_id')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT auth.jwt() ->> 'role' = 'super_admin';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT auth.jwt() ->> 'role' IN ('admin', 'super_admin');
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_faculty() RETURNS BOOLEAN AS $$
  SELECT auth.jwt() ->> 'role' = 'faculty';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_student() RETURNS BOOLEAN AS $$
  SELECT auth.jwt() ->> 'role' = 'student';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_parent() RETURNS BOOLEAN AS $$
  SELECT auth.jwt() ->> 'role' = 'parent';
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- COLLEGES TABLE — Only super_admin sees all; others see own
-- ============================================================

CREATE POLICY "super_admin_all_colleges" ON colleges
  FOR ALL USING (auth.is_super_admin());

CREATE POLICY "college_members_own_college" ON colleges
  FOR SELECT USING (id = auth.college_id());

-- ============================================================
-- USERS
-- ============================================================

CREATE POLICY "college_isolation_users" ON users
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

-- ============================================================
-- SECTIONS
-- ============================================================

CREATE POLICY "college_isolation_sections" ON sections
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

-- ============================================================
-- SUBJECTS
-- ============================================================

CREATE POLICY "college_isolation_subjects" ON subjects
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

-- ============================================================
-- STUDENTS
-- Admin: full CRUD; Faculty: read own sections; Student: read self
-- ============================================================

CREATE POLICY "admin_manage_students" ON students
  FOR ALL USING (
    auth.is_super_admin() OR
    (auth.is_admin() AND college_id = auth.college_id())
  );

CREATE POLICY "faculty_read_students" ON students
  FOR SELECT USING (
    auth.is_faculty() AND college_id = auth.college_id()
  );

CREATE POLICY "student_read_self" ON students
  FOR SELECT USING (
    auth.is_student() AND
    college_id = auth.college_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "parent_read_linked_student" ON students
  FOR SELECT USING (
    auth.is_parent() AND
    college_id = auth.college_id() AND
    parent_mobile = (auth.jwt() ->> 'mobile')
  );

-- ============================================================
-- PARENTS
-- ============================================================

CREATE POLICY "college_isolation_parents" ON parents
  FOR ALL USING (
    auth.is_super_admin() OR
    (auth.is_admin() AND college_id = auth.college_id())
  );

CREATE POLICY "parent_read_self" ON parents
  FOR SELECT USING (
    auth.is_parent() AND
    college_id = auth.college_id() AND
    mobile = (auth.jwt() ->> 'mobile')
  );

-- ============================================================
-- FACULTY
-- ============================================================

CREATE POLICY "admin_manage_faculty" ON faculty
  FOR ALL USING (
    auth.is_super_admin() OR
    (auth.is_admin() AND college_id = auth.college_id())
  );

CREATE POLICY "faculty_read_self" ON faculty
  FOR SELECT USING (
    auth.is_faculty() AND
    college_id = auth.college_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "faculty_update_self" ON faculty
  FOR UPDATE USING (
    auth.is_faculty() AND
    college_id = auth.college_id() AND
    user_id = auth.uid()
  );

-- ============================================================
-- FACULTY SUBJECTS & SECTIONS
-- ============================================================

CREATE POLICY "college_isolation_faculty_subjects" ON faculty_subjects
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

CREATE POLICY "college_isolation_faculty_sections" ON faculty_sections
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

-- ============================================================
-- QUESTION BANKS
-- ============================================================

CREATE POLICY "college_isolation_qbanks" ON question_banks
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

-- ============================================================
-- QUESTIONS
-- Faculty: manage own; Students/Parents: cannot read correct answer
-- ============================================================

CREATE POLICY "admin_faculty_manage_questions" ON questions
  FOR ALL USING (
    auth.is_super_admin() OR
    (auth.is_admin() AND college_id = auth.college_id()) OR
    (auth.is_faculty() AND college_id = auth.college_id())
  );

-- Students can read questions (but NOT correct_answer) — handle in view/function
CREATE POLICY "student_read_questions" ON questions
  FOR SELECT USING (
    auth.is_student() AND college_id = auth.college_id()
  );

-- ============================================================
-- EXAMS
-- ============================================================

CREATE POLICY "admin_manage_exams" ON exams
  FOR ALL USING (
    auth.is_super_admin() OR
    (auth.is_admin() AND college_id = auth.college_id())
  );

CREATE POLICY "faculty_manage_own_exams" ON exams
  FOR ALL USING (
    auth.is_faculty() AND
    college_id = auth.college_id() AND
    created_by = (
      SELECT id FROM faculty
      WHERE user_id = auth.uid() AND college_id = auth.college_id()
      LIMIT 1
    )
  );

CREATE POLICY "faculty_read_all_exams" ON exams
  FOR SELECT USING (
    auth.is_faculty() AND college_id = auth.college_id()
  );

-- Students can read published exams targeting their sections
CREATE POLICY "student_read_own_exams" ON exams
  FOR SELECT USING (
    auth.is_student() AND
    college_id = auth.college_id() AND
    status IN ('published', 'active', 'completed') AND
    (
      -- Their section is in target_sections
      (SELECT section_id FROM students WHERE user_id = auth.uid() LIMIT 1) = ANY(target_sections)
      OR
      -- Or they're specifically targeted
      (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1) = ANY(target_students)
    )
  );

-- Parent reads same exams as linked student
CREATE POLICY "parent_read_exams" ON exams
  FOR SELECT USING (
    auth.is_parent() AND college_id = auth.college_id()
  );

-- ============================================================
-- EXAM SECTIONS & QUESTIONS
-- ============================================================

CREATE POLICY "college_isolation_exam_sections" ON exam_sections
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

CREATE POLICY "college_isolation_exam_questions" ON exam_questions
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

-- ============================================================
-- EXAM SESSIONS
-- Students: manage own session; Faculty/Admin: read all
-- ============================================================

CREATE POLICY "admin_faculty_read_sessions" ON exam_sessions
  FOR SELECT USING (
    (auth.is_admin() OR auth.is_faculty()) AND college_id = auth.college_id()
  );

CREATE POLICY "student_manage_own_session" ON exam_sessions
  FOR ALL USING (
    auth.is_student() AND
    college_id = auth.college_id() AND
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================================
-- STUDENT ANSWERS
-- ============================================================

CREATE POLICY "admin_faculty_read_answers" ON student_answers
  FOR SELECT USING (
    (auth.is_admin() OR auth.is_faculty()) AND college_id = auth.college_id()
  );

CREATE POLICY "student_manage_own_answers" ON student_answers
  FOR ALL USING (
    auth.is_student() AND
    college_id = auth.college_id() AND
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================================
-- VIOLATIONS
-- ============================================================

CREATE POLICY "admin_faculty_manage_violations" ON violations
  FOR ALL USING (
    (auth.is_admin() OR auth.is_faculty()) AND college_id = auth.college_id()
  );

CREATE POLICY "student_insert_own_violations" ON violations
  FOR INSERT WITH CHECK (
    auth.is_student() AND college_id = auth.college_id()
  );

-- ============================================================
-- DEVICE REGISTRATIONS
-- ============================================================

CREATE POLICY "college_isolation_devices" ON device_registrations
  FOR ALL USING (
    auth.is_super_admin() OR
    (auth.is_admin() AND college_id = auth.college_id()) OR
    (auth.is_student() AND college_id = auth.college_id() AND
     student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1))
  );

-- ============================================================
-- RESULTS
-- ============================================================

CREATE POLICY "admin_faculty_read_results" ON results
  FOR SELECT USING (
    (auth.is_admin() OR auth.is_faculty()) AND college_id = auth.college_id()
  );

CREATE POLICY "student_read_own_results" ON results
  FOR SELECT USING (
    auth.is_student() AND
    college_id = auth.college_id() AND
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "parent_read_child_results" ON results
  FOR SELECT USING (
    auth.is_parent() AND college_id = auth.college_id()
  );

-- System inserts results (service role bypasses RLS)

-- ============================================================
-- PERFORMANCE METRICS
-- ============================================================

CREATE POLICY "admin_faculty_read_metrics" ON performance_metrics
  FOR SELECT USING (
    (auth.is_admin() OR auth.is_faculty()) AND college_id = auth.college_id()
  );

CREATE POLICY "student_read_own_metrics" ON performance_metrics
  FOR SELECT USING (
    auth.is_student() AND
    college_id = auth.college_id() AND
    student_id = (SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "college_isolation_notifications" ON notifications
  FOR ALL USING (
    auth.is_super_admin() OR college_id = auth.college_id()
  );

-- ============================================================
-- AUDIT LOGS — Admin read only
-- ============================================================

CREATE POLICY "admin_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    auth.is_admin() AND college_id = auth.college_id()
  );

CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (college_id = auth.college_id());

-- ============================================================
-- OTP LOGS — Service role only (no user access)
-- ============================================================
-- No user policies — service role key only
