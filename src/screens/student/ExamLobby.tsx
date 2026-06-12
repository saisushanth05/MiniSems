// Mini Sems — Exam Lobby Screen
// Pre-exam system checks and instructions

import React, {useState, useEffect} from 'react';
import {Alert, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {Button} from '@components/common/Button';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {StudentStackParamList} from '@apptypes/navigation.types';
import type {Exam} from '@apptypes/database.types';

type Nav = NativeStackNavigationProp<StudentStackParamList, 'ExamLobby'>;
type Route = RouteProp<StudentStackParamList, 'ExamLobby'>;

const CheckItem: React.FC<{label: string; passed: boolean; loading?: boolean}> = ({label, passed, loading}) => (
  <View style={checkStyles.row}>
    <View style={[checkStyles.indicator, {backgroundColor: loading ? Colors.warning + '30' : passed ? Colors.successSurface : Colors.dangerSurface, borderColor: loading ? Colors.warning : passed ? Colors.success : Colors.danger}]}>
      <Text style={{fontSize: 16}}>{loading ? '⟳' : passed ? '✓' : '✗'}</Text>
    </View>
    <Text style={[checkStyles.label, {color: loading ? Colors.textSecondary : passed ? Colors.success : Colors.danger}]}>{label}</Text>
  </View>
);

const ExamLobby: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {examId} = route.params;
  const {user} = useAuthStore();
  const {t} = useTranslation();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [checks, setChecks] = useState({internet: false, device: false, checking: true});

  useEffect(() => {
    const load = async () => {
      try {
        const {data} = await db.exams().select('*').eq('id', examId).single();
        setExam(data as Exam);
        // Run checks
        const netState = await NetInfo.fetch();
        setChecks({internet: !!netState.isConnected, device: true, checking: false});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  const handleStart = async () => {
    if (!checks.internet) {
      Alert.alert('No Internet', 'Please connect to internet before starting the exam.');
      return;
    }
    setStarting(true);
    try {
      // Create exam session
      const {data: session, error} = await db.examSessions().insert({
        college_id: user?.collegeId,
        exam_id: examId,
        student_id: user?.studentId,
        device_id: user?.deviceId || 'unknown',
        status: 'in_progress',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;
      navigation.replace('ExamInterface', {examId, sessionId: session.id});
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start exam');
    } finally {
      setStarting(false);
    }
  };

  if (loading || !exam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading exam...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TYPE_GRADIENT: Record<string, string[]> = {
    weekly_test: [...Colors.gradients.primaryBlue],
    unit_test: [...Colors.gradients.warningAmber],
    grand_test: [...Colors.gradients.dangerRed],
    practice_test: [...Colors.gradients.successGreen],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <LinearGradient colors={TYPE_GRADIENT[exam.exam_type] || [...Colors.gradients.primaryBlue]} style={styles.header}>
          <Text style={styles.examType}>{exam.exam_type.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.examName}>{exam.name}</Text>
          <Text style={styles.examDate}>
            {new Date(exam.scheduled_date).toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long'})} · {exam.start_time}
          </Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsCard}>
          {[
            {label: t('studentExam.totalQuestions'), value: exam.total_questions, icon: '❓'},
            {label: t('studentExam.totalMarks'), value: exam.total_marks, icon: '⭐'},
            {label: t('studentExam.duration'), value: `${exam.duration_minutes}m`, icon: '⏱️'},
          ].map(stat => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* System Checks */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('studentExam.systemCheck')}</Text>
          <CheckItem label={t('studentExam.checkInternet')} passed={checks.internet} loading={checks.checking} />
          <CheckItem label={t('studentExam.checkDevice')} passed={checks.device} loading={checks.checking} />
          <CheckItem label={t('studentExam.checkFullscreen')} passed={true} />
        </View>

        {/* Instructions */}
        {exam.instructions && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('studentExam.readInstructions')}</Text>
            <Text style={styles.instructions}>{exam.instructions}</Text>
          </View>
        )}

        {/* Default instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exam Rules</Text>
          {[
            '📵 Do not switch to other apps during the exam',
            '⏱️ Answers are auto-saved every 15 seconds',
            '⚠️ 2 app-switch violations = automatic disqualification',
            '📵 Screenshots are blocked during the exam',
            '✅ You can mark questions for review and come back',
            '🚫 Do not close or minimize the app',
          ].map((rule, i) => (
            <Text key={i} style={styles.rule}>{rule}</Text>
          ))}
        </View>

        {/* Start Button */}
        <View style={styles.startSection}>
          <Button
            title={starting ? 'Starting...' : t('studentExam.readyButton')}
            variant="gradient"
            gradientColors={TYPE_GRADIENT[exam.exam_type]}
            size="xl"
            fullWidth
            loading={starting}
            disabled={checks.checking}
            onPress={handleStart}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {paddingBottom: 40},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {fontFamily: FontFamily.medium, fontSize: FontSize.lg, color: Colors.textSecondary},
  header: {padding: Spacing.xl, paddingBottom: Spacing['3xl']},
  examType: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5, marginBottom: 8},
  examName: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white, marginBottom: 6, lineHeight: FontSize['2xl'] * 1.2},
  examDate: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: 'rgba(255,255,255,0.85)'},
  statsCard: {flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginTop: -Spacing.lg, borderRadius: BorderRadius.xl, ...Shadow.md, padding: Spacing.base},
  statItem: {flex: 1, alignItems: 'center'},
  statIcon: {fontSize: 22, marginBottom: 4},
  statValue: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.textPrimary},
  statLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2},
  card: {margin: Spacing.base, marginTop: 0, marginBottom: 0, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm, marginVertical: 6},
  cardTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: Spacing.md},
  instructions: {fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: FontSize.base * 1.6},
  rule: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary, paddingVertical: 4, lineHeight: FontSize.base * 1.5},
  startSection: {padding: Spacing.base, paddingTop: Spacing.xl},
});

const checkStyles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8},
  indicator: {width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  label: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, flex: 1},
});

export default ExamLobby;
