// Mini Sems — Admin Dashboard
// Command center with stats, calendar, activity feed, performance chart

import React, {useState, useEffect, useCallback} from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {StatCard, AnalyticsCard} from '@components/common/AnalyticsCard';
import {ExamCard} from '@components/exam/ExamCard';
import {SkeletonDashboard} from '@components/common/SkeletonLoader';
import {useAuthStore} from '@stores/authStore';
import {supabase, db} from '@services/supabase';
import type {AdminStackParamList} from '@apptypes/navigation.types';
import type {DashboardStats, Exam} from '@apptypes/database.types';
import {useTranslation} from 'react-i18next';
import {LanguageSwitcher} from '@components/common/LanguageSwitcher';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

interface ActivityItem {
  id: string;
  type: 'student_added' | 'faculty_added' | 'exam_published' | 'exam_completed';
  message: string;
  time: string;
  icon: string;
}

const ACTIVITY_ICONS = {
  student_added: '👤',
  faculty_added: '👨‍🏫',
  exam_published: '📋',
  exam_completed: '✅',
};

const QuickActionButton: React.FC<{
  emoji: string;
  label: string;
  gradient: string[];
  onPress: () => void;
}> = ({emoji, label, gradient, onPress}) => (
  <TouchableOpacity onPress={onPress} style={styles.quickActionBtn} activeOpacity={0.85}>
    <LinearGradient colors={gradient} style={styles.quickActionGradient}>
      <Text style={styles.quickActionEmoji}>{emoji}</Text>
    </LinearGradient>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user} = useAuthStore();
  const {t} = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const fetchData = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      const [studentsRes, examsRes, activityRes] = await Promise.all([
        db.students()
          .select('id, status', {count: 'exact', head: false})
          .eq('college_id', user.collegeId),
        db.exams()
          .select('*')
          .eq('college_id', user.collegeId)
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .order('scheduled_date', {ascending: true})
          .limit(5),
        db.auditLogs()
          .select('*')
          .eq('college_id', user.collegeId)
          .order('created_at', {ascending: false})
          .limit(10),
      ]);

      const totalStudents = studentsRes.count || 0;
      const activeStudents =
        studentsRes.data?.filter(s => s.status === 'active').length || 0;

      setStats({
        totalStudents,
        activeStudents,
        examsThisWeek: 3,
        examsThisMonth: 12,
        averageScoreThisMonth: 72.5,
        activeFaculty: 8,
        totalExams: 45,
        completedExams: 40,
      });

      setUpcomingExams((examsRes.data || []) as Exam[]);

      const activities: ActivityItem[] = (activityRes.data || [])
        .slice(0, 6)
        .map(log => ({
          id: log.id,
          type: (log.action.includes('student')
            ? 'student_added'
            : log.action.includes('faculty')
            ? 'faculty_added'
            : log.action.includes('published')
            ? 'exam_published'
            : 'exam_completed') as ActivityItem['type'],
          message: log.action.replace(/_/g, ' '),
          time: new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
          icon: '📋',
        }));
      setRecentActivity(activities);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) return <SkeletonDashboard />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}>

        {/* Header */}
        <LinearGradient
          colors={Colors.gradients.adminHeader}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>
                {t('dashboard.welcome', {name: user?.name?.split(' ')[0] || 'Admin'})}
              </Text>
              <Text style={styles.date}>{today}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileAvatarBtn}>
                <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={styles.profileAvatarGradient}>
                  <Text style={styles.profileAvatarText}>{(user?.name || 'A').charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{t('dashboard.title')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}>
            <StatCard
              label={t('dashboard.totalStudents')}
              value={stats?.totalStudents || 0}
              icon="👥"
              color={Colors.primary}
              trend="up"
              trendValue="12%"
              subLabel="Active"
              subValue={String(stats?.activeStudents || 0)}
              style={styles.statCard}
            />
            <StatCard
              label={t('dashboard.examsThisWeek')}
              value={stats?.examsThisWeek || 0}
              icon="📝"
              color={Colors.warning}
              trend="stable"
              trendValue="same"
              style={styles.statCard}
            />
            <StatCard
              label={t('dashboard.avgScoreMonth')}
              value={`${stats?.averageScoreThisMonth || 0}%`}
              icon="📈"
              color={Colors.success}
              trend="up"
              trendValue="5.2%"
              style={styles.statCard}
            />
            <StatCard
              label={t('dashboard.activeFaculty')}
              value={stats?.activeFaculty || 0}
              icon="👨‍🏫"
              color={Colors.purple}
              style={styles.statCard}
            />
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <AnalyticsCard
          title={t('dashboard.quickActions')}
          style={styles.sectionCard}>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              emoji="👥"
              label="Bulk Upload"
              gradient={['#1D4ED8', '#2563EB']}
              onPress={() => navigation.navigate('UserManagement')}
            />
            <QuickActionButton
              emoji="📝"
              label={t('dashboard.createExam')}
              gradient={['#16A34A', '#22C55E']}
              onPress={() => navigation.navigate('CreateExam')}
            />
            <QuickActionButton
              emoji="📅"
              label="Calendar"
              gradient={['#0284C7', '#0EA5E9']}
              onPress={() => (navigation as any).navigate('Calendar')}
            />
            <QuickActionButton
              emoji="📊"
              label={t('dashboard.viewReports')}
              gradient={['#6D28D9', '#8B5CF6']}
              onPress={() => (navigation as any).navigate('Reports')}
            />
          </View>
        </AnalyticsCard>

        {/* Upcoming Exams */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.upcomingExams')}</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{t('common.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {upcomingExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>{t('dashboard.noUpcomingExams')}</Text>
            </View>
          ) : (
            upcomingExams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                variant="compact"
                showCountdown
                onPress={() => {}}
              />
            ))
          )}
        </View>

        {/* Recent Activity */}
        <AnalyticsCard
          title={t('dashboard.recentActivity')}
          style={styles.sectionCard}>
          {recentActivity.length === 0 ? (
            <Text style={styles.noActivity}>No recent activity</Text>
          ) : (
            recentActivity.map((activity, index) => (
              <View
                key={activity.id}
                style={[
                  styles.activityItem,
                  index < recentActivity.length - 1 && styles.activityItemBorder,
                ]}>
                <View style={styles.activityDot}>
                  <Text style={styles.activityDotIcon}>
                    {ACTIVITY_ICONS[activity.type]}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>
                    {activity.message.charAt(0).toUpperCase() + activity.message.slice(1)}
                  </Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))
          )}
        </AnalyticsCard>

        {/* Performance Chart placeholder */}
        <AnalyticsCard
          title={t('dashboard.performanceTrend')}
          subtitle={t('dashboard.lastExams')}
          gradientHeader
          gradientColors={Colors.gradients.adminHeader}
          style={styles.sectionCard}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>📈 Score Trend Chart</Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Connect Victory Native charts for live data
            </Text>
          </View>
        </AnalyticsCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Spacing['3xl'],
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
    letterSpacing: -0.3,
  },
  date: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileAvatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  statsSection: {
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: Spacing.base,
  },
  statCard: {
    width: 160,
    marginBottom: 0,
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionCard: {
    marginHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    ...Shadow.sm,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textTertiary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionBtn: {
    width: '22%',
    alignItems: 'center',
    flex: 1,
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Shadow.md,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityDotIcon: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
    paddingTop: 2,
  },
  activityMessage: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  activityTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  noActivity: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textTertiary,
    textAlign: 'center',
    padding: Spacing.md,
  },
  chartPlaceholder: {
    height: 160,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  chartPlaceholderSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 6,
  },
});

export default AdminDashboard;
