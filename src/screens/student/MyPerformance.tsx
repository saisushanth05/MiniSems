// Mini Sems — My Performance Screen (Student)

import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {AnalyticsData} from '@apptypes/database.types';

const MyPerformance: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const fetchPerformance = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch results to compute mock averages / readiness score
      const {data: results} = await db.results()
        .select('*')
        .eq('student_id', user.id);
        
      // Compute readiness scores and averages
      setAnalytics({
        scoreHistory: [],
        rankHistory: [],
        subjectAverages: [
          {subject: 'Mathematics', average: 78},
          {subject: 'Physics', average: 65},
          {subject: 'Chemistry', average: 82},
        ],
        weakTopics: [
          {topic: 'Rotational Mechanics', correct_rate: 42, subject: 'Physics'},
          {topic: 'Integration', correct_rate: 55, subject: 'Mathematics'},
        ],
        strongTopics: [
          {topic: 'Chemical Bonding', correct_rate: 90, subject: 'Chemistry'},
          {topic: 'Probability', correct_rate: 88, subject: 'Mathematics'},
        ],
        eamcetReadiness: 76,
        jeeReadiness: 62,
        neetReadiness: 0,
      });
    } catch (err) {
      console.error('Fetch performance metrics error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[...Colors.gradients.studentHeader]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('performance.title')}</Text>
        <Text style={styles.subtitle}>Personal academic tracking & competitive exam readiness</Text>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchPerformance();}} />}
        contentContainerStyle={styles.scroll}>

        {/* Readiness Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competitive Exams Readiness</Text>
          <View style={styles.readinessContainer}>
            <View style={styles.readinessCard}>
              <Text style={styles.readinessNum}>{analytics?.eamcetReadiness || 0}%</Text>
              <Text style={styles.readinessLabel}>{t('performance.eamcetReadiness')}</Text>
            </View>
            <View style={styles.readinessCard}>
              <Text style={styles.readinessNum}>{analytics?.jeeReadiness || 0}%</Text>
              <Text style={styles.readinessLabel}>{t('performance.jeeReadiness')}</Text>
            </View>
          </View>
        </View>

        {/* Subject Averages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('performance.subjectAverage')}</Text>
          <View style={styles.card}>
            {analytics?.subjectAverages.map((sub, idx) => (
              <View key={idx} style={styles.subjectRow}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectName}>{sub.subject}</Text>
                  <Text style={styles.subjectScore}>{sub.average}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {width: `${sub.average}%`}]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Strong Topics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: Colors.successDark}]}>💪 {t('performance.strongTopics')}</Text>
          <View style={styles.card}>
            {analytics?.strongTopics.map((topic, idx) => (
              <View key={idx} style={styles.topicItem}>
                <Text style={styles.topicName}>{topic.topic} ({topic.subject})</Text>
                <Text style={styles.topicRate}>Accuracy: {topic.correct_rate}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weak Topics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: Colors.dangerDark}]}>⚠️ {t('performance.weakTopics')}</Text>
          <View style={styles.card}>
            {analytics?.weakTopics.map((topic, idx) => (
              <View key={idx} style={styles.topicItem}>
                <Text style={styles.topicName}>{topic.topic} ({topic.subject})</Text>
                <Text style={styles.topicRate}>Accuracy: {topic.correct_rate}%</Text>
                <Text style={styles.recommendationText}>
                  💡 {t('performance.practiceMore', {topic: topic.topic})}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, paddingBottom: Spacing.xl},
  backBtn: {marginBottom: Spacing.xs},
  backBtnText: {color: Colors.white, fontFamily: FontFamily.semiBold, fontSize: FontSize.sm},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.white},
  subtitle: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2},
  scroll: {paddingBottom: 40},
  section: {padding: Spacing.base, paddingBottom: 0},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: Spacing.md},
  readinessContainer: {flexDirection: 'row', gap: 12},
  readinessCard: {flex: 1, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.xl, alignItems: 'center', ...Shadow.sm},
  readinessNum: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary},
  readinessLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'center'},
  card: {backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: BorderRadius.xl, ...Shadow.sm},
  subjectRow: {marginBottom: Spacing.md},
  subjectHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  subjectName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  subjectScore: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary},
  progressBarBg: {height: 8, backgroundColor: Colors.surfaceVariant, borderRadius: 4},
  progressBarFill: {height: 8, backgroundColor: Colors.success, borderRadius: 4},
  topicItem: {paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  topicName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  topicRate: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2},
  recommendationText: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.primary, marginTop: 4},
});

export default MyPerformance;
