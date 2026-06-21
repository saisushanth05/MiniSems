// Mini Sems — Exam Interface
// MOST IMPORTANT SCREEN — Full security, offline persistence, auto-save

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {CountdownTimer} from '@components/exam/CountdownTimer';
import {QuestionPalette, MiniPalette} from '@components/exam/QuestionPalette';
import {WarningBadge} from '@components/common/Badges';
import {useExamStore} from '@stores/examStore';
import {useAuthStore} from '@stores/authStore';
import {db, supabase} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {StudentStackParamList} from '@apptypes/navigation.types';
import type {ExamQuestion, LocalAnswer} from '@apptypes/exam.types';
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Nav = NativeStackNavigationProp<StudentStackParamList, 'ExamInterface'>;
type Route = RouteProp<StudentStackParamList, 'ExamInterface'>;

const AUTOSAVE_INTERVAL = 15000; // 15 seconds

const ExamInterface: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {examId, sessionId} = route.params;
  const {t} = useTranslation();
  const {user} = useAuthStore();

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Notification permission not granted');
        }
      } catch (e) {
        console.error('Failed to request notification permission:', e);
      }
    };
    requestPermissions();
  }, []);

  const {
    questions,
    answers,
    currentIndex,
    timeRemainingSeconds,
    isSubmitted,
    violationCount,
    isOnline,
    setAnswer,
    toggleMarkReview,
    clearAnswer,
    setCurrentIndex,
    setTimeRemaining,
    setSubmitted,
    incrementViolation,
    setOnline,
    markSynced,
    getQuestionStatus,
    getAttemptedCount,
    persistToMMKV,
  } = useExamStore();

  const [showPalette, setShowPalette] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [exam, setExam] = useState<{name: string; totalQuestions: number; totalMarks: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const violationRef = useRef(violationCount);
  violationRef.current = violationCount;

  // ── Load exam data ──
  useEffect(() => {
    const loadExam = async () => {
      try {
        const {data: examData} = await db.exams()
          .select('name, total_questions, total_marks, duration_minutes')
          .eq('id', examId)
          .single();

        if (examData) {
          setExam({
            name: examData.name,
            totalQuestions: examData.total_questions,
            totalMarks: examData.total_marks,
          });
        }

        // Load questions
        const {data: questionsData} = await db.examQuestions()
          .select('*, question:questions(*)')
          .eq('exam_id', examId)
          .order('order_index');

        if (questionsData) {
          const formattedQuestions: ExamQuestion[] = questionsData.map((eq, i) => ({
            ...eq.question,
            orderIndex: i,
            examQuestionId: eq.id,
            marks: eq.marks,
            negativeMarks: eq.negative_marks,
          }));

          useExamStore.getState().initExam({
            sessionId,
            examId,
            questions: formattedQuestions,
            durationSeconds: (examData?.duration_minutes || 60) * 60,
          });
        }
      } catch (err) {
        console.error('Failed to load exam:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId, sessionId]);

  // ── Prevent back navigation ──
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        t('studentExam.submit'),
        'Do you want to exit? Your answers are saved.',
        [
          {text: t('common.cancel'), style: 'cancel'},
          {text: 'Exit', style: 'destructive', onPress: () => navigation.goBack()},
        ],
      );
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // ── App State detection (tab switch / background) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        handleViolation();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // ── Network monitoring ──
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const nowOnline = !!state.isConnected;
      setOnline(nowOnline);

      if (wasOffline && nowOnline) {
        // Reconnected — sync unsaved answers
        syncAnswers();
      }
    });
    return () => unsubscribe();
  }, [isOnline]);

  // ── Auto-save every 15 seconds ──
  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      setIsAutoSaving(true);
      await syncAnswers();
      setTimeout(() => setIsAutoSaving(false), 1000);
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);

  // ── Sync answers to Supabase ──
  const syncAnswers = useCallback(async () => {
    if (!isOnline) {
      persistToMMKV();
      return;
    }

    const unsyncedAnswers = Object.values(answers).filter(a => !a.isSynced);
    if (unsyncedAnswers.length === 0) return;

    try {
      const rows = unsyncedAnswers.map(a => ({
        college_id: user?.collegeId,
        session_id: sessionId,
        exam_id: examId,
        student_id: user?.studentId,
        question_id: a.questionId,
        selected_option: a.selectedOption,
        text_answer: a.textAnswer,
        is_marked_review: a.isMarkedReview,
        time_spent_seconds: a.timeSpentSeconds,
        answered_at: a.answeredAt ? new Date(a.answeredAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      }));

      await db.studentAnswers().upsert(rows, {onConflict: 'session_id,question_id'});
      markSynced(unsyncedAnswers.map(a => a.questionId));
    } catch {
      // Offline — persist locally
      persistToMMKV();
    }
  }, [answers, isOnline, sessionId, examId, user]);

  // ── Handle security violation ──
  const handleViolation = useCallback(async () => {
    incrementViolation();
    const current = violationRef.current + 1;

    if (current === 1) {
      // Send background warning notification immediately
      Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ ' + t('studentExam.security.warning'),
          body: t('studentExam.security.firstViolation'),
        },
        trigger: null,
      }).catch(err => console.error('Failed to send warning notification:', err));

      Alert.alert(
        '⚠️ ' + t('studentExam.security.warning'),
        t('studentExam.security.firstViolation'),
        [{text: t('common.ok'), style: 'default'}],
      );

      // Log violation
      await db.violations().insert({
        college_id: user?.collegeId,
        session_id: sessionId,
        student_id: user?.studentId,
        exam_id: examId,
        type: 'app_background',
        description: 'App switched to background',
        is_disqualifying: false,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    } else if (current >= 2) {
      // Send background disqualification notification immediately
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🚫 ' + t('studentExam.security.disqualified'),
          body: 'You have been disqualified due to multiple security violations.',
        },
        trigger: null,
      }).catch(err => console.error('Failed to send disqualification notification:', err));

      // Auto-disqualify and submit
      Alert.alert(
        '🚫 Disqualified',
        'Your exam is being automatically submitted because you left the exam screen 2 times.',
        [{text: 'OK', style: 'destructive', onPress: handleDisqualifySubmit}],
        {cancelable: false},
      );
    }
  }, [violationCount, sessionId, examId, user]);

  // ── Submit exam ──
  const handleSubmit = useCallback(() => {
    const attempted = getAttemptedCount();
    const unanswered = questions.length - attempted;

    Alert.alert(
      t('studentExam.submit'),
      t('studentExam.submitConfirm', {unanswered}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.submit'),
          style: 'destructive',
          onPress: handleAutoSubmit,
        },
      ],
    );
  }, [questions, answers]);

  // ── Compute and save results client-side (guaranteed fallback) ──
  const computeAndSaveResults = useCallback(async () => {
    try {
      const state = useExamStore.getState();
      const currentQuestions = state.questions;
      const currentAnswers = state.answers;

      if (!currentQuestions || currentQuestions.length === 0) return;

      let score = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;
      let maxScore = 0;

      for (const q of currentQuestions) {
        const marks = parseFloat(String(q.marks)) || 1;
        const negMarks = parseFloat(String(q.negativeMarks)) || 0;
        maxScore += marks;
        const selected = currentAnswers[q.id]?.selectedOption;
        const correct = q.correct_answer;

        if (!selected) {
          skippedCount++;
        } else if (selected === correct) {
          score += marks;
          correctCount++;
        } else {
          score = Math.max(0, score - negMarks);
          wrongCount++;
        }
      }

      const percentage = maxScore > 0 ? parseFloat(((score / maxScore) * 100).toFixed(2)) : 0;

      await db.results().upsert(
        {
          college_id: user?.collegeId,
          exam_id: examId,
          student_id: user?.studentId,
          session_id: sessionId,
          score,
          max_score: maxScore,
          percentage,
          rank: 0,
          section_rank: 0,
          correct_count: correctCount,
          wrong_count: wrongCount,
          skipped_count: skippedCount,
          time_taken_seconds: Math.max(0, currentQuestions.length * 60 - timeRemainingSeconds),
          computed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {onConflict: 'exam_id,student_id'},
      );
    } catch (err) {
      console.error('Client-side result computation failed:', err);
    }
  }, [examId, sessionId, user, timeRemainingSeconds]);

  const handleDisqualifySubmit = useCallback(async () => {
    try {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      await syncAnswers();

      await db.examSessions()
        .update({
          status: 'disqualified',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      await db.violations().insert({
        college_id: user?.collegeId,
        session_id: sessionId,
        student_id: user?.studentId,
        exam_id: examId,
        type: 'app_background',
        description: 'App switched to background (Disqualifying)',
        is_disqualifying: true,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // Compute results client-side FIRST (guaranteed — fixes zero-score)
      await computeAndSaveResults();

      // Best-effort edge function call (non-blocking)
      supabase.functions.invoke('compute-results', {body: {sessionId, examId}})
        .catch(e => console.warn('Edge fn (disqualify) non-fatal:', e));

      setSubmitted(true);
      navigation.replace('ExamResult', {sessionId, examId});
    } catch (err) {
      console.error('Disqualify submit error:', err);
      setSubmitted(true);
      navigation.replace('ExamResult', {sessionId, examId});
    }
  }, [syncAnswers, sessionId, examId, user, computeAndSaveResults]);

  const handleAutoSubmit = useCallback(async () => {
    try {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      await syncAnswers();

      await db.examSessions()
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Compute results client-side FIRST (guaranteed — fixes zero-score)
      await computeAndSaveResults();

      // Best-effort edge function call (non-blocking)
      supabase.functions.invoke('compute-results', {body: {sessionId, examId}})
        .catch(e => console.warn('Edge fn (submit) non-fatal:', e));

      setSubmitted(true);
      navigation.replace('ExamResult', {sessionId, examId});
    } catch {
      Alert.alert('Error', 'Failed to submit. Please try again.');
    }
  }, [syncAnswers, sessionId, examId, computeAndSaveResults]);


  // ── Current question ──
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const questionStatus = currentQuestion
    ? getQuestionStatus(currentQuestion.id, currentIndex)
    : 'not_visited';

  // ── Select option ──
  const handleSelectOption = useCallback(
    (option: string) => {
      if (!currentQuestion) return;
      setAnswer(currentQuestion.id, {selectedOption: option});
    },
    [currentQuestion],
  );

  const handleClearResponse = useCallback(() => {
    if (!currentQuestion) return;
    clearAnswer(currentQuestion.id);
  }, [currentQuestion]);

  const handleMarkReview = useCallback(() => {
    if (!currentQuestion) return;
    toggleMarkReview(currentQuestion.id);
  }, [currentQuestion]);

  const isMarkedReview = currentAnswer?.isMarkedReview || false;
  const selectedOption = currentAnswer?.selectedOption;

  if (loading || !exam || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading exam...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.examName} numberOfLines={1}>{exam.name}</Text>
          <View style={styles.topBarMeta}>
            <Text style={styles.metaText}>
              Q{currentIndex + 1}/{questions.length}
            </Text>
            {violationCount > 0 && (
              <WarningBadge count={violationCount} style={{marginLeft: 8}} />
            )}
            {!isOnline && (
              <View style={styles.offlinePill}>
                <Text style={styles.offlinePillText}>📵 Offline</Text>
              </View>
            )}
          </View>
        </View>
        {/* Timer */}
        <CountdownTimer
          totalSeconds={timeRemainingSeconds}
          onTimeUp={handleAutoSubmit}
          onTick={setTimeRemaining}
          compact
        />
      </View>

      {/* ── MINI PALETTE ── */}
      <View style={styles.miniPaletteWrapper}>
        <MiniPalette
          questions={questions.map((q, i) => ({
            index: i,
            questionId: q.id,
            status: getQuestionStatus(q.id, i),
          }))}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
        />
      </View>

      {/* ── QUESTION AREA ── */}
      <ScrollView
        style={styles.questionScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.questionContent}>

        {/* Question header */}
        <View style={styles.questionHeader}>
          <View style={styles.questionNumBadge}>
            <Text style={styles.questionNumText}>Q{currentIndex + 1}</Text>
          </View>
          <View style={styles.questionMeta}>
            <Text style={styles.questionMarks}>+{currentQuestion.marks} Marks</Text>
            {currentQuestion.negativeMarks > 0 && (
              <Text style={styles.questionNegMarks}>
                -{currentQuestion.negativeMarks}
              </Text>
            )}
            <View style={styles.difficultyBadge}>
              <Text style={[
                styles.difficultyText,
                {
                  color:
                    currentQuestion.difficulty === 'easy'
                      ? Colors.success
                      : currentQuestion.difficulty === 'medium'
                      ? Colors.warning
                      : Colors.danger,
                },
              ]}>
                {currentQuestion.difficulty?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Question text */}
        <View style={styles.questionTextContainer}>
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </View>

        {/* MCQ Options */}
        {currentQuestion.type === 'mcq' && (
          <View style={styles.optionsContainer}>
            {(['A', 'B', 'C', 'D'] as const).map(opt => {
              const optionText =
                opt === 'A'
                  ? currentQuestion.option_a
                  : opt === 'B'
                  ? currentQuestion.option_b
                  : opt === 'C'
                  ? currentQuestion.option_c
                  : currentQuestion.option_d;

              if (!optionText) return null;

              const isSelected = selectedOption === opt;

              return (
                <Pressable
                  key={opt}
                  onPress={() => handleSelectOption(opt)}
                  style={[
                    styles.option,
                    isSelected ? styles.optionSelected : null,
                  ]}>
                  <View
                    style={[
                      styles.optionCircle,
                      isSelected ? styles.optionCircleSelected : null,
                    ]}>
                    <Text
                      style={[
                        styles.optionLetter,
                        isSelected ? styles.optionLetterSelected : null,
                      ]}>
                      {opt}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      isSelected ? styles.optionTextSelected : null,
                    ]}>
                    {optionText}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* True/False Options */}
        {currentQuestion.type === 'true_false' && (
          <View style={styles.trueFalseContainer}>
            {(['True', 'False'] as const).map(opt => (
              <Pressable
                key={opt}
                onPress={() => handleSelectOption(opt)}
                style={[
                  styles.trueFalseBtn,
                  selectedOption === opt
                    ? opt === 'True'
                      ? styles.trueFalseBtnTrue
                      : styles.trueFalseBtnFalse
                    : null,
                ]}>
                <Text
                  style={[
                    styles.trueFalseText,
                    selectedOption === opt ? styles.trueFalseTextSelected : null,
                  ]}>
                  {opt === 'True' ? '✓ True' : '✗ False'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── AUTO-SAVE INDICATOR ── */}
      {isAutoSaving && (
        <View style={styles.autoSaveBar}>
          <Text style={styles.autoSaveText}>⟳ {t('studentExam.autoSaving')}</Text>
        </View>
      )}

      {/* ── BOTTOM ACTION BAR ── */}
      <View style={styles.bottomBar}>
        {/* Mark Review */}
        <TouchableOpacity
          onPress={handleMarkReview}
          style={[
            styles.actionBtn,
            isMarkedReview ? styles.actionBtnMarked : null,
          ]}>
          <Text style={[
            styles.actionBtnText,
            {color: isMarkedReview ? Colors.warning : Colors.textSecondary},
          ]}>
            {isMarkedReview ? '★ Marked' : '☆ Mark'}
          </Text>
        </TouchableOpacity>

        {/* Clear */}
        <TouchableOpacity onPress={handleClearResponse} style={styles.actionBtn}>
          <Text style={[styles.actionBtnText, {color: Colors.textSecondary}]}>✕ Clear</Text>
        </TouchableOpacity>

        {/* Palette */}
        <TouchableOpacity
          onPress={() => setShowPalette(true)}
          style={styles.paletteBtn}>
          <Text style={styles.paletteBtnText}>⠿ Palette</Text>
        </TouchableOpacity>

        {/* Navigation */}
        <View style={styles.navBtns}>
          <TouchableOpacity
            onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            style={[styles.navBtn, currentIndex === 0 ? styles.navBtnDisabled : null]}>
            <Text style={styles.navBtnText}>←</Text>
          </TouchableOpacity>
          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity
              onPress={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              style={[styles.navBtn, styles.navBtnPrimary]}>
              <Text style={[styles.navBtnText, {color: Colors.white}]}>→</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.navBtn, styles.navBtnSubmit]}>
              <Text style={[styles.navBtnText, {color: Colors.white, fontSize: FontSize.sm}]}>
                Submit
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── QUESTION PALETTE MODAL ── */}
      <Modal
        visible={showPalette}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPalette(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPalette(false)}>
          <Pressable onPress={() => {}} style={styles.paletteModal}>
            <QuestionPalette
              questions={questions.map((q, i) => ({
                index: i,
                questionId: q.id,
                status: getQuestionStatus(q.id, i),
              }))}
              currentIndex={currentIndex}
              onSelect={idx => {
                setCurrentIndex(idx);
                setShowPalette(false);
              }}
              onClose={() => setShowPalette(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  topBarLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  examName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  topBarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  offlinePill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.dangerSurface,
    borderRadius: BorderRadius.full,
  },
  offlinePillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.danger,
  },
  // Mini palette
  miniPaletteWrapper: {
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  // Question scroll
  questionScroll: {
    flex: 1,
  },
  questionContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  questionNumBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: Spacing.md,
  },
  questionNumText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.white,
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionMarks: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  questionNegMarks: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.danger,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.full,
  },
  difficultyText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    letterSpacing: 0.5,
  },
  questionTextContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  questionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.examQuestion,
    color: Colors.textPrimary,
    lineHeight: FontSize.examQuestion * 1.6,
  },
  // Options
  optionsContainer: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 56,
    ...Shadow.sm,
  },
  optionSelected: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primary,
  },
  optionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  optionLetter: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  optionLetterSelected: {
    color: Colors.white,
  },
  optionText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: FontSize.md * 1.4,
  },
  optionTextSelected: {
    color: Colors.primaryDark,
    fontFamily: FontFamily.semiBold,
  },
  // True/False
  trueFalseContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  trueFalseBtn: {
    flex: 1,
    height: 64,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  trueFalseBtnTrue: {
    backgroundColor: Colors.successSurface,
    borderColor: Colors.success,
  },
  trueFalseBtnFalse: {
    backgroundColor: Colors.dangerSurface,
    borderColor: Colors.danger,
  },
  trueFalseText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  trueFalseTextSelected: {
    color: Colors.textPrimary,
  },
  // Auto-save
  autoSaveBar: {
    backgroundColor: Colors.primarySurface,
    paddingVertical: 5,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoSaveText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.md,
    gap: 8,
  },
  actionBtn: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnMarked: {
    backgroundColor: Colors.warningSurface,
    borderColor: Colors.warningBorder,
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  paletteBtn: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySurface,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  navBtns: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  navBtnSubmit: {
    backgroundColor: Colors.success,
    borderColor: Colors.successDark,
    width: 64,
  },
  navBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  // Palette modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  paletteModal: {
    maxHeight: '80%',
  },
});

export default ExamInterface;
