// Mini Sems — Exam Calendar Screen (Admin)

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
import {format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths} from 'date-fns';

const ExamCalendar: React.FC = () => {
  const {user} = useAuthStore();
  const {t} = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchMonthExams = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      const start = startOfMonth(currentMonth).toISOString().split('T')[0];
      const end = endOfMonth(currentMonth).toISOString().split('T')[0];
      
      const {data} = await db.exams()
        .select('*, subject:subjects(name)')
        .eq('college_id', user.collegeId)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date');

      setExams((data || []) as Exam[]);
    } catch (err) {
      console.error('Fetch calendar exams error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId, currentMonth]);

  useEffect(() => {
    fetchMonthExams();
  }, [fetchMonthExams]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getExamsForDay = (date: Date) => {
    return exams.filter(exam => {
      const examDate = new Date(exam.scheduled_date);
      return isSameDay(examDate, date);
    });
  };

  const getExamColor = (type: string) => {
    switch (type) {
      case 'weekly_test': return Colors.weeklyTest;
      case 'unit_test': return Colors.unitTest;
      case 'grand_test': return Colors.grandTest;
      default: return Colors.practiceTest;
    }
  };

  const selectedDayExams = getExamsForDay(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>{t('exam.calendar.title')}</Text>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>▶</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchMonthExams();}} />}
        contentContainerStyle={styles.scroll}>
        
        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {/* Weekday headers */}
          <View style={styles.weekHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekHeaderCell}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.daysGrid}>
            {daysInMonth.map((day, idx) => {
              const dayExams = getExamsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDate(day)}>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isToday && styles.dayNumberToday,
                    ]}>
                    {format(day, 'd')}
                  </Text>
                  
                  {/* Exam Dots */}
                  <View style={styles.dotsContainer}>
                    {dayExams.slice(0, 3).map((exam, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          {backgroundColor: getExamColor(exam.exam_type)},
                        ]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Exams */}
        <View style={styles.examsSection}>
          <Text style={styles.sectionTitle}>
            Exams on {format(selectedDate, 'do MMMM yyyy')}
          </Text>
          
          {selectedDayExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>{t('exam.calendar.noExams')}</Text>
            </View>
          ) : (
            selectedDayExams.map(exam => (
              <View key={exam.id} style={styles.examCard}>
                <View
                  style={[
                    styles.examColorIndicator,
                    {backgroundColor: getExamColor(exam.exam_type)},
                  ]}
                />
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>{exam.name}</Text>
                  <Text style={styles.examMeta}>
                    Subject: {exam.subject?.name || 'Multi-Subject'} · Duration: {exam.duration_minutes}m
                  </Text>
                  <Text style={styles.examTime}>
                    🕒 {exam.start_time} - {exam.end_time}
                  </Text>
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
  monthSelector: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md},
  navBtn: {padding: 8},
  navBtnText: {color: Colors.white, fontSize: 18},
  monthText: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.white},
  scroll: {paddingBottom: 40},
  calendarGrid: {backgroundColor: Colors.surface, padding: 12, margin: Spacing.base, borderRadius: BorderRadius.xl, ...Shadow.sm},
  weekHeaders: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8},
  weekHeaderCell: {fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.textTertiary, width: '14%', textAlign: 'center'},
  daysGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  dayCell: {width: '14.28%', height: 60, alignItems: 'center', justifyContent: 'center', marginVertical: 2, borderRadius: BorderRadius.md},
  dayCellSelected: {backgroundColor: Colors.primarySurface, borderWidth: 1, borderColor: Colors.primaryBorder},
  dayCellToday: {borderWidth: 1.5, borderColor: Colors.secondary},
  dayNumber: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  dayNumberSelected: {fontFamily: FontFamily.bold, color: Colors.primary},
  dayNumberToday: {fontFamily: FontFamily.bold, color: Colors.secondaryDark},
  dotsContainer: {flexDirection: 'row', gap: 2, marginTop: 4},
  dot: {width: 5, height: 5, borderRadius: 2.5},
  examsSection: {paddingHorizontal: Spacing.base},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.md},
  emptyState: {alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, ...Shadow.sm},
  emptyIcon: {fontSize: 32, marginBottom: 8},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
  examCard: {flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, marginBottom: 12, overflow: 'hidden', ...Shadow.sm},
  examColorIndicator: {width: 6},
  examInfo: {flex: 1, padding: 12},
  examName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  examMeta: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2},
  examTime: {fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 4},
});

export default ExamCalendar;
