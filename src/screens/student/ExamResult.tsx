// Mini Sems — Exam Result Screen

import React, {useState, useEffect} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {RankBadge} from '@components/common/Badges';
import {PercentageCircle} from '@components/common/AnalyticsCard';
import {db} from '@services/supabase';
import type {StudentStackParamList} from '@apptypes/navigation.types';

type Nav = NativeStackNavigationProp<StudentStackParamList, 'ExamResult'>;
type Route = RouteProp<StudentStackParamList, 'ExamResult'>;

const ExamResult: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {sessionId, examId} = route.params;
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const {data} = await db.results()
          .select('*, exam:exams(name, total_marks)')
          .eq('session_id', sessionId)
          .single();
        setResult(data);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [sessionId]);

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    </SafeAreaView>
  );

  const isPassed = result?.percentage >= 40;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Result header */}
        <LinearGradient
          colors={isPassed ? [...Colors.gradients.successGreen] : [...Colors.gradients.dangerRed]}
          style={styles.header}>
          <Text style={styles.resultIcon}>{isPassed ? '🏆' : '📚'}</Text>
          <Text style={styles.resultTitle}>{isPassed ? 'Congratulations!' : 'Better Luck Next Time'}</Text>
          <Text style={styles.examName}>{result?.exam?.name}</Text>
        </LinearGradient>

        {/* Score card */}
        <View style={styles.scoreCard}>
          <PercentageCircle
            percentage={result?.percentage || 0}
            size={120}
            color={isPassed ? Colors.success : Colors.danger}
            label="Score"
          />
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreValue}>{result?.score || 0}</Text>
            <Text style={styles.scoreMax}>out of {result?.max_score || 0}</Text>
            <RankBadge rank={result?.rank || 0} size="lg" style={{marginTop: 8}} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            {label: 'Correct', value: result?.correct_count || 0, color: Colors.success, icon: '✓'},
            {label: 'Wrong', value: result?.wrong_count || 0, color: Colors.danger, icon: '✗'},
            {label: 'Skipped', value: result?.skipped_count || 0, color: Colors.textMuted, icon: '—'},
            {label: 'Section Rank', value: `#${result?.section_rank || 0}`, color: Colors.primary, icon: '🏅'},
          ].map(stat => (
            <View key={stat.label} style={[styles.statItem, {borderColor: stat.color + '40'}]}>
              <Text style={[styles.statIcon, {color: stat.color}]}>{stat.icon}</Text>
              <Text style={[styles.statValue, {color: stat.color}]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.reset({index: 0, routes: [{name: 'StudentDashboard'}]})}
            style={styles.homeBtn}>
            <LinearGradient colors={[...Colors.gradients.primaryBlue]} style={styles.homeBtnGrad}>
              <Text style={styles.homeBtnText}>🏠 Go to Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('MyPerformance')} style={styles.analyticsBtn}>
            <Text style={styles.analyticsBtnText}>📈 View Analytics</Text>
          </TouchableOpacity>
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
  header: {padding: Spacing.xl, paddingBottom: Spacing['3xl'], alignItems: 'center'},
  resultIcon: {fontSize: 64, marginBottom: 12},
  resultTitle: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white, marginBottom: 4},
  examName: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: 'rgba(255,255,255,0.85)', textAlign: 'center'},
  scoreCard: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: Colors.surface, margin: Spacing.base, marginTop: -Spacing.lg, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadow.md},
  scoreDetails: {alignItems: 'center'},
  scoreValue: {fontFamily: FontFamily.black, fontSize: FontSize['4xl'], color: Colors.textPrimary, letterSpacing: -1},
  scoreMax: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: Spacing.base},
  statItem: {flex: 1, minWidth: '45%', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, borderWidth: 1.5, ...Shadow.sm},
  statIcon: {fontSize: 24, marginBottom: 4},
  statValue: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl']},
  statLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2},
  actions: {padding: Spacing.base, gap: 12},
  homeBtn: {borderRadius: BorderRadius.xl, overflow: 'hidden'},
  homeBtnGrad: {height: 56, alignItems: 'center', justifyContent: 'center'},
  homeBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.white},
  analyticsBtn: {height: 52, borderRadius: BorderRadius.xl, borderWidth: 2, borderColor: Colors.primaryBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySurface},
  analyticsBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.primary},
});

export default ExamResult;
