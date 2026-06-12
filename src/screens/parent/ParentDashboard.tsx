// Mini Sems — Parent Dashboard Screen

import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, RefreshControl, Switch, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {Student, Result} from '@apptypes/database.types';

const ParentDashboard: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuthStore();
  const {t} = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.mobile) return;
    try {
      // Fetch the student linked to this parent's mobile number
      const {data: studentRes} = await db.students()
        .select('*, section:sections(name)')
        .eq('parent_mobile', user.mobile)
        .limit(1)
        .single();
        
      if (studentRes) {
        setStudent(studentRes as Student);
        
        // Fetch student's results
        const {data: resultsRes} = await db.results()
          .select('*, exam:exams(name, scheduled_date)')
          .eq('student_id', studentRes.id)
          .order('computed_at', {ascending: false});
          
        setResults((resultsRes || []) as Result[]);
      }
    } catch (err) {
      console.error('Fetch parent dashboard data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.mobile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleWhatsApp = (value: boolean) => {
    setWhatsappEnabled(value);
    Alert.alert(
      'WhatsApp Updates',
      value ? 'You will receive exam updates and results on WhatsApp.' : 'WhatsApp updates disabled.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[...Colors.gradients.parentHeader]} style={styles.header}>
        <Text style={styles.title}>{t('parent.title')}</Text>
        <Text style={styles.subtitle}>Track your child's academic progress</Text>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />}
        contentContainerStyle={styles.scroll}>

        {/* Student Profile Card */}
        {student && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.studentLabel}>{t('parent.childName')}</Text>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentMeta}>
                Roll Number: {student.roll_number} · Section: {student.section?.name || '—'}
              </Text>
            </View>
          </View>
        )}

        {/* WhatsApp Notification Opt-In */}
        <View style={styles.cardSwitch}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>💬 WhatsApp Notifications</Text>
            <Text style={styles.switchSubtitle}>{t('parent.whatsapp')}</Text>
          </View>
          <Switch
            value={whatsappEnabled}
            onValueChange={toggleWhatsApp}
            trackColor={{false: Colors.border, true: Colors.purpleLight}}
            thumbColor={whatsappEnabled ? Colors.purple : Colors.textMuted}
          />
        </View>

        {/* Performance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('parent.performanceSummary')}</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>
                {results.length > 0 ? `${(results.reduce((acc, r) => acc + r.percentage, 0) / results.length).toFixed(1)}%` : '—'}
              </Text>
              <Text style={styles.statLabel}>Average Score</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>
                {results.length > 0 ? `#${results[0].rank}` : '—'}
              </Text>
              <Text style={styles.statLabel}>Latest Rank</Text>
            </View>
          </View>
        </View>

        {/* Exam History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('parent.lastExams')}</Text>
          {results.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No exam history available.</Text>
            </View>
          ) : (
            results.map(res => (
              <View key={res.id} style={styles.examRow}>
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>{res.exam?.name || 'Exam'}</Text>
                  <Text style={styles.examDate}>{res.exam?.scheduled_date || 'Date'}</Text>
                </View>
                <View style={styles.examScoreContainer}>
                  <Text style={styles.examScore}>{res.score} / {res.max_score}</Text>
                  <Text style={styles.examRank}>Rank: #{res.rank}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, paddingBottom: Spacing.xl},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white},
  subtitle: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2},
  scroll: {paddingBottom: 40},
  profileCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.base, padding: Spacing.base, borderRadius: BorderRadius.xl, ...Shadow.sm},
  avatar: {width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.purpleSurface, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base},
  avatarText: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.purple},
  profileInfo: {flex: 1},
  studentLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textTertiary},
  studentName: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginTop: 2},
  studentMeta: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2},
  cardSwitch: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginBottom: Spacing.base, padding: Spacing.base, borderRadius: BorderRadius.xl, ...Shadow.sm},
  switchTextContainer: {flex: 1, marginRight: Spacing.base},
  switchTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary},
  switchSubtitle: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4},
  section: {paddingHorizontal: Spacing.base, marginBottom: Spacing.base},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: Spacing.md},
  summaryStats: {flexDirection: 'row', gap: 12},
  statCard: {flex: 1, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.xl, alignItems: 'center', ...Shadow.sm},
  statNum: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.purple},
  statLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4},
  emptyState: {alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, ...Shadow.sm},
  emptyIcon: {fontSize: 32, marginBottom: 8},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
  examRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 12, borderRadius: BorderRadius.lg, marginBottom: 12, ...Shadow.sm},
  examInfo: {flex: 1},
  examName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  examDate: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2},
  examScoreContainer: {alignItems: 'flex-end'},
  examScore: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary},
  examRank: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.purple, marginTop: 2},
});

export default ParentDashboard;
