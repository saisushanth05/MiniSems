// Mini Sems — Faculty Management Screen (Admin)

import React, {useState, useCallback, useEffect} from 'react';
import {
  FlatList, SafeAreaView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {StatusBadge} from '@components/common/Badges';
import {SkeletonStudentRow} from '@components/common/SkeletonLoader';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {AdminStackParamList} from '@apptypes/navigation.types';
import type {Faculty} from '@apptypes/database.types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminTabs'>;

const FacultyRow: React.FC<{
  faculty: Faculty;
  onEdit: () => void;
  onRemove: () => void;
}> = ({faculty, onEdit, onRemove}) => {
  const {t} = useTranslation();
  
  // Format subjects list
  const subjectsText = faculty.assigned_subjects?.map(s => s.name).join(', ') || 'None';
  
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.avatar}>
        <Text style={rowStyles.avatarText}>{faculty.name.charAt(0)}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{faculty.name}</Text>
        <Text style={rowStyles.meta}>
          {faculty.qualification || 'No Degree'} · {subjectsText}
        </Text>
        <Text style={rowStyles.mobile}>{faculty.mobile}</Text>
      </View>
      <View style={rowStyles.actions}>
        <StatusBadge
          label={faculty.is_active ? 'active' : 'inactive'}
          color={faculty.is_active ? Colors.success : Colors.danger}
        />
        <TouchableOpacity onPress={onEdit} style={rowStyles.editBtn}>
          <Text style={rowStyles.editText}>{t('common.edit')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FacultyManagement: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [filtered, setFiltered] = useState<Faculty[]>([]);
  const [search, setSearch] = useState('');

  const fetchFaculty = useCallback(async () => {
    if (!user?.collegeId) return;
    try {
      // Fetch faculty list from supabase
      const {data} = await db.faculty()
        .select('*')
        .eq('college_id', user.collegeId)
        .order('name');

      const list = (data || []) as Faculty[];
      setFaculties(list);
      setFiltered(list);
    } catch (error) {
      console.error('Fetch faculty error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.collegeId]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    const lower = text.toLowerCase();
    setFiltered(
      faculties.filter(
        f =>
          f.name.toLowerCase().includes(lower) ||
          f.mobile.includes(lower) ||
          (f.qualification && f.qualification.toLowerCase().includes(lower))
      )
    );
  }, [faculties]);

  const renderItem = ({item}: {item: Faculty}) => (
    <FacultyRow
      faculty={item}
      onEdit={() => navigation.navigate('AddFaculty', {facultyId: item.id})}
      onRemove={() => {}}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>{t('faculty.title')}</Text>
        <Text style={styles.subtitle}>{t('faculty.totalFaculty', {count: faculties.length}) || `${faculties.length} members`}</Text>
      </LinearGradient>

      {/* Search & Action Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchText}
            value={search}
            onChangeText={handleSearch}
            placeholder={t('common.search') + '...'}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddFaculty', {})}
          style={styles.addBtn}>
          <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.addBtnGradient}>
            <Text style={styles.addBtnText}>+ {t('faculty.addFaculty')}</Text>
          </LinearGradient>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchFaculty();}} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👨‍🏫</Text>
              <Text style={styles.emptyText}>{t('faculty.noFaculty')}</Text>
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
  list: {paddingBottom: 40},
  separator: {height: 1, backgroundColor: Colors.borderLight, marginLeft: 72},
  empty: {alignItems: 'center', padding: 40},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textTertiary},
});

const rowStyles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Colors.surface},
  avatar: {width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.secondarySurface, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  avatarText: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.secondary},
  info: {flex: 1},
  name: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary},
  meta: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1},
  mobile: {fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 1},
  actions: {alignItems: 'flex-end', gap: 6},
  editBtn: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.secondaryBorder},
  editText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.secondaryDark},
});

export default FacultyManagement;
