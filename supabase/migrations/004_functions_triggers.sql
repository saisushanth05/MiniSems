-- Mini Sems — Database Functions & Triggers
-- Migration 004: Analytics, rankings, auto-computation

-- ============================================================
-- FUNCTION: Compute Exam Results
-- Called after exam submission via Edge Function
-- ============================================================

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
  -- Get session
  SELECT * INTO v_session FROM exam_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  -- Get exam
  SELECT * INTO v_exam FROM exams WHERE id = v_session.exam_id;

  -- Get student
  SELECT * INTO v_student FROM students WHERE id = v_session.student_id;

  -- Evaluate each answer
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
        ELSE NULL  -- Descriptive — requires manual grading
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

  -- Update individual answers with is_correct and marks_awarded
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

  -- Max score
  SELECT COALESCE(SUM(marks), 0) INTO v_max_score
  FROM exam_questions WHERE exam_id = v_session.exam_id;

  -- Ensure score isn't negative
  v_score := GREATEST(0, v_score);

  -- Percentage
  v_percentage := CASE WHEN v_max_score > 0 THEN (v_score / v_max_score * 100) ELSE 0 END;

  -- Upsert result
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

  -- Update session with computed score
  UPDATE exam_sessions SET
    score = v_score,
    max_score = v_max_score,
    percentage = v_percentage,
    correct_count = v_correct,
    wrong_count = v_wrong,
    skipped_count = v_skipped
  WHERE id = p_session_id;

  -- Recompute ranks for all students in this exam
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

-- ============================================================
-- FUNCTION: Compute Ranks
-- ============================================================

CREATE OR REPLACE FUNCTION compute_exam_ranks(p_exam_id UUID, p_college_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Overall rank (all students in exam)
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

  -- Section rank
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

  -- Sync ranks back to exam_sessions
  UPDATE exam_sessions es
  SET
    rank = r.rank,
    section_rank = r.section_rank
  FROM results r
  WHERE es.exam_id = p_exam_id
    AND es.student_id = r.student_id
    AND r.college_id = p_college_id;

  -- Update exam stats
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

-- ============================================================
-- FUNCTION: Get Student Analytics
-- ============================================================

CREATE OR REPLACE FUNCTION get_student_analytics(
  p_student_id UUID,
  p_college_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  v_score_history JSONB;
  v_rank_history JSONB;
  v_subject_avgs JSONB;
  v_weak_topics JSONB;
BEGIN
  -- Score history (last N exams)
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

  -- Subject averages
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

  -- Weak topics (correct_rate < 50%)
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

-- ============================================================
-- TRIGGER: Auto-update question_bank count
-- ============================================================

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

-- ============================================================
-- TRIGGER: Auto-log exam session violations to exam_sessions
-- ============================================================

CREATE OR REPLACE FUNCTION sync_violation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exam_sessions
  SET violation_count = (
    SELECT COUNT(*) FROM violations WHERE session_id = NEW.session_id
  )
  WHERE id = NEW.session_id;

  -- Auto-disqualify on 3rd violation
  IF (SELECT violation_count FROM exam_sessions WHERE id = NEW.session_id) >= 3 THEN
    UPDATE exam_sessions SET status = 'disqualified' WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_violations
AFTER INSERT ON violations
FOR EACH ROW EXECUTE FUNCTION sync_violation_count();

-- ============================================================
-- TRIGGER: Update exam total_questions count
-- ============================================================

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

-- ============================================================
-- FUNCTION: EAMCET/JEE Readiness Score
-- ============================================================

CREATE OR REPLACE FUNCTION get_readiness_score(
  p_student_id UUID,
  p_college_id UUID,
  p_exam_target TEXT  -- 'EAMCET', 'JEE', 'NEET'
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
