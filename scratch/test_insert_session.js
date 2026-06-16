const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fryeammpjqcwkiknevng.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s98tBwJ8u6Mgqf0rdQp5FQ_S9Rxo_jb';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const collegeId = 'd3b07384-d113-4c9b-8e12-421739c99182';
const studentId = 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b';
const examId = 'a8f10b2c-29cc-4372-a567-0e02b2c3d480';

async function testInsert() {
  console.log('Testing exam session insert...');
  try {
    // Attempt insert
    const { data, error } = await supabase.from('exam_sessions').insert({
      college_id: collegeId,
      exam_id: examId,
      student_id: studentId,
      device_id: 'test_device',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) {
      console.error('Insert failed:', error);
    } else {
      console.log('Insert succeeded! Session details:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testInsert();
