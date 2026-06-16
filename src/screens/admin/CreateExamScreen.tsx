// Mini Sems — Create Exam Screen (Admin)

import React, {useState, useEffect} from 'react';
import {
  StyleSheet, Text, TextInput,
  TouchableOpacity, View, ScrollView, Alert, Switch, Modal, FlatList
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {AdminStackParamList} from '@apptypes/navigation.types';
import {DatePickerModal, TimePickerModal} from '../../components/common/DateTimePicker';
import {format, parseISO, isValid} from 'date-fns';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'CreateExam'>;

const EXAM_TYPES = [
  {id: 'weekly_test', label: 'Weekly Test'},
  {id: 'unit_test', label: 'Unit Test'},
  {id: 'grand_test', label: 'Grand Test'},
  {id: 'practice_test', label: 'Practice Test'},
];

const generateMockQuestions = (collegeId: string, facultyId: string | null, count: number) => {
  const list = [];
  const subjects = ['Mathematics', 'Physics', 'Chemistry'];
  for (let i = 1; i <= count; i++) {
    const subj = subjects[(i - 1) % 3];
    list.push({
      college_id: collegeId,
      created_by: facultyId,
      type: 'mcq',
      question_text: `Sample ${subj} Question #${i}: What is the value of x in equation ${i}x + 5 = ${i * 2 + 5}?`,
      option_a: `${i}`,
      option_b: '2',
      option_c: '3',
      option_d: '4',
      correct_answer: 'B',
      correct_answer_explanation: `Solving the equation gives x = 2.`,
      difficulty: i % 3 === 0 ? 'hard' : (i % 2 === 0 ? 'medium' : 'easy'),
      marks: 1.0,
      negative_marks: 0.25,
      chapter: `Chapter ${Math.ceil(i / 5)}`,
      topic: `${subj} Core`,
      exam_type_tags: ['practice_test', 'weekly_test']
    });
  }
  return list;
};

const CreateExamScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user} = useAuthStore();
  const {t} = useTranslation();

  // Sections state
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    const fetchSections = async () => {
      if (user?.collegeId) {
        try {
          const {data} = await db.sections().select('id').eq('college_id', user.collegeId);
          if (data) setSections(data);
        } catch (err) {
          console.log('Error fetching sections:', err);
        }
      }
    };
    fetchSections();
  }, [user?.collegeId]);

  // Form Fields
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<string>('weekly_test');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('');

  // Questions upload states
  const [questionsFile, setQuestionsFile] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);

  // Questions database selector states
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // CSV / Excel questions input states
  const [questionSource, setQuestionSource] = useState<'bank' | 'csv'>('csv');
  const [csvText, setCsvText] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (user?.collegeId) {
        try {
          const {data} = await db.questions()
            .select('*, subject:subjects(name)')
            .eq('college_id', user.collegeId);
          if (data) setDbQuestions(data);
        } catch (err) {
          console.log('Error fetching questions:', err);
        }
      }
    };
    fetchQuestions();
  }, [user?.collegeId]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (user?.collegeId) {
        try {
          const {data} = await db.subjects()
            .select('*')
            .eq('college_id', user.collegeId)
            .eq('is_active', true);
          if (data) setSubjects(data);
        } catch (err) {
          console.log('Error fetching subjects:', err);
        }
      }
    };
    fetchSubjects();
  }, [user?.collegeId]);

  const openQuestionSelector = () => {
    if (dbQuestions.length === 0) {
      Alert.alert('No Questions Found', 'Please add questions to the database question bank first.');
      return;
    }
    setShowQuestionModal(true);
  };

  const handleConfirmQuestions = (ids: string[]) => {
    setSelectedIds(ids);
    const selected = dbQuestions.filter(q => ids.includes(q.id));
    setTotalQuestions(selected.length.toString());
    const sumMarks = selected.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);
    setTotalMarks(sumMarks.toString());
    setQuestionsFile(`Selected ${selected.length} questions from bank`);
    setParsedQuestions(selected);
    setShowQuestionModal(false);
  };

  // Simple CSV parser
  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').map(line => line.trim()).filter(Boolean);
    const parsedRows = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && (lines[i].toLowerCase().includes('subject') || lines[i].toLowerCase().includes('question'))) {
        continue; // Skip header row
      }
      const line = lines[i];
      let col = [];
      let inQuotes = false;
      let buffer = '';
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        let char = line[charIndex];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          col.push(buffer.trim().replace(/^"|"$/g, ''));
          buffer = '';
        } else {
          buffer += char;
        }
      }
      col.push(buffer.trim().replace(/^"|"$/g, ''));
      if (col.length >= 8) {
        parsedRows.push(col);
      }
    }
    return parsedRows;
  };

  const handleParseQuestionsCSV = () => {
    if (!csvText.trim()) {
      Alert.alert('Error', 'Please paste CSV content.');
      return;
    }
    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        throw new Error('No valid rows found. Check your columns.');
      }

      const subjectMap = subjects.reduce((acc, sub) => {
        acc[sub.code.toUpperCase()] = sub.id;
        return acc;
      }, {} as Record<string, string>);

      const questionsToParse: any[] = [];
      let skippedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const subjectCode = row[0].toUpperCase();
        const subId = subjectMap[subjectCode];
        if (!subId) {
          skippedCount++;
          continue;
        }

        questionsToParse.push({
          college_id: user?.collegeId,
          created_by: null, // Admin created
          subject_id: subId,
          type: 'mcq',
          question_text: row[1],
          option_a: row[2],
          option_b: row[3],
          option_c: row[4],
          option_d: row[5],
          correct_answer: row[6].toUpperCase(),
          marks: parseFloat(row[7]) || 1.0,
          negative_marks: negativeMarking ? 0.25 : 0.0,
          difficulty: (row[8]?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard',
        });
      }

      if (questionsToParse.length > 0) {
        setParsedQuestions(questionsToParse);
        setTotalQuestions(questionsToParse.length.toString());
        const sumMarks = questionsToParse.reduce((sum, q) => sum + q.marks, 0);
        setTotalMarks(sumMarks.toString());
        setQuestionsFile(`CSV: ${questionsToParse.length} questions parsed successfully`);
        if (skippedCount > 0) {
          Alert.alert('Success', `Parsed ${questionsToParse.length} questions. Skipped ${skippedCount} rows with unmatched subject codes.`);
        } else {
          Alert.alert('Success', `Parsed ${questionsToParse.length} questions from CSV successfully.`);
        }
      } else {
        throw new Error('No questions could be matched. Verify subject codes (e.g. PHY, MATH) exist in the system.');
      }
    } catch (err: any) {
      Alert.alert('Parse Failed', err.message || 'Error processing CSV.');
    }
  };

  // Picker visibility states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Automatically calculate duration
  useEffect(() => {
    if (startTime && endTime) {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      if (startParts.length >= 2 && endParts.length >= 2) {
        const startMin = startParts[0] * 60 + startParts[1];
        const endMin = endParts[0] * 60 + endParts[1];
        let diff = endMin - startMin;
        if (diff < 0) {
          // Crosses midnight
          diff += 24 * 60;
        }
        setDuration(diff.toString());
      }
    }
  }, [startTime, endTime]);

  const getDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? format(parsed, 'dd MMMM yyyy') : dateStr;
  };

  const formatTo12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  
  // Settings
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [allowReattempt, setAllowReattempt] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !scheduledDate || !startTime || !endTime || !duration || !totalMarks || !totalQuestions) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (parsedQuestions.length === 0) {
      Alert.alert('Error', 'Please select or upload questions.');
      return;
    }
    
    setSaving(true);
    try {
      if (!user?.collegeId || !user?.id) {
        throw new Error('User not properly authenticated');
      }

      // 1. Insert Exam Header and fetch generated ID
      const {data: examData, error: examError} = await db.exams().insert({
        college_id: user.collegeId,
        created_by: user.role === 'faculty' ? user.facultyId || null : null,
        name,
        exam_type: examType as any,
        status: 'published', 
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: parseInt(duration, 10),
        total_marks: parseInt(totalMarks, 10),
        total_questions: parseInt(totalQuestions, 10),
        randomize_questions: randomizeQuestions,
        randomize_options: true,
        show_score_immediately: showScoreImmediately,
        allow_reattempt: allowReattempt,
        negative_marking: negativeMarking,
        negative_mark_value: negativeMarking ? 0.25 : 0,
        allow_review_marking: true,
        target_sections: sections.length > 0 ? sections.map(s => s.id) : ['b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e']
      }).select().single();
        
      if (examError) throw examError;
      if (!examData) throw new Error('Failed to retrieve created exam record.');

      const examId = examData.id;

      // 2. Filter existing and insert new questions (Admin supports pre-existing selection)
      const existingQs = parsedQuestions.filter(q => q.id);
      const newQs = parsedQuestions.filter(q => !q.id);

      let insertedQs: any[] = [];
      if (newQs.length > 0) {
        const {data: questionsData, error: questionsError} = await db.questions().insert(newQs).select();
        if (questionsError) throw questionsError;
        insertedQs = questionsData || [];
      }

      const allQuestions = [...existingQs, ...insertedQs];

      if (allQuestions.length === 0) {
        throw new Error('No questions found to associate.');
      }

      // 3. Create default Exam Section mapping
      const {data: sectionData, error: sectionError} = await db.examSections().insert({
        college_id: user.collegeId,
        exam_id: examId,
        section_name: 'General Section',
        total_questions: allQuestions.length,
        marks_per_question: parseFloat((parseFloat(totalMarks) / allQuestions.length).toFixed(2)),
        negative_marks: negativeMarking ? 0.25 : 0.0,
        order_index: 0
      }).select().single();

      if (sectionError) throw sectionError;
      const sectionId = sectionData?.id;

      // 4. Map questions to Exam Questions mapping table
      const examQuestionsRows = allQuestions.map((q, idx) => ({
        college_id: user.collegeId,
        exam_id: examId,
        question_id: q.id,
        exam_section_id: sectionId || null,
        order_index: idx,
        marks: q.marks,
        negative_marks: q.negative_marks
      }));

      const {error: mappingError} = await db.examQuestions().insert(examQuestionsRows);
      if (mappingError) throw mappingError;

      Alert.alert('Success', `Exam and ${allQuestions.length} questions created successfully.`);
      navigation.goBack();
    } catch (err: any) {
      console.error('Save exam error:', err);
      Alert.alert('Error', err.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>Create Exam</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Exam Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Weekly Math Test"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Exam Type Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Exam Type</Text>
          <View style={styles.selectors}>
            {EXAM_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[styles.selectorCell, examType === type.id && styles.selectorSelected]}
                onPress={() => setExamType(type.id)}>
                <Text style={[styles.selectorText, examType === type.id && styles.selectorTextSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Scheduled Date *</Text>
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}>
            <Text style={[styles.inputText, !scheduledDate && styles.inputPlaceholder]}>
              {scheduledDate ? getDisplayDate(scheduledDate) : 'Select Date'}
            </Text>
            <Text style={styles.inputIcon}>📅</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
            <Text style={styles.label}>Start Time *</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowStartTimePicker(true)}
              activeOpacity={0.7}>
              <Text style={[styles.inputText, !startTime && styles.inputPlaceholder]}>
                {startTime ? formatTo12Hour(startTime) : 'Select Start Time'}
              </Text>
              <Text style={styles.inputIcon}>🕒</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowEndTimePicker(true)}
              activeOpacity={0.7}>
              <Text style={[styles.inputText, !endTime && styles.inputPlaceholder]}>
                {endTime ? formatTo12Hour(endTime) : 'Select End Time'}
              </Text>
              <Text style={styles.inputIcon}>🕒</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
            <Text style={styles.label}>Duration (mins) *</Text>
            <View style={[styles.inputContainer, styles.disabledInput]}>
              <Text style={styles.inputText}>
                {duration || '0'}
              </Text>
            </View>
          </View>
          <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
            <Text style={styles.label}>Total Marks *</Text>
            <TextInput
              style={styles.input}
              value={totalMarks}
              onChangeText={setTotalMarks}
              placeholder="100"
              keyboardType="number-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
            <Text style={styles.label}>Questions *</Text>
            <TextInput
              style={styles.input}
              value={totalQuestions}
              onChangeText={setTotalQuestions}
              placeholder="50"
              keyboardType="number-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Question Source Tabs */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Questions Source *</Text>
          <View style={styles.selectors}>
            <TouchableOpacity
              style={[styles.selectorCell, questionSource === 'csv' && styles.selectorSelected]}
              onPress={() => {
                setQuestionSource('csv');
                setParsedQuestions([]);
                setTotalQuestions('');
                setTotalMarks('');
                setQuestionsFile(null);
              }}>
              <Text style={[styles.selectorText, questionSource === 'csv' && styles.selectorTextSelected]}>
                📤 Upload CSV (Excel)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorCell, questionSource === 'bank' && styles.selectorSelected]}
              onPress={() => {
                setQuestionSource('bank');
                setParsedQuestions([]);
                setTotalQuestions('');
                setTotalMarks('');
                setQuestionsFile(null);
              }}>
              <Text style={[styles.selectorText, questionSource === 'bank' && styles.selectorTextSelected]}>
                📁 Select from Bank
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {questionSource === 'csv' ? (
          <View style={styles.csvUploadBox}>
            <Text style={styles.guidelineText}>
              Copy columns from your Excel sheet and paste as CSV here. Column format:{"\n"}
              <Text style={styles.boldText}>Subject_Code, Question_Text, Option_A, Option_B, Option_C, Option_D, Correct_Answer, Marks, Difficulty</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.csvTextArea]}
              value={csvText}
              onChangeText={setCsvText}
              placeholder="PHY,What is the value of gravity?,9.8,10,12,0,A,1,easy"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
            />
            <TouchableOpacity style={styles.parseBtn} onPress={handleParseQuestionsCSV}>
              <Text style={styles.parseBtnText}>Parse & Validate CSV</Text>
            </TouchableOpacity>
            
            {parsedQuestions.length > 0 && (
              <View style={styles.parsedSummary}>
                <Text style={styles.parsedSummaryText}>
                  ✅ Successfully parsed {parsedQuestions.length} questions!
                </Text>
                <ScrollView style={styles.parsedPreviewList} nestedScrollEnabled={true}>
                  {parsedQuestions.slice(0, 5).map((q, idx) => (
                    <View key={idx} style={styles.parsedPreviewItem}>
                      <Text style={styles.parsedPreviewText} numberOfLines={1}>
                        Q{idx+1}: {q.question_text}
                      </Text>
                    </View>
                  ))}
                  {parsedQuestions.length > 5 && (
                    <Text style={styles.moreQuestionsText}>
                      + {parsedQuestions.length - 5} more questions...
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.formGroup}>
            <TouchableOpacity
              style={[
                styles.uploadContainer,
                questionsFile ? styles.uploadSuccessBorder : null
              ]}
              onPress={openQuestionSelector}
              activeOpacity={0.8}>
              <Text style={styles.uploadBtnIcon}>{questionsFile ? '✅' : '📁'}</Text>
              <View style={{flex: 1, marginLeft: Spacing.sm}}>
                <Text style={styles.uploadTitle}>
                  {questionsFile ? questionsFile : 'Choose from Question Bank'}
                </Text>
                <Text style={styles.uploadSubtitle}>
                  {questionsFile
                    ? `${totalQuestions || '0'} questions ready to be linked`
                    : 'Click to select questions from bank'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Exam Settings</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Randomize Questions</Text>
          <Switch
            value={randomizeQuestions}
            onValueChange={setRandomizeQuestions}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Allow Reattempt</Text>
          <Switch
            value={allowReattempt}
            onValueChange={setAllowReattempt}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Negative Marking</Text>
          <Switch
            value={negativeMarking}
            onValueChange={setNegativeMarking}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Show Score Immediately</Text>
          <Switch
            value={showScoreImmediately}
            onValueChange={setShowScoreImmediately}
            trackColor={{false: Colors.border, true: Colors.success}}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}>
          <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.saveBtnGradient}>
            <Text style={styles.saveBtnText}>
              {saving ? t('common.loading') : 'Create Exam'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={scheduledDate}
        onSelect={setScheduledDate}
      />

      <TimePickerModal
        visible={showStartTimePicker}
        onClose={() => setShowStartTimePicker(false)}
        selectedTime={startTime}
        onSelect={setStartTime}
        title="Select Start Time"
      />

      <TimePickerModal
        visible={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        selectedTime={endTime}
        onSelect={setEndTime}
        title="Select End Time"
      />

      {/* Select Questions Modal */}
      <Modal
        visible={showQuestionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuestionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Questions</Text>
              <TouchableOpacity onPress={() => setShowQuestionModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={dbQuestions}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({item}) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedIds(prev =>
                        prev.includes(item.id)
                          ? prev.filter(id => id !== item.id)
                          : [...prev, item.id]
                      );
                    }}
                    activeOpacity={0.8}>
                    <View style={styles.modalItemHeader}>
                      <Text style={styles.modalItemSubject}>{item.subject?.name}</Text>
                      <Text style={styles.modalItemMarks}>+{item.marks} M</Text>
                    </View>
                    <Text style={styles.modalItemText} numberOfLines={2}>{item.question_text}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => handleConfirmQuestions(selectedIds)}>
              <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>Confirm Selection ({selectedIds.length})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.white},
  closeBtn: {padding: 8},
  closeText: {color: Colors.white, fontSize: 18, fontWeight: 'bold'},
  scroll: {padding: Spacing.base, paddingBottom: 40},
  formGroup: {marginBottom: Spacing.md},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  label: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6},
  input: {height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  selectors: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  selectorCell: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border},
  selectorSelected: {backgroundColor: Colors.primarySurface, borderColor: Colors.primaryBorder},
  selectorText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  selectorTextSelected: {color: Colors.primary, fontFamily: FontFamily.bold},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.md},
  settingRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  settingLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  saveBtn: {borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.xl},
  saveBtnGradient: {height: 48, alignItems: 'center', justifyContent: 'center'},
  saveBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white},
  inputContainer: {
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  inputPlaceholder: {
    color: Colors.textMuted,
  },
  inputIcon: {
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: Colors.surfaceVariant,
    borderColor: Colors.borderLight,
  },
  uploadContainer: {
    height: 64,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  uploadSuccessBorder: {
    borderColor: Colors.success,
    backgroundColor: Colors.successSurface,
  },
  uploadBtnIcon: {
    fontSize: 24,
  },
  uploadTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  uploadSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '80%',
    padding: Spacing.base,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  modalList: {
    paddingBottom: Spacing.base,
  },
  modalItem: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  modalItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalItemSubject: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  modalItemMarks: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.success,
  },
  modalItemText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  modalConfirmBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
  },
  csvUploadBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  boldText: {
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  guidelineText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  csvTextArea: {
    height: 120,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  parseBtn: {
    height: 40,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  parseBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  parsedSummary: {
    backgroundColor: Colors.successSurface,
    borderColor: Colors.successBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  parsedSummaryText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.successDark,
    marginBottom: 4,
  },
  parsedPreviewList: {
    maxHeight: 100,
  },
  parsedPreviewItem: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  parsedPreviewText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  moreQuestionsText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CreateExamScreen;
