// Mini Sems — Exam Builder Screen
// Wizard to create an exam header and map selected questions from the question bank.

import React, {useState, useEffect, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {DatePickerModal, TimePickerModal} from '@components/common/DateTimePicker';
import {format, parseISO, isValid} from 'date-fns';

const EXAM_TYPES = [
  {id: 'weekly_test', label: 'Weekly Test'},
  {id: 'unit_test', label: 'Unit Test'},
  {id: 'grand_test', label: 'Grand Test'},
  {id: 'practice_test', label: 'Practice Test'},
];

const ExamBuilder: React.FC = () => {
  const {user} = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<string>('weekly_test');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [targetSections, setTargetSections] = useState<string[]>([]);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [allowReattempt, setAllowReattempt] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  
  // Date/Time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Database resources
  const [sections, setSections] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // CSV states
  const [questionSource, setQuestionSource] = useState<'bank' | 'csv'>('csv');
  const [csvText, setCsvText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // ── Fetch metadata ──
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!user?.collegeId) return;
      try {
        const [sectionsRes, subjectsRes] = await Promise.all([
          db.sections().select('*').eq('college_id', user.collegeId),
          db.subjects().select('*').eq('college_id', user.collegeId).eq('is_active', true)
        ]);
        if (sectionsRes.data) setSections(sectionsRes.data);
        if (subjectsRes.data) setSubjects(subjectsRes.data);
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMetadata();
  }, [user]);

  // ── Calculate duration automatically ──
  useEffect(() => {
    if (startTime && endTime) {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      if (startParts.length >= 2 && endParts.length >= 2) {
        const startMin = startParts[0] * 60 + startParts[1];
        const endMin = endParts[0] * 60 + endParts[1];
        let diff = endMin - startMin;
        if (diff < 0) diff += 24 * 60; // Midnight rollover
        setDuration(diff.toString());
      }
    }
  }, [startTime, endTime]);

  // ── Fetch questions for selection step ──
  const fetchQuestionsForSelection = async () => {
    if (!user?.collegeId) return;
    setLoadingQuestions(true);
    try {
      const {data} = await db.questions()
        .select('*, subject:subjects(name)')
        .eq('college_id', user.collegeId);
      if (data) setQuestions(data);
    } catch (err) {
      console.error('Error loading question bank:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleNextStep = () => {
    if (!name || !scheduledDate || !startTime || !endTime) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    if (targetSections.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one target section.');
      return;
    }
    fetchQuestionsForSelection();
    setStep(2);
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  const getSelectedQuestionsStats = () => {
    if (questionSource === 'csv') {
      const totalMarks = parsedQuestions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);
      return {
        count: parsedQuestions.length,
        marks: totalMarks,
      };
    }
    const selected = questions.filter(q => selectedQuestionIds.includes(q.id));
    const totalMarks = selected.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);
    return {
      count: selected.length,
      marks: totalMarks,
    };
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

      // Build subject lookup map: by code AND by name keywords for flexible matching
      const subjectMap = subjects.reduce((acc, sub) => {
        // Match by code (exact)
        if (sub.code) acc[sub.code.toUpperCase()] = sub.id;
        // Also match by name prefix (first word) — e.g. "Physics" → "PHYSICS"
        if (sub.name) acc[sub.name.toUpperCase()] = sub.id;
        return acc;
      }, {} as Record<string, string>);

      // Common alias map — CSV uses short codes, DB may use full names
      const ALIAS_MAP: Record<string, string[]> = {
        'PHY':  ['PHYSICS', 'PHYSICAL SCIENCE'],
        'MATH': ['MATHEMATICS', 'MATHS', 'MATH'],
        'CHEM': ['CHEMISTRY', 'CHEMICAL SCIENCE'],
        'BIO':  ['BIOLOGY', 'BIOLOGICAL SCIENCE'],
        'ENG':  ['ENGLISH', 'ENGLISH LANGUAGE'],
        'CS':   ['COMPUTER SCIENCE', 'COMPUTERS'],
        'ECO':  ['ECONOMICS', 'ECONOMY'],
        'COM':  ['COMMERCE', 'COMMERCIAL'],
        'TEL':  ['TELUGU'],
        'HIN':  ['HINDI'],
      };

      // Expand alias map into subject lookup
      Object.entries(ALIAS_MAP).forEach(([shortCode, aliases]) => {
        aliases.forEach(alias => {
          if (subjectMap[alias]) {
            // DB has this subject by full name — add short code mapping too
            subjectMap[shortCode] = subjectMap[shortCode] || subjectMap[alias];
          }
        });
      });

      const availableCodes = subjects
        .map(s => [s.code, s.name].filter(Boolean).join(' / '))
        .join(', ');

      const questionsToParse: any[] = [];
      let skippedRows: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const subjectCode = row[0].toUpperCase().trim();
        const subId = subjectMap[subjectCode];
        if (!subId) {
          skippedRows.push(`Row ${i + 1}: subject code "${row[0]}" not found`);
          continue;
        }

        questionsToParse.push({
          college_id: user?.collegeId,
          created_by: user?.facultyId || null,
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
        const skipMsg = skippedRows.length > 0
          ? `\n\nSkipped ${skippedRows.length} rows (unmatched codes).`
          : '';
        Alert.alert('Success', `Parsed ${questionsToParse.length} questions from CSV successfully.${skipMsg}`);
      } else {
        const hint = availableCodes
          ? `\n\nSubjects in DB: ${availableCodes}`
          : '\n\nNo subjects found for this college. Please add subjects first.';
        throw new Error(`No questions matched any subject.${hint}`);
      }
    } catch (err: any) {
      Alert.alert('Parse Failed', err.message || 'Error processing CSV.');
    }
  };

  // ── Save Exam ──
  const handleCreateExam = async () => {
    const stats = getSelectedQuestionsStats();
    if (stats.count === 0) {
      Alert.alert('Error', 'Please select or upload at least one question to include in this exam.');
      return;
    }

    setSaving(true);
    try {
      // 1. Insert Exam record
      const {data: examData, error: examError} = await db.exams().insert({
        college_id: user?.collegeId,
        created_by: user?.facultyId || null,
        name,
        exam_type: examType as any,
        status: 'published', // Publish instantly so it displays on student dashboards
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: parseInt(duration, 10),
        total_marks: stats.marks,
        total_questions: stats.count,
        randomize_questions: randomizeQuestions,
        randomize_options: true,
        show_score_immediately: true,
        allow_reattempt: allowReattempt,
        negative_marking: negativeMarking,
        negative_mark_value: negativeMarking ? 0.25 : 0.0,
        allow_review_marking: true,
        target_sections: targetSections,
      }).select().single();

      if (examError) throw examError;

      const examId = examData.id;

      // 2. Create default exam section mapping
      const {data: sectionData, error: sectionError} = await db.examSections().insert({
        college_id: user?.collegeId,
        exam_id: examId,
        section_name: 'General Section',
        total_questions: stats.count,
        marks_per_question: stats.count > 0 ? parseFloat((stats.marks / stats.count).toFixed(2)) : 1.0,
        negative_marks: negativeMarking ? 0.25 : 0.0,
        order_index: 0,
      }).select().single();

      if (sectionError) throw sectionError;
      const examSectionId = sectionData.id;

      // 3. Insert or map questions
      let allQuestions: any[] = [];
      if (questionSource === 'csv') {
        const {data: questionsData, error: questionsError} = await db.questions().insert(parsedQuestions).select();
        if (questionsError) throw questionsError;
        allQuestions = questionsData || [];
      } else {
        allQuestions = questions.filter(q => selectedQuestionIds.includes(q.id));
      }

      // 4. Map selected questions into exam mapping table
      const mappingRows = allQuestions.map((q, idx) => ({
        college_id: user?.collegeId,
        exam_id: examId,
        question_id: q.id,
        exam_section_id: examSectionId,
        order_index: idx,
        marks: q.marks,
        negative_marks: negativeMarking ? 0.25 : 0.0,
      }));

      const {error: mappingError} = await db.examQuestions().insert(mappingRows);
      if (mappingError) throw mappingError;

      Alert.alert('Success', `Successfully created exam "${name}" with ${stats.count} questions.`);
      
      // Reset form
      setName('');
      setScheduledDate('');
      setStartTime('');
      setEndTime('');
      setTargetSections([]);
      setSelectedQuestionIds([]);
      setParsedQuestions([]);
      setCsvText('');
      setStep(1);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create exam.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSectionSelect = (id: string) => {
    setTargetSections(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

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

  const selectedStats = getSelectedQuestionsStats();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.facultyHeader} style={styles.header}>
        <Text style={styles.title}>Exam Creator</Text>
        <Text style={styles.subtitle}>{step === 1 ? 'Step 1: Exam Settings' : 'Step 2: Add Questions'}</Text>
      </LinearGradient>

      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Exam Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Inter 1st Year Chemistry Unit Test"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

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
            <Text style={styles.label}>Target Sections *</Text>
            <View style={styles.selectors}>
              {sections.map(sect => (
                <TouchableOpacity
                  key={sect.id}
                  style={[styles.selectorCell, targetSections.includes(sect.id) && styles.selectorSelected]}
                  onPress={() => toggleSectionSelect(sect.id)}>
                  <Text style={[styles.selectorText, targetSections.includes(sect.id) && styles.selectorTextSelected]}>
                    {sect.name} ({sect.stream})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Scheduled Date *</Text>
            <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={[styles.inputText, !scheduledDate && styles.inputPlaceholder]}>
                {scheduledDate ? getDisplayDate(scheduledDate) : 'Select Scheduled Date'}
              </Text>
              <Text style={styles.inputIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
              <Text style={styles.label}>Start Time *</Text>
              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowStartTimePicker(true)} activeOpacity={0.7}>
                <Text style={[styles.inputText, !startTime && styles.inputPlaceholder]}>
                  {startTime ? formatTo12Hour(startTime) : 'Select Start Time'}
                </Text>
                <Text style={styles.inputIcon}>🕒</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
              <Text style={styles.label}>End Time *</Text>
              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowEndTimePicker(true)} activeOpacity={0.7}>
                <Text style={[styles.inputText, !endTime && styles.inputPlaceholder]}>
                  {endTime ? formatTo12Hour(endTime) : 'Select End Time'}
                </Text>
                <Text style={styles.inputIcon}>🕒</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration (mins)</Text>
            <View style={[styles.inputContainer, styles.disabledInput]}>
              <Text style={styles.inputText}>{duration || '0'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Exam Settings</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Randomize Question Sequence</Text>
            <Switch
              value={randomizeQuestions}
              onValueChange={setRandomizeQuestions}
              trackColor={{false: Colors.border, true: Colors.secondary}}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Allow Reattempts</Text>
            <Switch
              value={allowReattempt}
              onValueChange={setAllowReattempt}
              trackColor={{false: Colors.border, true: Colors.secondary}}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Negative Marking (1/4th default)</Text>
            <Switch
              value={negativeMarking}
              onValueChange={setNegativeMarking}
              trackColor={{false: Colors.border, true: Colors.secondary}}
            />
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep}>
            <Text style={styles.nextBtnText}>Continue to Question Selection →</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.questionsContainer}>
          {/* Header Stats Bar */}
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>
              Selected: <Text style={styles.boldStatsText}>{selectedStats.count}</Text> Questions
            </Text>
            <Text style={styles.statsText}>
              Total Marks: <Text style={styles.boldStatsText}>{selectedStats.marks}</Text> M
            </Text>
          </View>

          {/* Question Source Tabs */}
          <View style={styles.sourceTabContainer}>
            <TouchableOpacity
              style={[styles.sourceTab, questionSource === 'csv' && styles.sourceTabActive]}
              onPress={() => {
                setQuestionSource('csv');
                setSelectedQuestionIds([]);
                setParsedQuestions([]);
              }}>
              <Text style={[styles.sourceTabText, questionSource === 'csv' && styles.sourceTabTextActive]}>
                📤 Paste CSV (Excel)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sourceTab, questionSource === 'bank' && styles.sourceTabActive]}
              onPress={() => {
                setQuestionSource('bank');
                setSelectedQuestionIds([]);
                setParsedQuestions([]);
              }}>
              <Text style={[styles.sourceTabText, questionSource === 'bank' && styles.sourceTabTextActive]}>
                📁 Question Bank
              </Text>
            </TouchableOpacity>
          </View>

          {questionSource === 'csv' ? (
            <ScrollView contentContainerStyle={styles.csvScrollContainer} showsVerticalScrollIndicator={false}>
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
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            loadingQuestions ? (
              <ActivityIndicator size="large" color={Colors.secondary} style={{marginTop: 40}} />
            ) : (
              <FlatList
                data={questions}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({item}) => {
                  const isSelected = selectedQuestionIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.questionSelectItem, isSelected && styles.questionSelectItemActive]}
                      onPress={() => toggleQuestionSelection(item.id)}
                      activeOpacity={0.8}>
                      <View style={styles.qSelectHeader}>
                        <View style={styles.badgeRow}>
                          <View style={styles.qSubjectBadge}>
                            <Text style={styles.qSubjectBadgeText}>{item.subject?.name}</Text>
                          </View>
                          <Text style={styles.qMarksText}>+{item.marks} Marks</Text>
                        </View>
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                        </View>
                      </View>
                      <Text style={styles.qSelectText} numberOfLines={3}>{item.question_text}</Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>❓</Text>
                    <Text style={styles.emptyText}>No questions found in this college question bank.</Text>
                  </View>
                )}
              />
            )
          )}

          {/* Save/Back actions */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backBtnText}>← Back Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreateExam} disabled={saving}>
              <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>
                  {saving ? 'Creating Exam...' : 'Create & Publish Exam'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Picker Modals */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, paddingBottom: Spacing.md},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.white},
  subtitle: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2},
  scroll: {padding: Spacing.base, paddingBottom: 40},
  formGroup: {marginBottom: Spacing.md},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  label: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6},
  input: {height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  inputContainer: {height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  inputText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  inputPlaceholder: {color: Colors.textMuted},
  inputIcon: {fontSize: 16},
  disabledInput: {backgroundColor: Colors.surfaceVariant, borderColor: Colors.borderLight},
  selectors: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  selectorCell: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border},
  selectorSelected: {backgroundColor: Colors.secondarySurface, borderColor: Colors.secondaryBorder},
  selectorText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  selectorTextSelected: {color: Colors.secondary, fontFamily: FontFamily.bold},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.md},
  settingRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  settingLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  nextBtn: {height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl, ...Shadow.sm},
  nextBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white},
  questionsContainer: {flex: 1},
  statsBar: {flexDirection: 'row', justifyContent: 'space-around', backgroundColor: Colors.surface, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  statsText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  boldStatsText: {fontFamily: FontFamily.bold, color: Colors.secondary, fontSize: FontSize.base},
  list: {padding: Spacing.base, paddingBottom: 100},
  questionSelectItem: {backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm},
  questionSelectItemActive: {borderColor: Colors.secondary, backgroundColor: Colors.secondarySurface + '10'},
  qSelectHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  badgeRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  qSubjectBadge: {backgroundColor: Colors.primarySurface, borderRadius: BorderRadius.md, paddingHorizontal: 8, paddingVertical: 4},
  qSubjectBadgeText: {fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.primary},
  qMarksText: {fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.success},
  checkbox: {width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'},
  checkboxActive: {backgroundColor: Colors.secondary, borderColor: Colors.secondary},
  checkboxTick: {color: Colors.white, fontFamily: FontFamily.bold, fontSize: 12, marginTop: -2},
  qSelectText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20},
  emptyContainer: {alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary, textAlign: 'center'},
  actionBar: {position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', paddingHorizontal: Spacing.base, alignItems: 'center', justifyContent: 'space-between', ...Shadow.lg},
  backBtn: {flex: 1, height: 48, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm},
  backBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.textSecondary},
  saveBtn: {flex: 1.5, borderRadius: BorderRadius.lg, overflow: 'hidden', marginLeft: Spacing.sm},
  saveBtnGradient: {height: 48, alignItems: 'center', justifyContent: 'center'},
  saveBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.white},
  sourceTabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  sourceTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  sourceTabActive: {
    borderBottomColor: Colors.secondary,
  },
  sourceTabText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  sourceTabTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
  },
  csvScrollContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 100,
  },
  csvUploadBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  guidelineText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  boldText: {
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
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

export default ExamBuilder;
