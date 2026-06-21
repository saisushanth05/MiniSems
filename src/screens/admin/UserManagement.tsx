// Mini Sems — User Management Screen (Admin)
// Create student & faculty accounts so they can log in with OTP

import React, {useState, useEffect, useCallback} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import Toast from 'react-native-toast-message';

type Tab = 'students' | 'faculty';

const STREAMS = ['MPC', 'BiPC', 'MEC', 'CEC', 'HEC'] as const;
const YEARS = [1, 2] as const;

const UserManagement: React.FC = () => {
  const {user} = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Student form fields
  const [stdName, setStdName] = useState('');
  const [stdRoll, setStdRoll] = useState('');
  const [stdMobile, setStdMobile] = useState('');
  const [stdStream, setStdStream] = useState<string>('MPC');
  const [stdYear, setStdYear] = useState<number>(1);
  const [stdParentMobile, setStdParentMobile] = useState('');

  // Faculty form fields
  const [facName, setFacName] = useState('');
  const [facMobile, setFacMobile] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facQualification, setFacQualification] = useState('');

  const collegeId = user?.collegeId;

  const loadData = useCallback(async () => {
    if (!collegeId) return;
    setLoading(true);
    try {
      const [stdRes, facRes] = await Promise.all([
        db.students()
          .select('id, name, roll_number, mobile, stream, year, status, created_at')
          .eq('college_id', collegeId)
          .order('created_at', {ascending: false}),
        db.faculty()
          .select('id, name, mobile, email, qualification, is_active, created_at')
          .eq('college_id', collegeId)
          .order('created_at', {ascending: false}),
      ]);
      setStudents(stdRes.data || []);
      setFaculty(facRes.data || []);
    } catch {
      Toast.show({type: 'error', text1: 'Failed to load users'});
    } finally {
      setLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setStdName(''); setStdRoll(''); setStdMobile(''); setStdStream('MPC');
    setStdYear(1); setStdParentMobile('');
    setFacName(''); setFacMobile(''); setFacEmail(''); setFacQualification('');
  };

  const validatePhone = (phone: string) => /^\d{10}$/.test(phone);

  const handleCreateStudent = async () => {
    if (!stdName.trim() || !stdRoll.trim() || !stdMobile.trim() || !stdParentMobile.trim()) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    if (!validatePhone(stdMobile)) {
      Alert.alert('Invalid Mobile', 'Student mobile must be 10 digits.');
      return;
    }
    if (!validatePhone(stdParentMobile)) {
      Alert.alert('Invalid Mobile', 'Parent mobile must be 10 digits.');
      return;
    }
    setSaving(true);
    try {
      // 1. Create user account (mobile is login credential)
      const {data: userRow, error: userErr} = await db.users().insert({
        college_id: collegeId,
        role: 'student',
        mobile: `+91${stdMobile}`,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select().single();

      if (userErr) throw new Error(userErr.message);

      // 2. Create student record
      const {error: stdErr} = await db.students().insert({
        college_id: collegeId,
        user_id: userRow.id,
        roll_number: stdRoll.trim().toUpperCase(),
        name: stdName.trim(),
        mobile: `+91${stdMobile}`,
        parent_mobile: `+91${stdParentMobile}`,
        stream: stdStream,
        year: stdYear,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (stdErr) throw new Error(stdErr.message);

      Toast.show({type: 'success', text1: '✅ Student Created', text2: `${stdName} can now log in with +91${stdMobile}`});
      resetForm();
      setShowModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFaculty = async () => {
    if (!facName.trim() || !facMobile.trim()) {
      Alert.alert('Missing Fields', 'Name and mobile are required.');
      return;
    }
    if (!validatePhone(facMobile)) {
      Alert.alert('Invalid Mobile', 'Faculty mobile must be 10 digits.');
      return;
    }
    setSaving(true);
    try {
      // 1. Create user account
      const {data: userRow, error: userErr} = await db.users().insert({
        college_id: collegeId,
        role: 'faculty',
        mobile: `+91${facMobile}`,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select().single();

      if (userErr) throw new Error(userErr.message);

      // 2. Create faculty record
      const {error: facErr} = await db.faculty().insert({
        college_id: collegeId,
        user_id: userRow.id,
        name: facName.trim(),
        mobile: `+91${facMobile}`,
        email: facEmail.trim() || null,
        qualification: facQualification.trim() || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (facErr) throw new Error(facErr.message);

      Toast.show({type: 'success', text1: '✅ Faculty Created', text2: `${facName} can now log in with +91${facMobile}`});
      resetForm();
      setShowModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create faculty');
    } finally {
      setSaving(false);
    }
  };

  const renderStudentItem = ({item}: {item: any}) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, {backgroundColor: Colors.primarySurface}]}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.roll_number} · {item.stream} {item.year}st yr</Text>
          <Text style={styles.cardMobile}>📱 {item.mobile}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </View>
  );

  const renderFacultyItem = ({item}: {item: any}) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, {backgroundColor: Colors.secondarySurface || Colors.surfaceVariant}]}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.qualification || 'Faculty'}</Text>
          <Text style={styles.cardMobile}>📱 {item.mobile}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
        <Text style={styles.statusText}>{item.is_active ? 'active' : 'inactive'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.header}>
        <Text style={styles.headerTitle}>👥 User Management</Text>
        <Text style={styles.headerSub}>Create login accounts for students & faculty</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'students' && styles.tabActive]}
          onPress={() => setActiveTab('students')}>
          <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>
            🎓 Students ({students.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faculty' && styles.tabActive]}
          onPress={() => setActiveTab('faculty')}>
          <Text style={[styles.tabText, activeTab === 'faculty' && styles.tabTextActive]}>
            👨‍🏫 Faculty ({faculty.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          💡 Students and faculty log in using their <Text style={styles.infoBold}>registered mobile number + OTP</Text>. Exams are automatically scoped to your college.
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'students' ? students : faculty}
          keyExtractor={item => item.id}
          renderItem={activeTab === 'students' ? renderStudentItem : renderFacultyItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>{activeTab === 'students' ? '🎓' : '👨‍🏫'}</Text>
              <Text style={styles.emptyText}>No {activeTab} yet. Tap the button below to create one.</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity onPress={() => { resetForm(); setShowModal(true); }} style={styles.fab}>
        <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.fabGrad}>
          <Text style={styles.fabText}>+ Add {activeTab === 'students' ? 'Student' : 'Faculty'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}>
            <View style={styles.modalCard}>
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activeTab === 'students' ? '🎓 Create Student Account' : '👨‍🏫 Create Faculty Account'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {activeTab === 'students' ? (
                  <>
                    <Field label="Full Name *" value={stdName} onChange={setStdName} placeholder="e.g. Ravi Kumar" />
                    <Field label="Roll Number *" value={stdRoll} onChange={t => setStdRoll(t.toUpperCase())} placeholder="e.g. ROLL001" autoCapitalize="characters" />
                    <Field label="Mobile Number * (login credential)" value={stdMobile} onChange={setStdMobile} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
                    <Field label="Parent Mobile *" value={stdParentMobile} onChange={setStdParentMobile} placeholder="10-digit parent mobile" keyboardType="phone-pad" maxLength={10} />

                    <Text style={styles.fieldLabel}>Stream *</Text>
                    <View style={styles.streamRow}>
                      {STREAMS.map(s => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setStdStream(s)}
                          style={[styles.streamChip, stdStream === s && styles.streamChipActive]}>
                          <Text style={[styles.streamChipText, stdStream === s && styles.streamChipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>Year *</Text>
                    <View style={styles.yearRow}>
                      {YEARS.map(y => (
                        <TouchableOpacity
                          key={y}
                          onPress={() => setStdYear(y)}
                          style={[styles.yearChip, stdYear === y && styles.yearChipActive]}>
                          <Text style={[styles.yearChipText, stdYear === y && styles.yearChipTextActive]}>Year {y}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      onPress={handleCreateStudent}
                      disabled={saving}
                      style={styles.submitBtn}>
                      <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.submitGrad}>
                        {saving
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.submitText}>✅ Create Student Account</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Field label="Full Name *" value={facName} onChange={setFacName} placeholder="e.g. Dr. Anitha Rao" />
                    <Field label="Mobile Number * (login credential)" value={facMobile} onChange={setFacMobile} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
                    <Field label="Email (optional)" value={facEmail} onChange={setFacEmail} placeholder="faculty@college.edu" keyboardType="email-address" />
                    <Field label="Qualification (optional)" value={facQualification} onChange={setFacQualification} placeholder="e.g. M.Sc, B.Ed" />

                    <TouchableOpacity
                      onPress={handleCreateFaculty}
                      disabled={saving}
                      style={styles.submitBtn}>
                      <LinearGradient colors={['#0284C7', '#0EA5E9']} style={styles.submitGrad}>
                        {saving
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.submitText}>✅ Create Faculty Account</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>
                    🔑 The registered mobile number becomes their login ID. They will receive a real OTP on that number when logging in.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Reusable field component
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  autoCapitalize?: any;
}> = ({label, value, onChange, placeholder, keyboardType, maxLength, autoCapitalize}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType || 'default'}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize || 'words'}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.xl, paddingBottom: Spacing.lg},
  headerTitle: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white},
  headerSub: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4},
  tabs: {flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderColor: Colors.border},
  tab: {flex: 1, paddingVertical: Spacing.sm + 4, alignItems: 'center'},
  tabActive: {borderBottomWidth: 3, borderBottomColor: Colors.primary},
  tabText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textMuted},
  tabTextActive: {fontFamily: FontFamily.bold, color: Colors.primary},
  infoBanner: {backgroundColor: Colors.primarySurface, borderLeftWidth: 4, borderLeftColor: Colors.primary, margin: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.sm},
  infoText: {fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18},
  infoBold: {fontFamily: FontFamily.bold, color: Colors.primary},
  list: {padding: Spacing.md, paddingBottom: 100},
  card: {backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadow.sm},
  cardLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  avatar: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm},
  avatarText: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.primary},
  cardInfo: {flex: 1},
  cardName: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary},
  cardSub: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2},
  cardMobile: {fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full},
  statusActive: {backgroundColor: Colors.successSurface},
  statusInactive: {backgroundColor: Colors.dangerSurface},
  statusText: {fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.textSecondary},
  loadingBox: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyBox: {alignItems: 'center', paddingTop: 60},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32},
  fab: {position: 'absolute', bottom: 24, right: 20, borderRadius: BorderRadius.full, ...Shadow.lg, overflow: 'hidden'},
  fabGrad: {paddingHorizontal: Spacing.xl, paddingVertical: 14},
  fabText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white},
  modalOverlay: {flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end'},
  modalWrapper: {justifyContent: 'flex-end'},
  modalCard: {backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], padding: Spacing.xl, maxHeight: '90%', ...Shadow.lg},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg},
  modalTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, flex: 1},
  modalClose: {fontSize: 22, color: Colors.textSecondary, padding: 4},
  fieldGroup: {marginBottom: Spacing.md},
  fieldLabel: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, marginBottom: 6},
  fieldInput: {height: 48, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary, backgroundColor: Colors.surfaceVariant},
  streamRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md},
  streamChip: {paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface},
  streamChipActive: {borderColor: Colors.primary, backgroundColor: Colors.primarySurface},
  streamChipText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  streamChipTextActive: {fontFamily: FontFamily.bold, color: Colors.primary},
  yearRow: {flexDirection: 'row', gap: 10, marginBottom: Spacing.md},
  yearChip: {flex: 1, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface},
  yearChipActive: {borderColor: Colors.primary, backgroundColor: Colors.primarySurface},
  yearChipText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  yearChipTextActive: {fontFamily: FontFamily.bold, color: Colors.primary},
  submitBtn: {borderRadius: BorderRadius.xl, overflow: 'hidden', marginTop: Spacing.base, marginBottom: Spacing.md},
  submitGrad: {height: 52, alignItems: 'center', justifyContent: 'center'},
  submitText: {fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.white},
  noteBox: {backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.xl},
  noteText: {fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18},
});

export default UserManagement;
