// Mini Sems — Live Exam Monitor (Faculty)

import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView, StyleSheet, Text,
  TouchableOpacity, View, FlatList, RefreshControl, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db, supabase} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import {StatusBadge} from '@components/common/Badges';
import type {FacultyStackParamList} from '@apptypes/navigation.types';
import type {ExamSession} from '@apptypes/database.types';

type Route = RouteProp<FacultyStackParamList, 'ExamMonitor'>;

const LiveExamMonitor: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  
  const examId = route.params?.examId || 'mock-exam-id';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [stats, setStats] = useState({active: 0, submitted: 0, suspicious: 0});

  const fetchLiveSessions = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      const {data} = await db.examSessions()
        .select('*, student:students(name, roll_number)')
        .eq('exam_id', examId)
        .order('last_activity_at', {ascending: false});

      const list = (data || []) as ExamSession[];
      setSessions(list);
      
      const active = list.filter(s => s.status === 'in_progress').length;
      const submitted = list.filter(s => s.status === 'submitted').length;
      const suspicious = list.filter(s => s.violation_count > 0).length;
      
      setStats({active, submitted, suspicious});
    } catch (err) {
      console.error('Fetch live sessions error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId, examId]);

  useEffect(() => {
    fetchLiveSessions();
    
    // In production, subscribe to Realtime updates:
    // const channel = supabase.channel('live-monitor')
    //   .on('postgres_changes', {event: '*', schema: 'public', table: 'exam_sessions', filter: `exam_id=eq.${examId}`}, fetchLiveSessions)
    //   .subscribe();
    // return () => { supabase.removeChannel(channel); };
  }, [fetchLiveSessions]);

  const handleDisqualify = (session: ExamSession) => {
    const studentName = session.student?.name || 'Student';
    Alert.alert(
      t('monitor.disqualify') || 'Disqualify Student',
      t('monitor.disqualifyConfirm', {name: studentName}) || `Are you sure you want to disqualify ${studentName}?`,
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('monitor.disqualify') || 'Disqualify',
          style: 'destructive',
          onPress: async () => {
            try {
              const {error} = await db.examSessions()
                .update({status: 'disqualified'})
                .eq('id', session.id);
                
              if (error) throw error;
              Alert.alert('Success', 'Student disqualified.');
              fetchLiveSessions();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const renderSessionItem = ({item}: {item: ExamSession}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.studentName}>{item.student?.name || 'Unknown'}</Text>
          <Text style={styles.rollNumber}>{item.student?.roll_number || '—'}</Text>
        </View>
        <StatusBadge
          label={item.status}
          color={
            item.status === 'submitted' ? Colors.success :
            item.status === 'disqualified' ? Colors.danger :
            item.violation_count > 0 ? Colors.warning : Colors.primary
          }
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Violations:</Text>
          <Text style={[styles.statValue, item.violation_count > 0 && {color: Colors.danger, fontWeight: 'bold'}]}>
            ⚠️ {item.violation_count}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Last Active:</Text>
          <Text style={styles.statValue}>
            {item.last_activity_at ? new Date(item.last_activity_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '—'}
          </Text>
        </View>
      </View>

      {item.status === 'in_progress' && (
        <TouchableOpacity onPress={() => handleDisqualify(item)} style={styles.disqualifyBtn}>
          <Text style={styles.disqualifyBtnText}>🚨 Disqualify Student</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[...Colors.gradients.facultyHeader]} style={styles.header}>
        <Text style={styles.title}>{t('monitor.title')}</Text>
        
        {/* Live Counters */}
        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.active}</Text>
            <Text style={styles.statTitle}>{t('monitor.activeStudents')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.submitted}</Text>
            <Text style={styles.statTitle}>{t('monitor.submitted')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, stats.suspicious > 0 && {color: Colors.warning}]}>
              {stats.suspicious}
            </Text>
            <Text style={styles.statTitle}>{t('monitor.suspicious')}</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={sessions}
        renderItem={renderSessionItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchLiveSessions();}} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👁️</Text>
            <Text style={styles.emptyText}>No students active in this exam.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, paddingBottom: Spacing.xl},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white},
  statsBar: {flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.xl, padding: Spacing.md, marginTop: Spacing.md},
  statBox: {alignItems: 'center'},
  statNum: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.white},
  statTitle: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2},
  list: {padding: Spacing.base, paddingBottom: 40},
  card: {backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.sm},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  studentName: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary},
  rollNumber: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2},
  divider: {height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.md},
  cardBody: {gap: 6, marginBottom: Spacing.md},
  statRow: {flexDirection: 'row', justifyContent: 'space-between'},
  statLabel: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  statValue: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary},
  disqualifyBtn: {height: 38, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dangerBorder, backgroundColor: Colors.dangerSurface, alignItems: 'center', justifyContent: 'center'},
  disqualifyBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.dangerDark},
  empty: {alignItems: 'center', padding: 40},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
});

export default LiveExamMonitor;
