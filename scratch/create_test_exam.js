const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fryeammpjqcwkiknevng.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s98tBwJ8u6Mgqf0rdQp5FQ_S9Rxo_jb';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const collegeId = 'd3b07384-d113-4c9b-8e12-421739c99182';
const facultyId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const sectionId = 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e';
const examId = 'a8f10b2c-29cc-4372-a567-0e02b2c3d480';
const sectionUuid = '33333333-3333-3333-3333-333333333333';

async function seedExam() {
  console.log('Seeding exam and questions...');

  try {
    // 1. Delete existing exam & questions to avoid conflict
    console.log('Cleaning up existing test data...');
    await supabase.from('exam_questions').delete().eq('exam_id', examId);
    await supabase.from('exam_sections').delete().eq('exam_id', examId);
    await supabase.from('exam_sessions').delete().eq('exam_id', examId);
    await supabase.from('exams').delete().eq('id', examId);
    await supabase.from('questions').delete().in('id', [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    ]);

    // 2. Insert Questions
    console.log('Inserting questions...');
    const questions = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        college_id: collegeId,
        created_by: facultyId,
        type: 'mcq',
        question_text: 'What is 5 + 7?',
        option_a: '10',
        option_b: '12',
        option_c: '14',
        option_d: '16',
        correct_answer: 'B',
        correct_answer_explanation: '5 + 7 equals 12.',
        difficulty: 'easy',
        marks: 50.0,
        negative_marks: 0.0,
        chapter: 'Basic Math',
        topic: 'Arithmetic',
        exam_type_tags: ['practice_test']
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        college_id: collegeId,
        created_by: facultyId,
        type: 'mcq',
        question_text: 'What is the chemical symbol for Water?',
        option_a: 'H2O',
        option_b: 'CO2',
        option_c: 'O2',
        option_d: 'N2',
        correct_answer: 'A',
        correct_answer_explanation: 'Water is represented by H2O.',
        difficulty: 'easy',
        marks: 50.0,
        negative_marks: 0.0,
        chapter: 'Chemistry Basics',
        topic: 'Compounds',
        exam_type_tags: ['practice_test']
      }
    ];

    const { error: qErr } = await supabase.from('questions').insert(questions);
    if (qErr) throw qErr;

    // 3. Insert Exam
    console.log('Inserting exam...');
    const today = new Date().toISOString().split('T')[0];
    const exam = {
      id: examId,
      college_id: collegeId,
      created_by: facultyId,
      name: 'Midterm Math & Science Exam',
      exam_type: 'practice_test',
      status: 'active',
      scheduled_date: today,
      start_time: '00:00:00',
      end_time: '23:59:59',
      duration_minutes: 180,
      total_marks: 100.0,
      total_questions: 2,
      randomize_questions: false,
      randomize_options: false,
      show_score_immediately: true,
      allow_reattempt: true,
      negative_marking: false,
      negative_mark_value: 0.0,
      allow_review_marking: true,
      target_sections: [sectionId],
      instructions: 'Answer all questions. Switch violations will disqualify you.'
    };

    const { error: exErr } = await supabase.from('exams').insert(exam);
    if (exErr) throw exErr;

    // 4. Insert Exam Section
    console.log('Inserting exam section...');
    const section = {
      id: sectionUuid,
      college_id: collegeId,
      exam_id: examId,
      section_name: 'General Section',
      total_questions: 2,
      marks_per_question: 50.0,
      negative_marks: 0.0,
      order_index: 0
    };

    const { error: secErr } = await supabase.from('exam_sections').insert(section);
    if (secErr) throw secErr;

    // 5. Insert Exam Questions mapping
    console.log('Inserting exam questions mapping...');
    const mappings = [
      {
        college_id: collegeId,
        exam_id: examId,
        question_id: '11111111-1111-1111-1111-111111111111',
        exam_section_id: sectionUuid,
        order_index: 0,
        marks: 50.0,
        negative_marks: 0.0
      },
      {
        college_id: collegeId,
        exam_id: examId,
        question_id: '22222222-2222-2222-2222-222222222222',
        exam_section_id: sectionUuid,
        order_index: 1,
        marks: 50.0,
        negative_marks: 0.0
      }
    ];

    const { error: mapErr } = await supabase.from('exam_questions').insert(mappings);
    if (mapErr) throw mapErr;

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}

seedExam();
