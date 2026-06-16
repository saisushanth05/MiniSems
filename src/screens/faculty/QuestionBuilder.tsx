// Mini Sems — Question Builder Screen
// Enables manual entry and bulk CSV pasting of questions, saving them directly to Supabase.

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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {StatusBadge} from '@components/common/Badges';

const QuestionBuilder: React.FC = () => {
  const {user} = useAuthStore();
  const [activeTab, setActiveTab] = useState<'bank' | 'add' | 'bulk'>('bank');
  
  // List states
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);

  // Dropdowns
  const [subjects, setSubjects] = useState<any[]>([]);

  // Manual Form States
  const [subjectId, setSubjectId] = useState('');
  const [qType, setQType] = useState<'mcq' | 'true_false'>('mcq');
  const [qText, setQText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(''); // 'A', 'B', 'C', 'D' or 'True', 'False'
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [marks, setMarks] = useState('1');
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk States
  const [csvText, setCsvText] = useState('');
  const [bulkReport, setBulkReport] = useState<string | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  // ── Fetch questions & subjects ──
  const loadData = useCallback(async () => {
    if (!user?.collegeId || !user?.facultyId) return;
    setLoading(true);
    try {
      const [questionsRes, subjectsRes] = await Promise.all([
        db.questions()
          .select('*, subject:subjects(name)')
          .eq('created_by', user.facultyId)
          .order('created_at', {ascending: false}),
        db.subjects()
          .select('*')
          .eq('college_id', user.collegeId)
          .eq('is_active', true),
      ]);

      if (questionsRes.data) setQuestions(questionsRes.data);
      if (subjectsRes.data) {
        setSubjects(subjectsRes.data);
        if (subjectsRes.data.length > 0) setSubjectId(subjectsRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Delete Question ──
  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question? It will be permanently removed from the bank.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const {error} = await db.questions().delete().eq('id', id);
              if (error) throw error;
              Alert.alert('Success', 'Question deleted successfully.');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete question.');
            }
          },
        },
      ],
    );
  };

  // ── Manual Question Save ──
  const handleSaveQuestion = async () => {
    if (!qText || !subjectId || !correctAnswer || !marks) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    if (qType === 'mcq' && (!optionA || !optionB || !optionC || !optionD)) {
      Alert.alert('Validation Error', 'Please fill in all options for MCQ.');
      return;
    }

    setSaving(true);
    try {
      const {error} = await db.questions().insert({
        college_id: user?.collegeId,
        created_by: user?.facultyId,
        subject_id: subjectId,
        type: qType,
        question_text: qText,
        option_a: qType === 'mcq' ? optionA : 'True',
        option_b: qType === 'mcq' ? optionB : 'False',
        option_c: qType === 'mcq' ? optionC : null,
        option_d: qType === 'mcq' ? optionD : null,
        correct_answer: correctAnswer,
        correct_answer_explanation: explanation,
        difficulty,
        marks: parseFloat(marks),
        negative_marks: 0.0,
      });

      if (error) throw error;

      Alert.alert('Success', 'Question created successfully.');
      // Reset form
      setQText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectAnswer('');
      setExplanation('');
      // Reload
      loadData();
      setActiveTab('bank');
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  // ── Parse Pasted CSV ──
  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').map(line => line.trim()).filter(Boolean);
    const parsedRows = [];
    
    // Simple CSV parser ignoring comma inside quotes
    for (let i = 0; i < lines.length; i++) {
      if (i === 0) continue; // Skip header row
      
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

  // ── Bulk Upload Handler ──
  const handleBulkUpload = async () => {
    if (!csvText.trim()) {
      Alert.alert('Error', 'Please paste CSV content first.');
      return;
    }

    setUploadingBulk(true);
    setBulkReport(null);
    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        throw new Error('No valid rows found. Please check format & headers.');
      }

      // Pre-load subjects to match codes
      const subjectMap = subjects.reduce((acc, sub) => {
        acc[sub.code.toUpperCase()] = sub.id;
        return acc;
      }, {} as Record<string, string>);

      const questionsToInsert: any[] = [];
      let skippedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const subjectCode = row[0].toUpperCase();
        const subId = subjectMap[subjectCode];
        
        if (!subId) {
          skippedCount++;
          continue;
        }

        const questionText = row[1];
        const optA = row[2];
        const optB = row[3];
        const optC = row[4];
        const optD = row[5];
        const correctAns = row[6].toUpperCase();
        const rowMarks = parseFloat(row[7]) || 1.0;
        const rowDiff = (row[8]?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard';

        questionsToInsert.push({
          college_id: user?.collegeId,
          created_by: user?.facultyId,
          subject_id: subId,
          type: 'mcq',
          question_text: questionText,
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_answer: correctAns,
          difficulty: rowDiff,
          marks: rowMarks,
          negative_marks: 0.0,
        });
      }

      if (questionsToInsert.length > 0) {
        const {error} = await db.questions().insert(questionsToInsert);
        if (error) throw error;
        
        setBulkReport(`Import Report: Successfully uploaded ${questionsToInsert.length} questions. Skipped ${skippedCount} rows due to unmatched subject codes.`);
        setCsvText('');
        loadData();
      } else {
        throw new Error('Zero questions imported. Verify that subject codes (e.g. PHY, MATH, CHEM) exist in this college.');
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Error processing CSV.');
    } finally {
      setUploadingBulk(false);
    }
  };

  const renderQuestionItem = ({item}: {item: any}) => (
    <View style={styles.questionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View style={styles.subjectBadge}>
            <Text style={styles.subjectBadgeText}>{item.subject?.name || 'Subject'}</Text>
          </View>
          <Text style={styles.cardMarks}>+{item.marks} M</Text>
        </View>
        <StatusBadge
          label={item.difficulty}
          color={
            item.difficulty === 'easy' ? Colors.success :
            item.difficulty === 'medium' ? Colors.warning : Colors.danger
          }
        />
      </View>
      <Text style={styles.questionText}>{item.question_text}</Text>
      
      {item.type === 'mcq' && (
        <View style={styles.optionsList}>
          <Text style={styles.optionItem}><Text style={styles.boldText}>A:</Text> {item.option_a}</Text>
          <Text style={styles.optionItem}><Text style={styles.boldText}>B:</Text> {item.option_b}</Text>
          <Text style={styles.optionItem}><Text style={styles.boldText}>C:</Text> {item.option_c}</Text>
          <Text style={styles.optionItem}><Text style={styles.boldText}>D:</Text> {item.option_d}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.answerText}>Correct: {item.correct_answer}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteBtnText}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.facultyHeader} style={styles.header}>
        <Text style={styles.title}>Question Builder</Text>
        <Text style={styles.subtitle}>Build and manage your college question bank</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          {id: 'bank', label: 'My Bank', icon: '📁'},
          {id: 'add', label: 'Add Question', icon: '➕'},
          {id: 'bulk', label: 'Bulk Upload', icon: '📤'},
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.id as any)}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'bank' && (
          loading ? (
            <ActivityIndicator size="large" color={Colors.secondary} style={{marginTop: 40}} />
          ) : (
            <FlatList
              data={questions}
              renderItem={renderQuestionItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyText}>You haven't uploaded any questions yet.</Text>
                </View>
              )}
            />
          )
        )}

        {activeTab === 'add' && (
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Subject *</Text>
              <View style={styles.selectorRow}>
                {subjects.map(subj => (
                  <TouchableOpacity
                    key={subj.id}
                    style={[styles.selectorBtn, subjectId === subj.id && styles.selectorBtnActive]}
                    onPress={() => setSubjectId(subj.id)}>
                    <Text style={[styles.selectorBtnText, subjectId === subj.id && styles.selectorBtnTextActive]}>
                      {subj.name} ({subj.code})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Question Type</Text>
              <View style={styles.row}>
                {(['mcq', 'true_false'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, qType === type && styles.typeBtnActive]}
                    onPress={() => {
                      setQType(type);
                      setCorrectAnswer('');
                    }}>
                    <Text style={[styles.typeBtnText, qType === type && styles.typeBtnTextActive]}>
                      {type === 'mcq' ? 'Multiple Choice (MCQ)' : 'True / False'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Question Text *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={qText}
                onChangeText={setQText}
                placeholder="Enter the question text here..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            {qType === 'mcq' ? (
              <>
                <View style={styles.row}>
                  <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
                    <Text style={styles.label}>Option A *</Text>
                    <TextInput style={styles.input} value={optionA} onChangeText={setOptionA} placeholder="Option A" placeholderTextColor={Colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
                    <Text style={styles.label}>Option B *</Text>
                    <TextInput style={styles.input} value={optionB} onChangeText={setOptionB} placeholder="Option B" placeholderTextColor={Colors.textMuted} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
                    <Text style={styles.label}>Option C *</Text>
                    <TextInput style={styles.input} value={optionC} onChangeText={setOptionC} placeholder="Option C" placeholderTextColor={Colors.textMuted} />
                  </View>
                  <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
                    <Text style={styles.label}>Option D *</Text>
                    <TextInput style={styles.input} value={optionD} onChangeText={setOptionD} placeholder="Option D" placeholderTextColor={Colors.textMuted} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Correct Answer *</Text>
                  <View style={styles.selectorRow}>
                    {(['A', 'B', 'C', 'D'] as const).map(ans => (
                      <TouchableOpacity
                        key={ans}
                        style={[styles.ansBtn, correctAnswer === ans && styles.ansBtnActive]}
                        onPress={() => setCorrectAnswer(ans)}>
                        <Text style={[styles.ansBtnText, correctAnswer === ans && styles.ansBtnTextActive]}>
                          Option {ans}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Correct Answer *</Text>
                <View style={styles.row}>
                  {(['True', 'False'] as const).map(ans => (
                    <TouchableOpacity
                      key={ans}
                      style={[styles.typeBtn, correctAnswer === ans && styles.typeBtnActive]}
                      onPress={() => setCorrectAnswer(ans)}>
                      <Text style={[styles.typeBtnText, correctAnswer === ans && styles.typeBtnTextActive]}>
                        {ans}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.formGroup, {flex: 1, marginRight: Spacing.sm}]}>
                <Text style={styles.label}>Difficulty</Text>
                <View style={styles.diffRow}>
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <TouchableOpacity
                      key={diff}
                      style={[styles.diffBtn, difficulty === diff && styles.diffBtnActive]}
                      onPress={() => setDifficulty(diff)}>
                      <Text style={[styles.diffBtnText, difficulty === diff && styles.diffBtnTextActive]}>
                        {diff.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.formGroup, {flex: 1, marginLeft: Spacing.sm}]}>
                <Text style={styles.label}>Marks *</Text>
                <TextInput
                  style={styles.input}
                  value={marks}
                  onChangeText={setMarks}
                  placeholder="1.0"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Explanation (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={explanation}
                onChangeText={setExplanation}
                placeholder="Explain the solution..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveQuestion}
              disabled={saving}
              style={styles.saveBtn}
              activeOpacity={0.85}>
              <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>
                  {saving ? 'Creating Question...' : 'Add Question to Bank'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}

        {activeTab === 'bulk' && (
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.instructionsHeader}>CSV Upload Guidelines</Text>
            <Text style={styles.instructionsText}>
              Paste raw CSV data matching the following headers:{"\n"}
              <Text style={styles.boldText}>Subject_Code,Question_Text,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Marks,Difficulty</Text>{"\n"}
              {"\n"}
              Ensure subject codes match subject codes in your college database (e.g. MATH, PHY, CHEM). Difficulty should be easy, medium, or hard.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Paste CSV Data *</Text>
              <TextInput
                style={[styles.input, styles.csvTextArea]}
                value={csvText}
                onChangeText={setCsvText}
                placeholder="PHY,What is value of gravity?,9.8,10,12,0,A,1,easy"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={8}
              />
            </View>

            {bulkReport && (
              <View style={styles.reportBox}>
                <Text style={styles.reportText}>{bulkReport}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleBulkUpload}
              disabled={uploadingBulk}
              style={styles.saveBtn}
              activeOpacity={0.85}>
              <LinearGradient colors={Colors.gradients.successGreen} style={styles.saveBtnGradient}>
                <Text style={styles.saveBtnText}>
                  {uploadingBulk ? 'Parsing & Uploading...' : 'Parse & Bulk Import'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, paddingBottom: Spacing.md},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.white},
  subtitle: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2},
  tabContainer: {flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  tabButton: {flex: 1, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent'},
  tabButtonActive: {borderBottomColor: Colors.secondary},
  tabIcon: {fontSize: 18, marginBottom: 2},
  tabLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textTertiary},
  tabLabelActive: {fontFamily: FontFamily.bold, color: Colors.secondary},
  content: {flex: 1},
  list: {padding: Spacing.base, paddingBottom: 40},
  questionCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.sm},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  badgeRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  subjectBadge: {backgroundColor: Colors.primarySurface, borderRadius: BorderRadius.md, paddingHorizontal: 8, paddingVertical: 4},
  subjectBadgeText: {fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.primary},
  cardMarks: {fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.success},
  questionText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: Spacing.md, lineHeight: 20},
  optionsList: {backgroundColor: Colors.background, padding: Spacing.sm, borderRadius: BorderRadius.lg, gap: 6, marginBottom: Spacing.md},
  optionItem: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  boldText: {fontFamily: FontFamily.bold, color: Colors.textPrimary},
  cardFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.sm},
  answerText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.primary},
  deleteBtn: {paddingHorizontal: 8, paddingVertical: 4},
  deleteBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.danger},
  emptyContainer: {alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary, textAlign: 'center'},
  formScroll: {padding: Spacing.base, paddingBottom: 40},
  formGroup: {marginBottom: Spacing.md},
  label: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6},
  input: {height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  textArea: {height: 80, paddingVertical: 10, textAlignVertical: 'top'},
  csvTextArea: {height: 160, paddingVertical: 10, textAlignVertical: 'top', fontFamily: 'monospace'},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  selectorRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  selectorBtn: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border},
  selectorBtnActive: {backgroundColor: Colors.primarySurface, borderColor: Colors.primaryBorder},
  selectorBtnText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  selectorBtnTextActive: {fontFamily: FontFamily.bold, color: Colors.primary},
  typeBtn: {flex: 1, height: 44, borderRadius: BorderRadius.lg, borderColor: Colors.border, borderWidth: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4},
  typeBtnActive: {backgroundColor: Colors.primarySurface, borderColor: Colors.primary},
  typeBtnText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  typeBtnTextActive: {fontFamily: FontFamily.bold, color: Colors.primary},
  ansBtn: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border},
  ansBtnActive: {backgroundColor: Colors.successSurface, borderColor: Colors.success},
  ansBtnText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  ansBtnTextActive: {fontFamily: FontFamily.bold, color: Colors.success},
  diffRow: {flexDirection: 'row', flex: 1, gap: 6},
  diffBtn: {flex: 1, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'},
  diffBtnActive: {backgroundColor: Colors.warningSurface, borderColor: Colors.warning},
  diffBtnText: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary},
  diffBtnTextActive: {fontFamily: FontFamily.bold, color: Colors.warningDark},
  saveBtn: {borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.lg},
  saveBtnGradient: {height: 48, alignItems: 'center', justifyContent: 'center'},
  saveBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white},
  instructionsHeader: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: 8},
  instructionsText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md},
  reportBox: {backgroundColor: Colors.successSurface, borderColor: Colors.successBorder, borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md},
  reportText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.successDark},
});

export default QuestionBuilder;
