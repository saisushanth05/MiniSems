// Mini Sems — Results Review Screen (Faculty)

import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView, StyleSheet, Text,
  TouchableOpacity, View, FlatList, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {FacultyStackParamList} from '@apptypes/navigation.types';
import type {Result} from '@apptypes/database.types';

type Route = RouteProp<FacultyStackParamList, 'ResultDetail'>;

const ResultsReview: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  
  const examId = route.params?.examId || 'mock-exam-id';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [examName, setExamName] = useState('Exam Results');

  const fetchResults = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      // Fetch results
      const {data: resultsRes} = await db.results()
        .select('*, student:students(name, roll_number)')
        .eq('exam_id', examId)
        .order('rank', {ascending: true});

      setResults((resultsRes || []) as Result[]);

      // Fetch exam details to show name
      const {data: examRes} = await db.exams()
        .select('name')
        .eq('id', examId)
        .single();
        
      if (examRes) {
        setExamName(examRes.name);
      }
    } catch (err) {
      console.error('Fetch results review error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId, examId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const renderResultItem = ({item}: {item: Result}) => {
    // Determine badge rank colors
    const isTop3 = item.rank <= 3;
    const rankColor = item.rank === 1 ? Colors.rankGold :
                      item.rank === 2 ? Colors.rankSilver :
                      item.rank === 3 ? Colors.rankBronze : Colors.rankOther;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.rankBadge, {backgroundColor: rankColor}]}>
            <Text style={styles.rankBadgeText}>#{item.rank}</Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.student?.name || 'Unknown'}</Text>
            <Text style={styles.rollNumber}>{item.student?.roll_number || '—'}</Text>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            {item.score} <Text style={styles.scoreMax}>/ {item.max_score}</Text>
          </Text>
          <Text style={styles.percentageText}>{item.percentage.toFixed(1)}%</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[...Colors.gradients.facultyHeader]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{examName}</Text>
        <Text style={styles.subtitle}>{t('results.rankList')}</Text>
      </LinearGradient>

      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchResults();}} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>{t('results.noResults') || 'No results computed yet.'}</Text>
          </View>
        )}
      />
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
  list: {padding: Spacing.base, paddingBottom: 40},
  card: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.sm},
  cardLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  rankBadge: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  rankBadgeText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.white},
  studentInfo: {flex: 1},
  studentName: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary},
  rollNumber: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2},
  scoreContainer: {alignItems: 'flex-end'},
  scoreText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary},
  scoreMax: {fontSize: FontSize.xs, color: Colors.textTertiary, fontFamily: FontFamily.regular},
  percentageText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.primary, marginTop: 2},
  empty: {alignItems: 'center', padding: 40},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
});

export default ResultsReview;
