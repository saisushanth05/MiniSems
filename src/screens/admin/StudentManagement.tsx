// Mini Sems — Student Management Screen (Admin)

import React, {useState, useCallback, useEffect} from 'react';
import {
  FlatList, SafeAreaView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, RefreshControl, Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {StatusBadge} from '@components/common/Badges';
import {Button} from '@components/common/Button';
import {SkeletonStudentRow} from '@components/common/SkeletonLoader';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {AdminStackParamList} from '@apptypes/navigation.types';
import type {Student} from '@apptypes/database.types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminTabs'>;

const StudentRow: React.FC<{
  student: Student;
  onEdit: () => void;
  onDeactivate: () => void;
}> = ({student, onEdit, onDeactivate}) => (
  <View style={rowStyles.row}>
    <View style={rowStyles.avatar}>
      <Text style={rowStyles.avatarText}>{student.name.charAt(0)}</Text>
    </View>
    <View style={rowStyles.info}>
      <Text style={rowStyles.name}>{student.name}</Text>
      <Text style={rowStyles.meta}>
        {student.roll_number} · {student.section?.name || '—'}
      </Text>
      <Text style={rowStyles.mobile}>{student.mobile}</Text>
    </View>
    <View style={rowStyles.actions}>
      <StatusBadge
        label={student.status}
        color={student.status === 'active' ? Colors.success : Colors.danger}
      />
      <TouchableOpacity onPress={onEdit} style={rowStyles.editBtn}>
        <Text style={rowStyles.editText}>Edit</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const StudentManagement: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchStudents = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      const {data, count} = await db.students()
        .select('*, section:sections(name)', {count: 'exact'})
        .eq('college_id', user.collegeId)
        .order('name');

      const list = (data || []) as Student[];
      setStudents(list);
      setFiltered(list);
      setTotal(count || 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId]);

  useEffect(() => {fetchStudents();}, [fetchStudents]);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    const lower = text.toLowerCase();
    setFiltered(
      students.filter(
        s =>
          s.name.toLowerCase().includes(lower) ||
          s.roll_number.toLowerCase().includes(lower),
      ),
    );
  }, [students]);

  const renderItem = ({item}: {item: Student}) => (
    <StudentRow
      student={item}
      onEdit={() => navigation.navigate('AddStudent', {studentId: item.id})}
      onDeactivate={() => {}}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>{t('students.title')}</Text>
        <Text style={styles.subtitle}>{t('students.totalStudents', {count: total})}</Text>
      </LinearGradient>

      {/* Search & Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchText}
            value={search}
            onChangeText={handleSearch}
            placeholder={t('students.searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddStudent', {})}
          style={styles.addBtn}>
          <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.addBtnGradient}>
            <Text style={styles.addBtnText}>+ {t('students.addStudent')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bulk Upload Bar */}
      <View style={styles.bulkBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('BulkUpload')}
          style={styles.bulkBtn}>
          <Text style={styles.bulkBtnText}>📤 {t('students.bulkUpload')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkBtn}>
          <Text style={styles.bulkBtnText}>⬇ {t('students.downloadTemplate')}</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={{padding: 16}}>
          {Array(6).fill(0).map((_, i) => <SkeletonStudentRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchStudents();}} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>{t('students.noStudents')}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, paddingBottom: Spacing.xl},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white},
  subtitle: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2},
  searchBar: {flexDirection: 'row', gap: 8, padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, marginTop: -Spacing.md},
  searchInput: {flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44},
  searchIcon: {fontSize: 16, marginRight: 6},
  searchText: {flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  addBtn: {borderRadius: BorderRadius.lg, overflow: 'hidden'},
  addBtnGradient: {height: 44, paddingHorizontal: Spacing.base, alignItems: 'center', justifyContent: 'center'},
  addBtnText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.white},
  bulkBar: {flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base, paddingVertical: 8, backgroundColor: Colors.surfaceVariant},
  bulkBtn: {flex: 1, height: 36, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center'},
  bulkBtnText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.primary},
  list: {paddingBottom: 40},
  separator: {height: 1, backgroundColor: Colors.borderLight, marginLeft: 72},
  empty: {alignItems: 'center', padding: 40},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
});

const rowStyles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Colors.surface},
  avatar: {width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  avatarText: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.primary},
  info: {flex: 1},
  name: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  meta: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1},
  mobile: {fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 1},
  actions: {alignItems: 'flex-end', gap: 6},
  editBtn: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm, backgroundColor: Colors.primarySurface, borderWidth: 1, borderColor: Colors.primaryBorder},
  editText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.primary},
});

export default StudentManagement;
