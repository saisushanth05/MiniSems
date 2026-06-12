// Mini Sems — Student Dashboard Screen

import React, {useState, useEffect, useCallback} from 'react';
import {
  RefreshControl, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {ExamCard} from '@components/exam/ExamCard';
import {SkeletonExamCard} from '@components/common/SkeletonLoader';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import type {StudentStackParamList} from '@apptypes/navigation.types';
import type {Exam} from '@apptypes/database.types';
import {useTranslation} from 'react-i18next';
import {LanguageSwitcher} from '@components/common/LanguageSwitcher';

type Nav = NativeStackNavigationProp<StudentStackParamList, 'StudentDashboard'>;

const StudentDashboard: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [completedExams, setCompletedExams] = useState<Exam[]>([]);

  const fetchExams = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      const {data} = await db.exams()
        .select('*')
        .eq('college_id', user.collegeId)
        .in('status', ['published', 'active', 'completed'])
        .order('scheduled_date', {ascending: true});

      const all = (data || []) as Exam[];
      setUpcomingExams(all.filter(e => e.status !== 'completed'));
      setCompletedExams(all.filter(e => e.status === 'completed').slice(0, 5));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId]);

  useEffect(() => {fetchExams();}, [fetchExams]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchExams();}} />}
        contentContainerStyle={styles.scroll}>

        {/* Header */}
        <LinearGradient colors={[...Colors.gradients.studentHeader]} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
              <Text style={styles.subGreeting}>Ready for today's exam?</Text>
            </View>
            <View style={styles.headerRight}>
              <LanguageSwitcher compact />
              <TouchableOpacity onPress={() => navigation.navigate('MyPerformance')} style={styles.performanceBtn}>
                <Text style={styles.performanceBtnText}>📈</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Student info chip */}
          <View style={styles.studentChip}>
            <Text style={styles.chipText}>🎫 {user?.rollNumber || 'Student'}</Text>
          </View>
        </LinearGradient>

        {/* Upcoming Exams */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('studentExam.upcomingExams')}</Text>
          {loading ? (
            <><SkeletonExamCard /><SkeletonExamCard /></>
          ) : upcomingExams.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>{t('studentExam.noUpcomingExams')}</Text>
            </View>
          ) : (
            upcomingExams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                showCountdown
                variant={exam.status === 'active' ? 'featured' : 'default'}
                onPress={() => {
                  if (exam.status === 'active' || exam.status === 'published') {
                    navigation.navigate('ExamLobby', {examId: exam.id});
                  }
                }}
              />
            ))
          )}
        </View>

        {/* Recent Results */}
        {completedExams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Results</Text>
            {completedExams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                variant="compact"
                onPress={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {paddingBottom: 40},
  header: {padding: Spacing.base, paddingBottom: Spacing.xl},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md},
  greeting: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white},
  subGreeting: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)', marginTop: 2},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 8},
  performanceBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center'},
  performanceBtnText: {fontSize: 18},
  studentChip: {backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)'},
  chipText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.white},
  section: {padding: Spacing.base, marginTop: Spacing.sm},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.md},
  emptyCard: {alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, ...Shadow.sm},
  emptyIcon: {fontSize: 32, marginBottom: 8},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
});

export default StudentDashboard;
