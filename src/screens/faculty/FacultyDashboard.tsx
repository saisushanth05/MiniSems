// Mini Sems — Faculty Dashboard Screen

import React, {useState, useEffect, useCallback} from 'react';
import {Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {StatCard, AnalyticsCard} from '@components/common/AnalyticsCard';
import {ExamCard} from '@components/exam/ExamCard';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import type {Exam} from '@apptypes/database.types';
import {useTranslation} from 'react-i18next';
import {LanguageSwitcher} from '@components/common/LanguageSwitcher';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '@apptypes/navigation.types';

const FacultyDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({questionCount: 0, avgScore: 0, highScore: 0, lowScore: 0});

  const fetchData = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      const [examsRes, qCountRes] = await Promise.all([
        db.exams().select('*').eq('college_id', user.collegeId).order('scheduled_date').limit(5),
        db.questions().select('id', {count: 'exact', head: true}).eq('college_id', user.collegeId),
      ]);
      setUpcomingExams((examsRes.data || []) as Exam[]);
      setStats(s => ({...s, questionCount: qCountRes.count || 0}));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId]);

  useEffect(() => {fetchData();}, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />}
        contentContainerStyle={styles.scroll}>
        <LinearGradient colors={Colors.gradients.facultyHeader} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👨‍🏫</Text>
              <Text style={styles.subGreeting}>Faculty Portal</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileAvatarBtn}>
                <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={styles.profileAvatarGradient}>
                  <Text style={styles.profileAvatarText}>{(user?.name || 'F').charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard label="My Questions" value={stats.questionCount} icon="❓" color={Colors.secondary} style={styles.statCard} />
          <StatCard label="Avg Score" value={`${stats.avgScore}%`} icon="📊" color={Colors.success} style={styles.statCard} />
          <StatCard label="Highest Score" value={stats.highScore} icon="🏆" color={Colors.warning} style={styles.statCard} />
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Exams</Text>
          {upcomingExams.map(exam => (
            <ExamCard key={exam.id} exam={exam} variant="compact" showCountdown />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {paddingBottom: 40},
  header: {padding: Spacing.base, paddingBottom: Spacing.xl},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 8},
  profileAvatarBtn: {width: 36, height: 36, borderRadius: 18, overflow: 'hidden'},
  profileAvatarGradient: {flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'},
  profileAvatarText: {fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.white},
  greeting: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white},
  subGreeting: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)', marginTop: 2},
  statsRow: {flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md},
  statCard: {width: 160},
  section: {padding: Spacing.base},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.md},
});

export default FacultyDashboard;
