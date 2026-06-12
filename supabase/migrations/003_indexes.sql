-- Mini Sems — Indexes for Performance
-- Migration 003: Optimized query paths

-- ── colleges ──
CREATE INDEX idx_colleges_code ON colleges(code);
CREATE INDEX idx_colleges_active ON colleges(is_active);

-- ── users ──
CREATE INDEX idx_users_college_id ON users(college_id);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_college_role ON users(college_id, role);

-- ── students ──
CREATE INDEX idx_students_college_id ON students(college_id);
CREATE INDEX idx_students_roll_number ON students(college_id, roll_number);
CREATE INDEX idx_students_section_id ON students(section_id);
CREATE INDEX idx_students_status ON students(college_id, status);
CREATE INDEX idx_students_mobile ON students(mobile);
CREATE INDEX idx_students_parent_mobile ON students(parent_mobile);

-- ── faculty ──
CREATE INDEX idx_faculty_college_id ON faculty(college_id);
CREATE INDEX idx_faculty_user_id ON faculty(user_id);
CREATE INDEX idx_faculty_active ON faculty(college_id, is_active);

-- ── faculty_subjects & sections ──
CREATE INDEX idx_faculty_subjects_faculty ON faculty_subjects(faculty_id);
CREATE INDEX idx_faculty_sections_faculty ON faculty_sections(faculty_id);
CREATE INDEX idx_faculty_sections_section ON faculty_sections(section_id);

-- ── questions ──
CREATE INDEX idx_questions_college_id ON questions(college_id);
CREATE INDEX idx_questions_bank_id ON questions(bank_id);
CREATE INDEX idx_questions_subject_id ON questions(subject_id);
CREATE INDEX idx_questions_difficulty ON questions(college_id, difficulty);
CREATE INDEX idx_questions_type ON questions(college_id, type);
CREATE INDEX idx_questions_tags ON questions USING GIN(concept_tags);
CREATE INDEX idx_questions_exam_tags ON questions USING GIN(exam_type_tags);

-- ── exams ──
CREATE INDEX idx_exams_college_id ON exams(college_id);
CREATE INDEX idx_exams_status ON exams(college_id, status);
CREATE INDEX idx_exams_scheduled_date ON exams(college_id, scheduled_date);
CREATE INDEX idx_exams_type ON exams(college_id, exam_type);
CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_exams_target_sections ON exams USING GIN(target_sections);

-- ── exam_questions ──
CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_question_id ON exam_questions(question_id);
CREATE INDEX idx_exam_questions_order ON exam_questions(exam_id, order_index);

-- ── exam_sessions ──
CREATE INDEX idx_exam_sessions_exam_id ON exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_student_id ON exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(exam_id, status);
CREATE INDEX idx_exam_sessions_college_id ON exam_sessions(college_id);

-- ── student_answers ──
CREATE INDEX idx_student_answers_session_id ON student_answers(session_id);
CREATE INDEX idx_student_answers_exam_id ON student_answers(exam_id);
CREATE INDEX idx_student_answers_student_id ON student_answers(student_id);
CREATE INDEX idx_student_answers_question_id ON student_answers(question_id);

-- ── violations ──
CREATE INDEX idx_violations_session_id ON violations(session_id);
CREATE INDEX idx_violations_student_id ON violations(student_id);
CREATE INDEX idx_violations_exam_id ON violations(exam_id);

-- ── results ──
CREATE INDEX idx_results_exam_id ON results(exam_id);
CREATE INDEX idx_results_student_id ON results(student_id);
CREATE INDEX idx_results_college_id ON results(college_id);
CREATE INDEX idx_results_rank ON results(exam_id, rank);

-- ── performance_metrics ──
CREATE INDEX idx_perf_student_id ON performance_metrics(student_id);
CREATE INDEX idx_perf_college_id ON performance_metrics(college_id);
CREATE INDEX idx_perf_metric_type ON performance_metrics(student_id, metric_type);

-- ── audit_logs ──
CREATE INDEX idx_audit_college_id ON audit_logs(college_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(college_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(college_id, action);

-- ── notifications ──
CREATE INDEX idx_notifications_college_id ON notifications(college_id);
CREATE INDEX idx_notifications_exam_id ON notifications(exam_id);
CREATE INDEX idx_notifications_sent ON notifications(college_id, is_sent);

-- ── device_registrations ──
CREATE INDEX idx_devices_student_id ON device_registrations(student_id);
CREATE INDEX idx_devices_device_id ON device_registrations(device_id);

-- ── otp_logs ──
CREATE INDEX idx_otp_mobile ON otp_logs(mobile);
CREATE INDEX idx_otp_expires ON otp_logs(expires_at);
