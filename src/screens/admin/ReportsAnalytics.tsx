// Mini Sems — Reports & Analytics Screen (Admin)

import React, {useState, useCallback, useEffect} from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {Exam} from '@apptypes/database.types';

const ReportsAnalytics: React.FC = () => {
  const {user} = useAuthStore();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);

  const fetchExams = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      const {data} = await db.exams()
        .select('*, subject:subjects(name)')
        .eq('college_id', user.collegeId)
        .order('created_at', {ascending: false});

      setExams((data || []) as Exam[]);
    } catch (err) {
      console.error('Fetch reports exams error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleExport = (type: string, examId?: string) => {
    console.log('Exporting', type, examId);
    // Skeleton implementation for PDF / Excel downloads
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>{t('reports.title')}</Text>
        <Text style={styles.subtitle}>Institutional performance reporting dashboard</Text>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchExams();}} />}
        contentContainerStyle={styles.scroll}>

        {/* Analytics Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('reports.classHeatmap')}</Text>
            <Text style={styles.cardText}>Visualize scores and pass percentages across all streams and sections.</Text>
            <TouchableOpacity onPress={() => handleExport('heatmap')} style={styles.exportBtn}>
              <Text style={styles.exportBtnText}>📊 View Heatmap</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Exams List for Report Exports */}
        <View style={styles.examsSection}>
          <Text style={styles.sectionTitle}>Exam Reports & Rankings</Text>
          {exams.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No exams found for report generation</Text>
            </View>
          ) : (
            exams.map(exam => (
              <View key={exam.id} style={styles.reportRow}>
                <View style={styles.reportInfo}>
                  <Text style={styles.examName}>{exam.name}</Text>
                  <Text style={styles.examMeta}>
                    Date: {exam.scheduled_date} · Total Marks: {exam.total_marks}
                  </Text>
                </View>
                <View style={styles.reportActions}>
                  <TouchableOpacity
                    onPress={() => handleExport('pdf', exam.id)}
                    style={[styles.actionBtn, styles.pdfBtn]}>
                    <Text style={styles.actionBtnText}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleExport('excel', exam.id)}
                    style={[styles.actionBtn, styles.excelBtn]}>
                    <Text style={styles.actionBtnText}>XLS</Text>
                  </TouchableOpacity>
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
  summarySection: {padding: Spacing.base},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.md},
  card: {backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: BorderRadius.xl, ...Shadow.sm},
  cardTitle: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  cardText: {fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.md},
  exportBtn: {height: 40, backgroundColor: Colors.primarySurface, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primaryBorder},
  exportBtnText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary},
  examsSection: {paddingHorizontal: Spacing.base},
  emptyState: {alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, ...Shadow.sm},
  emptyIcon: {fontSize: 32, marginBottom: 8},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
  reportRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 12, borderRadius: BorderRadius.lg, marginBottom: 12, ...Shadow.sm},
  reportInfo: {flex: 1},
  examName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  examMeta: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2},
  reportActions: {flexDirection: 'row', gap: 6},
  actionBtn: {width: 44, height: 36, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center'},
  pdfBtn: {backgroundColor: Colors.dangerSurface, borderWidth: 1, borderColor: Colors.dangerBorder},
  excelBtn: {backgroundColor: Colors.successSurface, borderWidth: 1, borderColor: Colors.successBorder},
  actionBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.textSecondary},
});

export default ReportsAnalytics;
